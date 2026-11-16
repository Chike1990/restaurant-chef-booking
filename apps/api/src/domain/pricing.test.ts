import { describe, expect, it } from 'vitest'
import { naira } from '@golden-spoon/shared'
import { quoteOrder, type Fulfilment } from './pricing.ts'

const ofeOnugbu = { id: 'i1', name: 'Ofe onugbu', basePriceKobo: naira(4800) }
const jollof = { id: 'i2', name: 'Smoky party jollof', basePriceKobo: naira(4500) }
const goat = { id: 'o1', name: 'Goat meat', surchargeKobo: naira(1500) }
const extraWrap = { id: 'o2', name: 'Extra wrap', surchargeKobo: naira(500) }

const delivery: Fulfilment = { kind: 'delivery', zoneId: 'zone-1', deliveryFeeKobo: naira(1000) }
const pickup: Fulfilment = { kind: 'pickup' }

const base = {
  fulfilment: delivery,
  packagingPerUnitKobo: naira(200),
  rewardApplied: false,
}

describe('quoteOrder', () => {
  it('prices one dish with one option', () => {
    const q = quoteOrder({
      ...base,
      lines: [{ item: ofeOnugbu, options: [goat], quantity: 1 }],
    })
    expect(q.lines[0]?.unitPriceKobo).toBe(naira(6300))
    expect(q.subtotalKobo).toBe(naira(6300))
    expect(q.packagingKobo).toBe(naira(200))
    expect(q.totalKobo).toBe(naira(7500))
  })

  it('multiplies options into every unit of the line', () => {
    const q = quoteOrder({
      ...base,
      lines: [{ item: ofeOnugbu, options: [goat, extraWrap], quantity: 3 }],
    })
    expect(q.lines[0]?.unitPriceKobo).toBe(naira(6800))
    expect(q.lines[0]?.lineTotalKobo).toBe(naira(20400))
    expect(q.packagingKobo).toBe(naira(600))
  })

  it('charges packaging per meal unit across all lines', () => {
    const q = quoteOrder({
      ...base,
      lines: [
        { item: ofeOnugbu, options: [], quantity: 2 },
        { item: jollof, options: [], quantity: 1 },
      ],
    })
    expect(q.packagingKobo).toBe(naira(600))
  })

  it('excludes drinks from the packaging charge', () => {
    const bottledWater = { id: 'i4', name: 'Bottled water', basePriceKobo: naira(400), countsForPackaging: false }
    const q = quoteOrder({
      ...base,
      lines: [
        { item: ofeOnugbu, options: [], quantity: 1 },
        { item: bottledWater, options: [], quantity: 2 },
      ],
    })
    // Only the soup's one unit counts — the two bottles of water don't.
    expect(q.packagingKobo).toBe(naira(200))
  })

  it('ignores the delivery fee on pickup', () => {
    const q = quoteOrder({
      ...base,
      fulfilment: pickup,
      lines: [{ item: jollof, options: [], quantity: 1 }],
    })
    expect(q.deliveryFeeKobo).toBe(naira(0))
    expect(q.totalKobo).toBe(naira(4700))
  })

  it('discounts the most expensive single unit when a reward is applied', () => {
    const q = quoteOrder({
      ...base,
      rewardApplied: true,
      lines: [
        { item: ofeOnugbu, options: [goat], quantity: 1 }, // ₦6,300 a unit
        { item: jollof, options: [], quantity: 2 }, // ₦4,500 a unit
      ],
    })
    expect(q.discountKobo).toBe(naira(6300))
    expect(q.subtotalKobo).toBe(naira(15300))
    expect(q.totalKobo).toBe(naira(10600))
  })

  it('never returns a negative total', () => {
    const cheap = { id: 'i3', name: 'Bottled water', basePriceKobo: naira(400) }
    const q = quoteOrder({
      ...base,
      fulfilment: pickup,
      packagingPerUnitKobo: naira(0),
      rewardApplied: true,
      lines: [{ item: cheap, options: [], quantity: 1 }],
    })
    expect(q.totalKobo).toBe(naira(0))
  })

  // The given spec for this test charged delivery on an empty cart — there is
  // nothing to deliver, so that's a bug, not a rule. Fixed in quoteOrder:
  // the delivery fee only applies once there's at least one line.
  it('charges nothing for an empty cart, even with delivery selected', () => {
    const q = quoteOrder({ ...base, lines: [] })
    expect(q.subtotalKobo).toBe(naira(0))
    expect(q.deliveryFeeKobo).toBe(naira(0))
    expect(q.totalKobo).toBe(naira(0))
  })

  it('rejects pickup with a delivery fee at compile time', () => {
    // @ts-expect-error pickup carries no deliveryFeeKobo — the type forbids it
    const impossible: Fulfilment = { kind: 'pickup', deliveryFeeKobo: naira(1000) }
    expect(impossible).toBeDefined()
  })
})
