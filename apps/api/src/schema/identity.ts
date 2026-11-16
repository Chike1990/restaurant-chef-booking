import { relations, sql } from 'drizzle-orm'
import { boolean, check, index, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { createdAt, id, idRef, timestamps, tstz } from './_shared.ts'
import { deliveryZones } from './reference.ts'

/** Must be exported, or drizzle-kit will not emit the `CREATE TYPE`. */
export const userRole = pgEnum('user_role', ['customer', 'admin'])
export type UserRole = (typeof userRole.enumValues)[number]

export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    role: userRole('role').notNull().default('customer'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`),
    check('users_phone_normalised', sql`${t.phone} ~ '^\\+234[0-9]{10}$'`),
  ],
)

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: id(),
    userId: idRef('user_id', () => users.id),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: tstz('expires_at').notNull(),
    revokedAt: tstz('revoked_at'),
    createdAt: createdAt(),
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)],
)

export const addresses = pgTable(
  'addresses',
  {
    id: id(),
    userId: idRef('user_id', () => users.id),
    zoneId: idRef('zone_id', () => deliveryZones.id, 'restrict'),
    street: text('street').notNull(),
    landmark: text('landmark'),
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('addresses_user_idx').on(t.userId),
    uniqueIndex('addresses_one_default_per_user_idx')
      .on(t.userId)
      .where(sql`${t.isDefault}`),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  addresses: many(addresses),
}))

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}))

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
  zone: one(deliveryZones, {
    fields: [addresses.zoneId],
    references: [deliveryZones.id],
  }),
}))
