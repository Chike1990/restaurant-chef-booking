import { z } from 'zod'
import { unprocessable } from '../errors.ts'
import type { PaymentResult, PaymentStrategy } from './strategy.ts'

const cardDetailsSchema = z.object({
  cardNumber: z.string().min(4),
})

/** Simulated gateway: a card number ending 0000 is a decline, anything else
 *  approves. Resolves synchronously — a real card authorisation is
 *  effectively instant too. */
export const cardStrategy: PaymentStrategy = {
  method: 'card',
  charge(_amountKobo, details): Promise<PaymentResult> {
    const parsed = cardDetailsSchema.safeParse(details)
    if (!parsed.success) throw unprocessable('card payment requires a cardNumber')

    if (parsed.data.cardNumber.endsWith('0000')) {
      return Promise.resolve({ status: 'failed', reason: 'card declined' })
    }
    return Promise.resolve({ status: 'succeeded' })
  },
}
