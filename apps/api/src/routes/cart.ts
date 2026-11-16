import { Router } from 'express'
import { z } from 'zod'
import { quoteCart } from '../service/cart.ts'

const cartLineSchema = z.object({
  menuItemId: z.string().min(1),
  optionIds: z.array(z.string().min(1)).default([]),
  quantity: z.number().int().positive(),
})

/** Item ids, option ids and quantities — and nothing else. A price, subtotal
 *  or total in the body is silently stripped by Zod's default object mode,
 *  never read. */
const cartQuoteSchema = z.discriminatedUnion('fulfilment', [
  z.object({ fulfilment: z.literal('pickup'), lines: z.array(cartLineSchema).min(1) }),
  z.object({ fulfilment: z.literal('delivery'), zoneId: z.string().min(1), lines: z.array(cartLineSchema).min(1) }),
])

export const cartRouter: Router = Router()

cartRouter.post('/cart/quote', async (req, res) => {
  const input = cartQuoteSchema.parse(req.body)
  const quote = await quoteCart(input)
  res.json(quote)
})
