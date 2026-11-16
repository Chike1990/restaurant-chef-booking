/**
 * The loyalty ledger is append-only, because a stamp balance
 * is always a SUM over entries, never a stored counter. Expiry is a property
 * of how the sum is read, not a mutation of any row — see `stampBalance`.
 */
export type LoyaltyReason = 'earn' | 'revoke' | 'redeem' | 'expire' | 'adjust'

export type LedgerEntry = {
  readonly delta: number
  readonly reason: LoyaltyReason
  readonly createdAt: Date
  readonly expiresAt: Date | null
}

export const STAMPS_PER_REWARD = 5
export const REWARD_VALID_DAYS = 14

/** Sum of every entry that hasn't expired as of `now`. Never negative — a
 *  cancelled order's `revoke` row can't drive a customer's balance below
 *  zero, it can only cancel out stamps they'd already earned. */
export function stampBalance(entries: readonly LedgerEntry[], now: Date): number {
  const total = entries
    .filter((entry) => entry.expiresAt === null || entry.expiresAt > now)
    .reduce((sum, entry) => sum + entry.delta, 0)
  return Math.max(0, total)
}

/** One stamp per qualifying meal unit. The caller decides what counts
 *  (drinks and bakery don't) and passes the already-filtered count. */
export function stampsEarnedFor(mealUnits: number): number {
  if (!Number.isInteger(mealUnits) || mealUnits < 0) {
    throw new RangeError(`mealUnits must be a non-negative whole number, got ${mealUnits}`)
  }
  return mealUnits
}

export function rewardsAvailable(entries: readonly LedgerEntry[], now: Date): number {
  return Math.floor(stampBalance(entries, now) / STAMPS_PER_REWARD)
}
