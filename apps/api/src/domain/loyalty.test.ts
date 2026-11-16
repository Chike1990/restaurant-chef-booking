import { describe, expect, it } from 'vitest'
import { rewardsAvailable, stampBalance, stampsEarnedFor, type LedgerEntry } from './loyalty.ts'

const day = (offset: number): Date => {
  const d = new Date('2026-01-01T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + offset)
  return d
}
const NOW = day(0)

const entry = (delta: number, reason: LedgerEntry['reason'], expiresAt: Date | null = null): LedgerEntry => ({
  delta,
  reason,
  createdAt: NOW,
  expiresAt,
})

describe('stampBalance', () => {
  it('sums a simple set of earn entries', () => {
    expect(stampBalance([entry(5, 'earn'), entry(3, 'earn')], NOW)).toBe(8)
  })

  it('the ordering trap: earn 5, redeem 5, earn 3 -> balance 3', () => {
    const entries = [entry(5, 'earn'), entry(-5, 'redeem'), entry(3, 'earn')]
    expect(stampBalance(entries, NOW)).toBe(3)
    expect(rewardsAvailable(entries, NOW)).toBe(0)
  })

  it('the expiry trap: an earn entry past its expiry does not count', () => {
    const entries = [entry(5, 'earn', day(-1))]
    expect(stampBalance(entries, NOW)).toBe(0)
  })

  it('an entry expiring exactly now still counts (expiry is exclusive of the instant)', () => {
    expect(stampBalance([entry(5, 'earn', NOW)], NOW)).toBe(0)
    expect(stampBalance([entry(5, 'earn', day(1))], NOW)).toBe(5)
  })

  it('never goes below zero even when revocations exceed earnings', () => {
    const entries = [entry(5, 'earn'), entry(-5, 'revoke'), entry(-3, 'adjust')]
    expect(stampBalance(entries, NOW)).toBe(0)
  })

  it('a revoke never deletes the earn row it cancels — both remain in the ledger', () => {
    // Modelling the rule itself: a cancelled order writes a negative row
    // rather than removing the original earn.
    const earn = entry(5, 'earn')
    const revoke = entry(-5, 'revoke')
    const entries = [earn, revoke]
    expect(entries).toContain(earn)
    expect(stampBalance(entries, NOW)).toBe(0)
  })

  it('an empty ledger has a zero balance', () => {
    expect(stampBalance([], NOW)).toBe(0)
  })
})

describe('stampsEarnedFor', () => {
  it('returns one stamp per qualifying meal unit', () => {
    expect(stampsEarnedFor(3)).toBe(3)
  })

  it('rejects a negative count', () => {
    expect(() => stampsEarnedFor(-1)).toThrow(RangeError)
  })

  it('rejects a non-integer count', () => {
    expect(() => stampsEarnedFor(1.5)).toThrow(RangeError)
  })
})

describe('rewardsAvailable', () => {
  it('is zero below the threshold', () => {
    expect(rewardsAvailable([entry(4, 'earn')], NOW)).toBe(0)
  })

  it('is one exactly at the threshold', () => {
    expect(rewardsAvailable([entry(5, 'earn')], NOW)).toBe(1)
  })

  it('floors rather than rounds between thresholds', () => {
    expect(rewardsAvailable([entry(9, 'earn')], NOW)).toBe(1)
  })
})
