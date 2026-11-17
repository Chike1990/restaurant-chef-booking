import { cardStrategy } from './card.ts'
import type { PaymentMethod, PaymentStrategy } from './strategy.ts'
import { transferStrategy } from './transfer.ts'

const STRATEGIES: Record<PaymentMethod, PaymentStrategy> = {
  card: cardStrategy,
  transfer: transferStrategy,
}

export function paymentStrategyFor(method: PaymentMethod): PaymentStrategy {
  return STRATEGIES[method]
}

export type { PaymentMethod, PaymentResult, PaymentStrategy } from './strategy.ts'
