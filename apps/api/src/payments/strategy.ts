import type { Kobo } from '@golden-spoon/shared'

export type PaymentMethod = 'card' | 'transfer'

export type PaymentResult = { status: 'succeeded' } | { status: 'failed'; reason: string }

/**
 * Card and transfer differ in genuine behaviour — different validation,
 * different failure modes — so each is an implementation of this interface
 * rather than an `if (method === 'card')` in the route. Adding Paystack
 * later is a new file plus one map entry, no edit to the route.
 *
 * `details: unknown`, not `any` — each strategy parses its own payload with
 * its own Zod schema, so a malformed payload is a 422, not a silent bug.
 */
export interface PaymentStrategy {
  readonly method: PaymentMethod
  charge(amountKobo: Kobo, details: unknown): Promise<PaymentResult>
}
