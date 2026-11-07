import { describe, expect, it } from 'vitest'
import { addKobo, formatNaira, kobo, multiplyKobo, naira, subtractKobo } from './money.ts'

describe('naira', () => {
  it('converts whole naira to kobo', () => {
    expect(naira(4800)).toBe(480_000)
  })

  it('converts amounts with kobo', () => {
    expect(naira(1500.5)).toBe(150_050)
  })

  it('rejects amounts finer than a kobo', () => {
    expect(() => naira(10.001)).toThrow(/finer than one kobo/)
  })

  it('rejects negatives', () => {
    expect(() => naira(-1)).toThrow(/must not be negative/)
  })
})

describe('kobo', () => {
  it('rejects fractional kobo', () => {
    expect(() => kobo(10.5)).toThrow(/whole number of kobo/)
  })
})

describe('arithmetic', () => {
  it('adds a realistic order: ofe onugbu + goat meat + extra wrap + Ifite delivery + packaging', () => {
    const total = addKobo(naira(4800), naira(1500), naira(500), naira(1000), naira(200))
    expect(total).toBe(naira(8000))
    expect(formatNaira(total)).toBe('₦8,000')
  })

  it('does not drift the way floats do', () => {
    // 0.1 + 0.2 !== 0.3 in float, but 10 + 20 === 30 in kobo.
    expect(addKobo(naira(0.1), naira(0.2))).toBe(naira(0.3))
  })

  it('multiplies by quantity', () => {
    expect(multiplyKobo(naira(1500), 3)).toBe(naira(4500))
  })

  it('rejects fractional quantities', () => {
    expect(() => multiplyKobo(naira(1500), 1.5)).toThrow(/non-negative whole number/)
  })

  it('refuses to produce a negative difference', () => {
    expect(() => subtractKobo(naira(100), naira(500))).toThrow(/must not be negative/)
  })
})

describe('formatNaira', () => {
  it('groups thousands and omits kobo when zero', () => {
    expect(formatNaira(naira(18500))).toBe('₦18,500')
  })

  it('shows kobo when present, padded', () => {
    expect(formatNaira(naira(1500.5))).toBe('₦1,500.50')
  })

  it('formats zero', () => {
    expect(formatNaira(naira(0))).toBe('₦0')
  })
})
