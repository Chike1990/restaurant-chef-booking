import { describe, expect, it } from 'vitest'
import { canTransition, nextStatuses, transition, type OrderStatus } from './order-state.ts'

const LEGAL_MOVES: Array<[OrderStatus, OrderStatus]> = [
  ['pending_payment', 'paid'],
  ['pending_payment', 'cancelled'],
  ['paid', 'preparing'],
  ['paid', 'cancelled'],
  ['preparing', 'ready'],
  ['preparing', 'cancelled'],
  ['ready', 'out_for_delivery'],
  ['ready', 'completed'],
  ['out_for_delivery', 'delivered'],
]

const ILLEGAL_MOVES: Array<[OrderStatus, OrderStatus]> = [
  ['delivered', 'preparing'],
  ['cancelled', 'paid'],
  ['pending_payment', 'delivered'],
  ['paid', 'pending_payment'],
  ['ready', 'preparing'],
  ['completed', 'ready'],
]

const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'completed', 'cancelled']

describe('canTransition / transition', () => {
  it.each(LEGAL_MOVES)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true)
    expect(transition(from, to)).toBe(to)
  })

  it.each(ILLEGAL_MOVES)('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false)
    expect(() => transition(from, to)).toThrow(RangeError)
  })
})

describe('nextStatuses', () => {
  it.each(TERMINAL_STATUSES)('returns no successors for terminal status %s', (status) => {
    expect(nextStatuses(status)).toEqual([])
  })

  it('lists both successors of ready, leaving the choice to the caller', () => {
    expect(nextStatuses('ready')).toEqual(['out_for_delivery', 'completed'])
  })
})
