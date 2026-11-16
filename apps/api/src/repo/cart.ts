import { inArray } from 'drizzle-orm'
import { db } from '../db.ts'
import { menuItems } from '../schema/index.ts'

/** Menu items with their option groups and options, for pricing a cart. */
export function findMenuItemsByIds(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return db.query.menuItems.findMany({
    where: inArray(menuItems.id, ids),
    with: {
      optionGroups: {
        with: { options: true },
      },
    },
  })
}
