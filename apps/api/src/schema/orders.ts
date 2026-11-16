import { relations, sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, smallint, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { branches, deliveryZones } from './reference.ts'
import { menuItems, options } from './menu.ts'
import { users } from './identity.ts'
import { createdAt, id, idRef, kobo, optionalIdRef, timestamps } from './_shared.ts'

export const fulfilmentType = pgEnum('fulfilment_type', ['delivery', 'pickup'])
export type FulfilmentType = (typeof fulfilmentType.enumValues)[number]

export const orderStatus = pgEnum('order_status', [
  'pending_payment',
  'paid',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
])
export type OrderStatus = (typeof orderStatus.enumValues)[number]

export const paymentMethod = pgEnum('payment_method', ['card', 'transfer'])
export type PaymentMethod = (typeof paymentMethod.enumValues)[number]

export const paymentStatus = pgEnum('payment_status', ['pending', 'succeeded', 'failed'])
export type PaymentStatus = (typeof paymentStatus.enumValues)[number]

export const orders = pgTable(
  'orders',
  {
    id: id(),
    orderNumber: text('order_number').notNull().unique(),
    userId: optionalIdRef('user_id', () => users.id),
    branchId: idRef('branch_id', () => branches.id, 'restrict'),
    fulfilment: fulfilmentType('fulfilment').notNull(),
    zoneId: optionalIdRef('zone_id', () => deliveryZones.id),
    addressText: text('address_text'),
    status: orderStatus('status').notNull().default('pending_payment'),
    subtotalKobo: kobo('subtotal_kobo').notNull(),
    packagingKobo: kobo('packaging_kobo').notNull(),
    deliveryFeeKobo: kobo('delivery_fee_kobo').notNull(),
    discountKobo: kobo('discount_kobo').notNull().default(0),
    totalKobo: kobo('total_kobo').notNull(),
    idempotencyKey: text('idempotency_key'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('orders_idempotency_key_idx')
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    index('orders_user_idx').on(t.userId),
    index('orders_branch_idx').on(t.branchId),
  ],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: idRef('order_id', () => orders.id),
    menuItemId: idRef('menu_item_id', () => menuItems.id, 'restrict'),
    nameSnapshot: text('name_snapshot').notNull(),
    unitPriceKobo: kobo('unit_price_kobo').notNull(),
    quantity: smallint('quantity').notNull(),
    lineTotalKobo: kobo('line_total_kobo').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
)

export const orderItemOptions = pgTable(
  'order_item_options',
  {
    id: id(),
    orderItemId: idRef('order_item_id', () => orderItems.id),
    optionId: idRef('option_id', () => options.id, 'restrict'),
    nameSnapshot: text('name_snapshot').notNull(),
    surchargeKobo: kobo('surcharge_kobo').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('order_item_options_order_item_idx').on(t.orderItemId)],
)

/** Append-only. `orders.status` is the cached current value; if the two ever
 *  disagree, this log wins. */
export const orderStatusEvents = pgTable(
  'order_status_events',
  {
    id: id(),
    orderId: idRef('order_id', () => orders.id),
    fromStatus: orderStatus('from_status'),
    toStatus: orderStatus('to_status').notNull(),
    actor: text('actor').notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('order_status_events_order_idx').on(t.orderId)],
)

export const payments = pgTable(
  'payments',
  {
    id: id(),
    orderId: idRef('order_id', () => orders.id),
    method: paymentMethod('method').notNull(),
    status: paymentStatus('status').notNull().default('pending'),
    amountKobo: kobo('amount_kobo').notNull(),
    reference: text('reference').notNull().unique(),
    idempotencyKey: text('idempotency_key'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('payments_idempotency_key_idx')
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    index('payments_order_idx').on(t.orderId),
  ],
)

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  branch: one(branches, { fields: [orders.branchId], references: [branches.id] }),
  zone: one(deliveryZones, { fields: [orders.zoneId], references: [deliveryZones.id] }),
  items: many(orderItems),
  statusEvents: many(orderStatusEvents),
  payments: many(payments),
}))

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
  options: many(orderItemOptions),
}))

export const orderItemOptionsRelations = relations(orderItemOptions, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemOptions.orderItemId],
    references: [orderItems.id],
  }),
}))

export const orderStatusEventsRelations = relations(orderStatusEvents, ({ one }) => ({
  order: one(orders, { fields: [orderStatusEvents.orderId], references: [orders.id] }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}))
