import { eq } from 'drizzle-orm'
import type { DbTransaction } from '../db.ts'
import { db } from '../db.ts'
import { orderItemOptions, orderItems, orders, orderStatusEvents } from '../schema/index.ts'
import type { OrderStatus } from '../schema/index.ts'

export function findOrderByIdempotencyKey(idempotencyKey: string) {
  return db.query.orders.findFirst({
    where: eq(orders.idempotencyKey, idempotencyKey),
    with: { items: { with: { options: true } } },
  })
}

/** Includes each item's menu item and category — payment needs the category
 *  to decide which meal units earn a loyalty stamp (drinks and bakery
 *  don't). */
export function findOrderById(id: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: {
        with: { menuItem: { with: { category: true } } },
      },
    },
  })
}

export function findOrderByOrderNumber(orderNumber: string) {
  return db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: {
      items: { with: { options: true } },
      statusEvents: { orderBy: (events, { asc }) => [asc(events.createdAt)] },
    },
  })
}

export async function updateOrderStatus(tx: DbTransaction, id: string, status: OrderStatus) {
  const [row] = await tx.update(orders).set({ status }).where(eq(orders.id, id)).returning()
  if (!row) throw new Error('order update returned nothing')
  return row
}

export type NewOrder = typeof orders.$inferInsert

export async function insertOrder(tx: DbTransaction, values: NewOrder) {
  const [order] = await tx.insert(orders).values(values).returning()
  if (!order) throw new Error('order insert returned nothing')
  return order
}

export type NewOrderItem = typeof orderItems.$inferInsert

/** One row at a time, not a bulk insert: multi-row INSERT...RETURNING order
 *  isn't guaranteed to match input order, and pairing an item with the
 *  wrong options would silently corrupt an order. */
export async function insertOrderItem(tx: DbTransaction, values: NewOrderItem) {
  const [row] = await tx.insert(orderItems).values(values).returning()
  if (!row) throw new Error('order item insert returned nothing')
  return row
}

export type NewOrderItemOption = typeof orderItemOptions.$inferInsert

export function insertOrderItemOptions(tx: DbTransaction, values: NewOrderItemOption[]) {
  if (values.length === 0) return Promise.resolve([])
  return tx.insert(orderItemOptions).values(values).returning()
}

/** The order's first status-event row, created alongside the order itself —
 *  not a validated transition (there's no "from" state for a brand new
 *  order), just the append-only log's opening entry. */
export function insertOrderStatusEvent(
  tx: DbTransaction,
  values: { orderId: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; actor: string; note?: string },
) {
  return tx.insert(orderStatusEvents).values(values)
}
