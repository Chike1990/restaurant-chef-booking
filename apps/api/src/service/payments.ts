import { randomUUID } from 'node:crypto'
import { kobo } from '@golden-spoon/shared'
import { db } from '../db.ts'
import type { DbTransaction } from '../db.ts'
import { REWARD_VALID_DAYS, stampsEarnedFor } from '../domain/loyalty.ts'
import { badRequest, conflict, notFound } from '../errors.ts'
import { paymentStrategyFor, type PaymentMethod } from '../payments/index.ts'
import { uniqueViolation } from '../pg-errors.ts'
import { insertLedgerEntry } from '../repo/loyalty.ts'
import { findOrderById, insertOrderStatusEvent, updateOrderStatus } from '../repo/orders.ts'
import { findPaymentByIdempotencyKey, insertPayment, updatePaymentStatus } from '../repo/payments.ts'

type OrderWithItems = NonNullable<Awaited<ReturnType<typeof findOrderById>>>

/** Drinks and bakery don't earn a stamp — matches the category names seeded
 *  in docs/seed-data.md. */
const NON_QUALIFYING_CATEGORIES = new Set(['Drinks', 'Bakery'])

export type PayOrderInput = {
  orderId: string
  method: PaymentMethod
  details: unknown
}

export type PaymentDTO = {
  id: string
  orderId: string
  method: PaymentMethod
  status: string
  amountKobo: number
  reference: string
}

export type PayOrderResult = { payment: PaymentDTO; created: boolean }

function toPaymentDTO(payment: {
  id: string
  orderId: string
  method: string
  status: string
  amountKobo: number
  reference: string
}): PaymentDTO {
  return {
    id: payment.id,
    orderId: payment.orderId,
    method: payment.method as PaymentMethod,
    status: payment.status,
    amountKobo: payment.amountKobo,
    reference: payment.reference,
  }
}

const RETRY_WITH_NEW_KEY = 'this payment attempt already failed; retry with a new Idempotency-Key'

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

async function earnLoyaltyStamps(tx: DbTransaction, order: OrderWithItems, now: Date): Promise<void> {
  if (!order.userId) return // guest orders don't participate in loyalty

  const qualifyingUnits = order.items
    .filter((item) => !NON_QUALIFYING_CATEGORIES.has(item.menuItem.category.name))
    .reduce((sum, item) => sum + item.quantity, 0)

  const stamps = stampsEarnedFor(qualifyingUnits)
  if (stamps === 0) return

  await insertLedgerEntry(tx, {
    userId: order.userId,
    delta: stamps,
    reason: 'earn',
    orderId: order.id,
    expiresAt: addDays(now, REWARD_VALID_DAYS),
  })
}

export async function payOrder(input: PayOrderInput, idempotencyKey: string): Promise<PayOrderResult> {
  const existing = await findPaymentByIdempotencyKey(idempotencyKey)
  if (existing) {
    if (existing.status === 'failed') throw badRequest(RETRY_WITH_NEW_KEY)
    return { payment: toPaymentDTO(existing), created: false }
  }

  const order = await findOrderById(input.orderId)
  if (!order) throw notFound(`unknown order "${input.orderId}"`)
  if (order.status !== 'pending_payment') {
    throw conflict(`order is "${order.status}", not awaiting payment`)
  }

  const strategy = paymentStrategyFor(input.method)
  const reference = `${input.method}_${randomUUID()}`
  const now = new Date()

  try {
    const { paymentDTO, outcome } = await db.transaction(async (tx) => {
      // Written "pending" before the gateway call, same as a real payment —
      // held in one transaction here only because today's gateway is a
      // synchronous, zero-latency simulation. A real integration would
      // insert this row, call the gateway with no transaction open across
      // the network call, then open a second short transaction to record
      // the outcome.
      const payment = await insertPayment(tx, {
        orderId: order.id,
        method: input.method,
        status: 'pending',
        amountKobo: order.totalKobo,
        reference,
        idempotencyKey,
      })

      const outcome = await strategy.charge(kobo(order.totalKobo), input.details)
      const updated = await updatePaymentStatus(tx, payment.id, outcome.status === 'succeeded' ? 'succeeded' : 'failed')

      if (outcome.status === 'succeeded') {
        await updateOrderStatus(tx, order.id, 'paid')
        await insertOrderStatusEvent(tx, {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: 'paid',
          actor: order.userId ?? 'guest',
        })
        await earnLoyaltyStamps(tx, order, now)
      }

      return { paymentDTO: toPaymentDTO(updated), outcome }
    })

    if (outcome.status === 'failed') throw badRequest(outcome.reason)
    return { payment: paymentDTO, created: true }
  } catch (error) {
    if (uniqueViolation(error) === 'payments_idempotency_key_idx') {
      const raced = await findPaymentByIdempotencyKey(idempotencyKey)
      if (raced) {
        if (raced.status === 'failed') throw badRequest(RETRY_WITH_NEW_KEY)
        return { payment: toPaymentDTO(raced), created: false }
      }
    }
    throw error
  }
}
