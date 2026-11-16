import { relations } from 'drizzle-orm'
import { index, integer, pgEnum, pgTable } from 'drizzle-orm/pg-core'
import { users } from './identity.ts'
import { orders } from './orders.ts'
import { createdAt, id, idRef, optionalIdRef, tstz } from './_shared.ts'

export const loyaltyReason = pgEnum('loyalty_reason', [
  'earn',
  'revoke',
  'redeem',
  'expire',
  'adjust',
])
export type LoyaltyReason = (typeof loyaltyReason.enumValues)[number]

/** Append-only. A customer's stamp balance is always `SUM(delta)` over this
 *  table for their user_id — never a stored counter. Corrections are new
 *  rows with a negative delta, never an UPDATE or DELETE. */
export const loyaltyLedger = pgTable(
  'loyalty_ledger',
  {
    id: id(),
    userId: idRef('user_id', () => users.id),
    delta: integer('delta').notNull(),
    reason: loyaltyReason('reason').notNull(),
    orderId: optionalIdRef('order_id', () => orders.id),
    expiresAt: tstz('expires_at'),
    createdAt: createdAt(),
  },
  (t) => [index('loyalty_ledger_user_idx').on(t.userId)],
)

export const rewards = pgTable(
  'rewards',
  {
    id: id(),
    userId: idRef('user_id', () => users.id),
    issuedAt: createdAt(),
    expiresAt: tstz('expires_at'),
    redeemedAt: tstz('redeemed_at'),
    redeemedOrderId: optionalIdRef('redeemed_order_id', () => orders.id),
  },
  (t) => [index('rewards_user_idx').on(t.userId)],
)

export const loyaltyLedgerRelations = relations(loyaltyLedger, ({ one }) => ({
  user: one(users, { fields: [loyaltyLedger.userId], references: [users.id] }),
  order: one(orders, { fields: [loyaltyLedger.orderId], references: [orders.id] }),
}))

export const rewardsRelations = relations(rewards, ({ one }) => ({
  user: one(users, { fields: [rewards.userId], references: [users.id] }),
  redeemedOrder: one(orders, {
    fields: [rewards.redeemedOrderId],
    references: [orders.id],
  }),
}))
