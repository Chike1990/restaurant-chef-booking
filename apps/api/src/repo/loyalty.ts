import { and, asc, eq, gt, isNull } from 'drizzle-orm'
import { db } from '../db.ts'
import type { DbTransaction } from '../db.ts'
import { rewards } from '../schema/index.ts'

/** The oldest unredeemed, unexpired reward for this user, if any. A reward
 *  row with no expiresAt never matches `gt` — that's a data bug, not
 *  something to treat as "never expires". */
export function findAvailableRewardForUser(userId: string, now: Date) {
  return db.query.rewards.findFirst({
    where: and(eq(rewards.userId, userId), isNull(rewards.redeemedAt), gt(rewards.expiresAt, now)),
    orderBy: [asc(rewards.issuedAt)],
  })
}

/** Guarded by `redeemedAt is null` so a reward already redeemed concurrently
 *  (by a racing request) updates zero rows instead of double-redeeming. */
export async function redeemReward(tx: DbTransaction, rewardId: string, orderId: string, redeemedAt: Date) {
  const result = await tx
    .update(rewards)
    .set({ redeemedAt, redeemedOrderId: orderId })
    .where(and(eq(rewards.id, rewardId), isNull(rewards.redeemedAt)))
  return (result.rowCount ?? 0) > 0
}
