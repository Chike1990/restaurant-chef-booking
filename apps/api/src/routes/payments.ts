import { Router } from 'express'
import { z } from 'zod'
import { badRequest } from '../errors.ts'
import { payOrder } from '../service/payments.ts'

const payOrderSchema = z.object({
  method: z.enum(['card', 'transfer']),
  details: z.record(z.string(), z.unknown()).default({}),
})

export const paymentsRouter: Router = Router()

paymentsRouter.post('/orders/:id/pay', async (req, res) => {
  const idempotencyKey = req.header('Idempotency-Key')
  if (!idempotencyKey) throw badRequest('the Idempotency-Key header is required')

  const { id } = req.params
  if (!id) throw badRequest('order id is required')

  const input = payOrderSchema.parse(req.body)
  const { payment, created } = await payOrder({ orderId: id, method: input.method, details: input.details }, idempotencyKey)
  res.status(created ? 201 : 200).json({ payment })
})
