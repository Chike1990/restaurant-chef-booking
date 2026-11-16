import { sql } from 'drizzle-orm'
import { timestamp, uuid, integer, type AnyPgColumn } from 'drizzle-orm/pg-core'

/** Primary key used by every table. */
export const id = () => uuid('id').primaryKey().defaultRandom()

/** A timezone-aware timestamp. `withTimezone` because the restaurant runs on
 *  Africa/Lagos and the servers will not. */
export const tstz = (name: string) => timestamp(name, { withTimezone: true })

/** Insert time only. Use this alone on append-only tables (event logs, the
 *  loyalty ledger, refresh tokens) where a row is never modified. */
export const createdAt = () =>
  tstz('created_at')
    .notNull()
    .default(sql`now()`)

/** Created/updated pair for mutable tables. `$onUpdate` makes Drizzle set
 *  `updated_at` on every `.update()` it issues, so callers cannot forget. */
export const timestamps = {
  createdAt: createdAt(),
  updatedAt: tstz('updated_at')
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => new Date()),
}

/** Money. Always an integer count of kobo — never numeric, never float. */
export const kobo = (name: string) => integer(name)

/** What happens to the child row when its parent is deleted.
 *  - `cascade`  the child cannot exist without the parent (a user's tokens)
 *  - `restrict` refuse the delete; the child is worth keeping */
export type OnDelete = 'cascade' | 'restrict'

/** Required foreign key. Defaults to `cascade`, so existing calls are unchanged. */
export const idRef = (name: string, ref: () => AnyPgColumn, onDelete: OnDelete = 'cascade') =>
  uuid(name).notNull().references(ref, { onDelete })

/** Optional foreign key: if the parent goes, the link is cleared but the row
 *  survives. You'll need it for orders (guest `user_id`, pickup `zone_id`). */
export const optionalIdRef = (name: string, ref: () => AnyPgColumn) =>
  uuid(name).references(ref, { onDelete: 'set null' })
