/**
 * Money handling for Golden Spoon.
 *
 * Every amount in this system is an integer number of **kobo** (₦1 = 100 kobo).
 * Floating point never touches a price: `0.1 + 0.2 !== 0.3`, and a restaurant
 * that is a kobo out on every order is a restaurant with a broken ledger.
 *
 * `Kobo` is a branded type, so a bare `number` cannot be passed where an amount
 * is expected without going through `naira()` or `kobo()`. That turns "did I
 * mean naira or kobo here?" from a runtime bug into a compile error.
 */

declare const KOBO: unique symbol

export type Kobo = number & { readonly [KOBO]: true }

/** Largest amount we accept: ₦100,000,000. Guards against overflow and typos. */
const MAX_KOBO = 100_000_000_00

function assertValidKobo(value: number, label: string): asserts value is Kobo {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be a whole number of kobo, got ${value}`)
  }
  if (value < 0) {
    throw new RangeError(`${label} must not be negative, got ${value}`)
  }
  if (value > MAX_KOBO) {
    throw new RangeError(`${label} exceeds the maximum of ${MAX_KOBO} kobo, got ${value}`)
  }
}

/** Build an amount from a whole number of kobo. */
export function kobo(value: number): Kobo {
  assertValidKobo(value, 'amount')
  return value
}

/**
 * Build an amount from naira. Accepts at most 2 decimal places, since a kobo is
 * the smallest unit that exists.
 */
export function naira(value: number): Kobo {
  const asKobo = Math.round(value * 100)
  if (Math.abs(value * 100 - asKobo) > Number.EPSILON * Math.abs(value * 100)) {
    throw new RangeError(`₦${value} is finer than one kobo`)
  }
  assertValidKobo(asKobo, 'amount')
  return asKobo
}

/** Add amounts. Empty sum is zero. */
export function addKobo(...amounts: Kobo[]): Kobo {
  const total = amounts.reduce<number>((sum, amount) => sum + amount, 0)
  assertValidKobo(total, 'total')
  return total
}

/** Subtract `b` from `a`. Throws rather than returning a negative price. */
export function subtractKobo(a: Kobo, b: Kobo): Kobo {
  const result = a - b
  assertValidKobo(result, 'difference')
  return result
}

/** Multiply an amount by a whole quantity. */
export function multiplyKobo(amount: Kobo, quantity: number): Kobo {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`quantity must be a non-negative whole number, got ${quantity}`)
  }
  const result = amount * quantity
  assertValidKobo(result, 'product')
  return result
}

/** Format for display: `₦4,800` whole, `₦4,800.50` when there are kobo. */
export function formatNaira(amount: Kobo): string {
  const whole = Math.floor(amount / 100)
  const remainder = amount % 100
  const grouped = whole.toLocaleString('en-NG')
  return remainder === 0 ? `₦${grouped}` : `₦${grouped}.${String(remainder).padStart(2, '0')}`
}

/** The zero amount, for use as a reduce seed or an empty cart total. */
export const ZERO_KOBO = kobo(0)
