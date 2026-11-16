import { asc } from 'drizzle-orm'
import { db } from '../db.ts'
import { categories } from '../schema/index.ts'

/** Full menu tree, ordered for display. Unavailable items and options are
 *  included — the service layer flags them rather than hiding them. */
export function findCategoriesWithItems() {
  return db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder)],
    with: {
      menuItems: {
        orderBy: (menuItems, { asc }) => [asc(menuItems.sortOrder)],
        with: {
          optionGroups: {
            orderBy: (optionGroups, { asc }) => [asc(optionGroups.sortOrder)],
            with: {
              options: {
                orderBy: (options, { asc }) => [asc(options.sortOrder)],
              },
            },
          },
        },
      },
    },
  })
}
