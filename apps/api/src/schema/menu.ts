import { relations } from 'drizzle-orm'
import { boolean, index, pgTable, smallint, text } from 'drizzle-orm/pg-core'
import { id, idRef, kobo, timestamps } from './_shared.ts'

export const categories = pgTable('categories', {
  id: id(),
  name: text('name').notNull().unique(),
  sortOrder: smallint('sort_order').notNull().default(0),
  ...timestamps,
})

export const menuItems = pgTable(
  'menu_items',
  {
    id: id(),
    categoryId: idRef('category_id', () => categories.id),
    name: text('name').notNull(),
    description: text('description'),
    basePriceKobo: kobo('base_price_kobo').notNull(),
    imageUrl: text('image_url'),
    isAvailable: boolean('is_available').notNull().default(true),
    isQuickAdd: boolean('is_quick_add').notNull().default(true),
    sortOrder: smallint('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('menu_items_category_idx').on(t.categoryId)],
)

export const optionGroups = pgTable(
  'option_groups',
  {
    id: id(),
    menuItemId: idRef('menu_item_id', () => menuItems.id),
    name: text('name').notNull(),
    isRequired: boolean('is_required').notNull().default(false),
    minSelections: smallint('min_selections').notNull().default(0),
    maxSelections: smallint('max_selections').notNull().default(0),
    sortOrder: smallint('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('option_groups_menu_item_idx').on(t.menuItemId)],
)

export const options = pgTable(
  'options',
  {
    id: id(),
    optionGroupId: idRef('option_group_id', () => optionGroups.id),
    name: text('name').notNull(),
    surchargeKobo: kobo('surcharge_kobo').notNull().default(0),
    isAvailable: boolean('is_available').notNull().default(true),
    sortOrder: smallint('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('options_option_group_idx').on(t.optionGroupId)],
)

export const categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}))

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  optionGroups: many(optionGroups),
}))

export const optionGroupsRelations = relations(optionGroups, ({ one, many }) => ({
  menuItem: one(menuItems, {
    fields: [optionGroups.menuItemId],
    references: [menuItems.id],
  }),
  options: many(options),
}))

export const optionsRelations = relations(options, ({ one }) => ({
  optionGroup: one(optionGroups, {
    fields: [options.optionGroupId],
    references: [optionGroups.id],
  }),
}))
