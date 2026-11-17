import { db } from '../db.ts'
import { REWARD_VALID_DAYS, STAMPS_PER_REWARD, stampBalance } from '../domain/loyalty.ts'
import { badRequest } from '../errors.ts'
import {
  findAvailableRewardsForUser,
  findLedgerEntriesForUser,
  insertLedgerEntry,
  insertReward,
} from '../repo/loyalty.ts'

export type RewardDTO = {
  id: string
  issuedAt: string
  expiresAt: string | null
}

export type LoyaltySummaryDTO = {
  balance: number
  stampsToNextReward: number
  rewardsAvailable: RewardDTO[]
}

function toRewardDTO(reward: { id: string; issuedAt: Date; expiresAt: Date | null }): RewardDTO {
  return {
    id: reward.id,
    issuedAt: reward.issuedAt.toISOString(),
    expiresAt: reward.expiresAt?.toISOString() ?? null,
  }
}

export async function getLoyaltySummary(userId: string): Promise<LoyaltySummaryDTO> {
  const now = new Date()
  const entries = await findLedgerEntriesForUser(userId)
  const balance = stampBalance(entries, now)
  const rewards = await findAvailableRewardsForUser(userId, now)

  return {
    balance,
    stampsToNextReward: (STAMPS_PER_REWARD - (balance % STAMPS_PER_REWARD)) % STAMPS_PER_REWARD,
    rewardsAvailable: rewards.map(toRewardDTO),
  }
}

/**
 * Converts STAMPS_PER_REWARD stamps into one issued reward, ready to be
 * applied at checkout. Known gap: reading the balance and writing the
 * -STAMPS_PER_REWARD ledger entry aren't atomic against a concurrent redeem
 * by the same user — two simultaneous calls could both read enough balance
 * and both issue a reward. Low-stakes for a single customer racing their own
 * requests, so left as a Day 1 limitation rather than adding a per-user lock.
 */
export async function redeemStampsForReward(userId: string): Promise<RewardDTO> {
  const now = new Date()
  const entries = await findLedgerEntriesForUser(userId)
  const balance = stampBalance(entries, now)

  if (balance < STAMPS_PER_REWARD) {
    throw badRequest(`need ${STAMPS_PER_REWARD} stamps to redeem, have ${balance}`)
  }

  const reward = await db.transaction(async (tx) => {
    await insertLedgerEntry(tx, { userId, delta: -STAMPS_PER_REWARD, reason: 'redeem' })
    return insertReward(tx, {
      userId,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + REWARD_VALID_DAYS * 24 * 60 * 60 * 1000),
    })
  })

  return toRewardDTO(reward)
}
