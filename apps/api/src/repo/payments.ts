import { eq } from 'drizzle-orm'
import { db } from '../db.ts'
import type { DbTransaction } from '../db.ts'
import { payments } from '../schema/index.ts'

export function findPaymentByIdempotencyKey(idempotencyKey: string) {
  return db.query.payments.findFirst({ where: eq(payments.idempotencyKey, idempotencyKey) })
}

export type NewPayment = typeof payments.$inferInsert

export async function insertPayment(tx: DbTransaction, values: NewPayment) {
  const [row] = await tx.insert(payments).values(values).returning()
  if (!row) throw new Error('payment insert returned nothing')
  return row
}

export async function updatePaymentStatus(tx: DbTransaction, id: string, status: 'succeeded' | 'failed') {
  const [row] = await tx.update(payments).set({ status }).where(eq(payments.id, id)).returning()
  if (!row) throw new Error('payment update returned nothing')
  return row
}
