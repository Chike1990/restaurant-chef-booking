import { sql } from 'drizzle-orm'
import { timestamp, uuid, integer, type AnyPgColumn } from 'drizzle-orm/pg-core'

/** Primary key used by every table. */
export const id = () => uuid('id').primaryKey().defaultRandom()

/** Created/updated pair. `withTimezone` because the restaurant runs on
 *  Africa/Lagos and the servers will not. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}

/** Money. Always an integer count of kobo — never numeric, never float.
 *  Postgres `integer` tops out around ₦21.4m, which is far above any order. */
export const kobo = (name: string) => integer(name)

export const idRef = (name: string, ref: () => AnyPgColumn) =>
  uuid(name).notNull().references(ref, { onDelete: 'cascade' })
