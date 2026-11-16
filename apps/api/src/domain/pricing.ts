import { addKobo, multiplyKobo, subtractKobo, ZERO_KOBO, type Kobo } from '@golden-spoon/shared'

export type PricedOption = {
  readonly id: string
  readonly name: string
  readonly surchargeKobo: Kobo
}

export type PricedItem = {
  readonly id: string
  readonly name: string
  readonly basePriceKobo: Kobo
  /** Packaging is charged per meal unit — a drink doesn't need its own
   *  container, so it's excluded. Defaults to true. */
  readonly countsForPackaging?: boolean
}

export type QuoteLine = {
  readonly item: PricedItem
  readonly options: readonly PricedOption[]
  readonly quantity: number
}

/** Pickup carries no delivery fee by construction — "pickup with a delivery
 *  fee" doesn't compile, so nothing downstream has to remember to zero it. */
export type Fulfilment =
  | { readonly kind: 'pickup' }
  | { readonly kind: 'delivery'; readonly zoneId: string; readonly deliveryFeeKobo: Kobo }

export type QuoteInput = {
  readonly lines: readonly QuoteLine[]
  readonly fulfilment: Fulfilment
  readonly packagingPerUnitKobo: Kobo
  readonly rewardApplied: boolean
}

export type QuotedLine = {
  readonly unitPriceKobo: Kobo
  readonly lineTotalKobo: Kobo
}

export type Quote = {
  readonly lines: readonly QuotedLine[]
  readonly subtotalKobo: Kobo
  readonly packagingKobo: Kobo
  readonly deliveryFeeKobo: Kobo
  readonly discountKobo: Kobo
  readonly totalKobo: Kobo
}

export function quoteOrder(input: QuoteInput): Quote {
  const lines: QuotedLine[] = input.lines.map((line) => {
    const unitPriceKobo = addKobo(line.item.basePriceKobo, ...line.options.map((option) => option.surchargeKobo))
    return { unitPriceKobo, lineTotalKobo: multiplyKobo(unitPriceKobo, line.quantity) }
  })

  const subtotalKobo = addKobo(...lines.map((line) => line.lineTotalKobo))

  const packagingUnits = input.lines.reduce(
    (sum, line) => sum + (line.item.countsForPackaging === false ? 0 : line.quantity),
    0,
  )
  const packagingKobo = multiplyKobo(input.packagingPerUnitKobo, packagingUnits)

  // Nothing to deliver, so an empty cart is never charged a delivery fee,
  // regardless of which fulfilment was selected.
  const deliveryFeeKobo =
    input.lines.length > 0 && input.fulfilment.kind === 'delivery' ? input.fulfilment.deliveryFeeKobo : ZERO_KOBO

  const mostExpensiveUnitKobo = lines.reduce<Kobo>(
    (max, line) => (line.unitPriceKobo > max ? line.unitPriceKobo : max),
    ZERO_KOBO,
  )
  const discountKobo = input.rewardApplied ? mostExpensiveUnitKobo : ZERO_KOBO

  const totalKobo = subtractKobo(addKobo(subtotalKobo, packagingKobo, deliveryFeeKobo), discountKobo)

  return { lines, subtotalKobo, packagingKobo, deliveryFeeKobo, discountKobo, totalKobo }
}
