export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'

/** `ready` lists both of its successors — the caller (the order service,
 *  which knows the order's fulfilment type) decides which one actually
 *  applies. This table only encodes which moves are topologically legal. */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed'],
  out_for_delivery: ['delivered'],
  delivered: [],
  completed: [],
  cancelled: [],
}

export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from]
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Throws rather than returning false — a silent no-op on a status change is
 *  how an order gets stuck in `preparing` forever with nobody noticing. */
export function transition(from: OrderStatus, to: OrderStatus): OrderStatus {
  if (!canTransition(from, to)) {
    throw new RangeError(`cannot transition an order from "${from}" to "${to}"`)
  }
  return to
}
