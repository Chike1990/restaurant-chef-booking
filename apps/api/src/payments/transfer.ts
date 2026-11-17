import { z } from 'zod'
import { unprocessable } from '../errors.ts'
import type { PaymentResult, PaymentStrategy } from './strategy.ts'

const transferDetailsSchema = z.object({
  accountNumber: z.string().min(4),
})

/** Simulated gateway. A real bank transfer settles asynchronously — it sits
 *  at "pending" until a webhook confirms it, which is why the payment row
 *  the service writes starts at "pending" regardless of method. This
 *  simulation has no webhook to wait for, so it always resolves to
 *  succeeded; there's no stated failure condition for transfer today. */
export const transferStrategy: PaymentStrategy = {
  method: 'transfer',
  charge(_amountKobo, details): Promise<PaymentResult> {
    const parsed = transferDetailsSchema.safeParse(details)
    if (!parsed.success) throw unprocessable('transfer payment requires an accountNumber')

    return Promise.resolve({ status: 'succeeded' })
  },
}
