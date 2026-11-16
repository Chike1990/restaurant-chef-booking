import { kobo } from '@golden-spoon/shared'
import { badRequest, unprocessable } from '../errors.ts'
import { validateSelection, type OptionGroupSpec } from '../domain/options.ts'
import { quoteOrder, type Fulfilment, type PricedItem, type PricedOption, type QuoteLine } from '../domain/pricing.ts'
import { findZoneById } from '../repo/branches.ts'
import { findMenuItemsByIds } from '../repo/cart.ts'
import { findSettingValue } from '../repo/settings.ts'

const PACKAGING_FEE_SETTING_KEY = 'packaging_fee_kobo'

export type CartQuoteLineInput = {
  menuItemId: string
  optionIds: string[]
  quantity: number
}

/** The client sends item ids, option ids and quantities — never a price.
 *  Rule 2: if a request body contains an amount, the server ignores it. */
export type CartQuoteInput =
  | { fulfilment: 'pickup'; lines: CartQuoteLineInput[] }
  | { fulfilment: 'delivery'; zoneId: string; lines: CartQuoteLineInput[] }

export type CartQuoteLineDTO = {
  menuItemId: string
  name: string
  quantity: number
  unitPriceKobo: number
  lineTotalKobo: number
  options: Array<{ id: string; name: string; surchargeKobo: number }>
}

export type CartQuoteDTO = {
  lines: CartQuoteLineDTO[]
  subtotalKobo: number
  packagingKobo: number
  deliveryFeeKobo: number
  discountKobo: number
  totalKobo: number
}

export async function quoteCart(input: CartQuoteInput): Promise<CartQuoteDTO> {
  const menuItemIds = [...new Set(input.lines.map((line) => line.menuItemId))]
  const menuItemRows = await findMenuItemsByIds(menuItemIds)
  const menuItemById = new Map(menuItemRows.map((row) => [row.id, row]))

  const domainLines: QuoteLine[] = []
  const lineMeta: Array<{ menuItemId: string; name: string; options: CartQuoteLineDTO['options'] }> = []

  for (const line of input.lines) {
    const menuItem = menuItemById.get(line.menuItemId)
    if (!menuItem) throw badRequest(`unknown menu item "${line.menuItemId}"`)

    const groups: OptionGroupSpec[] = menuItem.optionGroups.map((group) => ({
      id: group.id,
      name: group.name,
      isRequired: group.isRequired,
      minSelect: group.minSelections,
      maxSelect: group.maxSelections,
      optionIds: group.options.map((option) => option.id),
    }))

    try {
      validateSelection(groups, line.optionIds)
    } catch (error) {
      if (error instanceof RangeError) throw unprocessable(error.message)
      throw error
    }

    const optionById = new Map(menuItem.optionGroups.flatMap((group) => group.options.map((option) => [option.id, option])))
    const selectedOptions: PricedOption[] = line.optionIds.map((optionId) => {
      const option = optionById.get(optionId)
      // validateSelection already confirmed every id belongs to this item.
      if (!option) throw new Error(`invariant: option "${optionId}" vanished after validation`)
      return { id: option.id, name: option.name, surchargeKobo: kobo(option.surchargeKobo) }
    })

    const pricedItem: PricedItem = {
      id: menuItem.id,
      name: menuItem.name,
      basePriceKobo: kobo(menuItem.basePriceKobo),
      countsForPackaging: menuItem.countsForPackaging,
    }

    domainLines.push({ item: pricedItem, options: selectedOptions, quantity: line.quantity })
    lineMeta.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      options: selectedOptions.map((option) => ({ id: option.id, name: option.name, surchargeKobo: option.surchargeKobo })),
    })
  }

  const fulfilment = await resolveFulfilment(input)
  const packagingPerUnitKobo = await loadPackagingFeeKobo()

  const quote = quoteOrder({ lines: domainLines, fulfilment, packagingPerUnitKobo, rewardApplied: false })

  return {
    // domainLines, lineMeta and quote.lines all come from mapping over
    // input.lines in the same order, so they're the same length by
    // construction.
    lines: quote.lines.map((quotedLine, index) => {
      const meta = lineMeta[index]
      const line = input.lines[index]
      if (!meta || !line) throw new Error('invariant: cart line metadata missing')
      return {
        menuItemId: meta.menuItemId,
        name: meta.name,
        quantity: line.quantity,
        unitPriceKobo: quotedLine.unitPriceKobo,
        lineTotalKobo: quotedLine.lineTotalKobo,
        options: meta.options,
      }
    }),
    subtotalKobo: quote.subtotalKobo,
    packagingKobo: quote.packagingKobo,
    deliveryFeeKobo: quote.deliveryFeeKobo,
    discountKobo: quote.discountKobo,
    totalKobo: quote.totalKobo,
  }
}

async function resolveFulfilment(input: CartQuoteInput): Promise<Fulfilment> {
  if (input.fulfilment === 'pickup') return { kind: 'pickup' }

  const zone = await findZoneById(input.zoneId)
  if (!zone) throw badRequest(`unknown delivery zone "${input.zoneId}"`)
  if (!zone.isActive) throw badRequest(`delivery zone "${zone.name}" is not currently accepting orders`)

  return { kind: 'delivery', zoneId: zone.id, deliveryFeeKobo: kobo(zone.feeKobo) }
}

async function loadPackagingFeeKobo() {
  const value = await findSettingValue(PACKAGING_FEE_SETTING_KEY)
  if (value === null) throw new Error(`missing required setting "${PACKAGING_FEE_SETTING_KEY}"`)
  return kobo(Number.parseInt(value, 10))
}
