import { kobo } from '@golden-spoon/shared'
import { badRequest, unprocessable } from '../errors.ts'
import { validateSelection, type OptionGroupSpec } from '../domain/options.ts'
import type { PricedItem, PricedOption, QuoteLine } from '../domain/pricing.ts'
import { findMenuItemsByIds } from '../repo/cart.ts'
import { findSettingValue } from '../repo/settings.ts'

const PACKAGING_FEE_SETTING_KEY = 'packaging_fee_kobo'

export type PriceableLineInput = {
  menuItemId: string
  optionIds: string[]
  quantity: number
}

export type PricedLineMeta = {
  menuItemId: string
  name: string
  options: Array<{ id: string; name: string; surchargeKobo: number }>
}

export type PricedLines = {
  domainLines: QuoteLine[]
  lineMeta: PricedLineMeta[]
}

/**
 * Validates each line's option selection and prices it from the database —
 * shared by the cart quote preview and real order creation. `requireAvailable`
 * is off for the preview (browsing an unavailable dish is fine) and on for
 * order creation, where it rejects rather than silently pricing something
 * that can't actually be made.
 */
export async function priceLines(
  lines: PriceableLineInput[],
  opts: { requireAvailable?: boolean } = {},
): Promise<PricedLines> {
  const menuItemIds = [...new Set(lines.map((line) => line.menuItemId))]
  const menuItemRows = await findMenuItemsByIds(menuItemIds)
  const menuItemById = new Map(menuItemRows.map((row) => [row.id, row]))

  const domainLines: QuoteLine[] = []
  const lineMeta: PricedLineMeta[] = []

  for (const line of lines) {
    const menuItem = menuItemById.get(line.menuItemId)
    if (!menuItem) throw badRequest(`unknown menu item "${line.menuItemId}"`)
    if (opts.requireAvailable && !menuItem.isAvailable) {
      throw badRequest(`"${menuItem.name}" is not currently available`)
    }

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
      if (opts.requireAvailable && !option.isAvailable) {
        throw badRequest(`"${option.name}" is not currently available`)
      }
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

  return { domainLines, lineMeta }
}

export async function loadPackagingFeeKobo() {
  const value = await findSettingValue(PACKAGING_FEE_SETTING_KEY)
  if (value === null) throw new Error(`missing required setting "${PACKAGING_FEE_SETTING_KEY}"`)
  return kobo(Number.parseInt(value, 10))
}
