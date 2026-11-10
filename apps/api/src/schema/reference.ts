import { relations } from 'drizzle-orm'
import { boolean, pgTable, smallint, text, time, uniqueIndex } from 'drizzle-orm/pg-core'
import { id, kobo, timestamps, idRef } from './_shared.ts'

export const branches = pgTable('branches', {
  id: id(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  isMain: boolean('is_main').notNull().default(false),
  acceptsDelivery: boolean('accepts_delivery').notNull().default(true),
  ...timestamps,
})

export const deliveryZones = pgTable(
  'delivery_zones',
  {
    id: id(),
    branchId: idRef('branch_id', () => branches.id),
    name: text('name').notNull(),
    feeKobo: kobo('fee_kobo').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('delivery_zones_branch_name_idx').on(t.branchId, t.name)],
)

export const openingHours = pgTable(
  'opening_hours',
  {
    id: id(),
    branchId: idRef('branch_id', () => branches.id),
    // 0 = Sunday ... 6 = Saturday, matching JS getDay()
    dayOfWeek: smallint('day_of_week').notNull(),
    opensAt: time('opens_at'),
    closesAt: time('closes_at'),
    isClosed: boolean('is_closed').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('opening_hours_branch_day_idx').on(t.branchId, t.dayOfWeek)],
)

/** Single-row-per-key settings: loyalty threshold, packaging fee, and so on.
 *  Values are text and parsed at the edge, so adding a setting needs no migration. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  ...timestamps,
})

export const branchesRelations = relations(branches, ({ many }) => ({
  deliveryZones: many(deliveryZones),
  openingHours: many(openingHours),
}))
