import { kobo } from '@golden-spoon/shared'
import { badRequest } from '../errors.ts'
import { quoteOrder, type Fulfilment } from '../domain/pricing.ts'
import { findZoneById } from '../repo/branches.ts'
import { loadPackagingFeeKobo, priceLines, type PriceableLineInput } from './pricing-lines.ts'

export type CartQuoteLineInput = PriceableLineInput

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
  const { domainLines, lineMeta } = await priceLines(input.lines)
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
