import { Router } from 'express'
import { z } from 'zod'
import { badRequest } from '../errors.ts'
import { optionalAuth } from '../middleware/auth.ts'
import { createOrder } from '../service/orders.ts'

const orderLineSchema = z.object({
  menuItemId: z.string().min(1),
  optionIds: z.array(z.string().min(1)).default([]),
  quantity: z.number().int().positive(),
})

/** Item ids, option ids, a branch and a fulfilment choice — never a price.
 *  Rule 2: if the body contains an amount, the server ignores it. */
const createOrderSchema = z.discriminatedUnion('fulfilment', [
  z.object({
    fulfilment: z.literal('pickup'),
    branchId: z.string().min(1),
    lines: z.array(orderLineSchema).min(1),
    rewardApplied: z.boolean().default(false),
  }),
  z.object({
    fulfilment: z.literal('delivery'),
    branchId: z.string().min(1),
    zoneId: z.string().min(1),
    addressText: z.string().min(1),
    lines: z.array(orderLineSchema).min(1),
    rewardApplied: z.boolean().default(false),
  }),
])

export const ordersRouter: Router = Router()

ordersRouter.post('/orders', optionalAuth, async (req, res) => {
  const idempotencyKey = req.header('Idempotency-Key')
  if (!idempotencyKey) throw badRequest('the Idempotency-Key header is required')

  const input = createOrderSchema.parse(req.body)
  const { order, created } = await createOrder({ ...input, userId: req.user?.id ?? null }, idempotencyKey)
  res.status(created ? 201 : 200).json({ order })
})
