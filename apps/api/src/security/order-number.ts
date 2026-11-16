import { randomInt } from 'node:crypto'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' })
const SUFFIX_SPACE = 36 ** 6

/** Human-readable order number: GS-YYYYMMDD-XXXXXX. The date is cosmetic —
 *  uniqueness is enforced by the database's unique constraint on
 *  orders.order_number; the random suffix just makes a collision
 *  astronomically unlikely in the first place. */
export function generateOrderNumber(now: Date): string {
  const datePart = DATE_FORMATTER.format(now).replaceAll('-', '')
  const suffix = randomInt(0, SUFFIX_SPACE).toString(36).toUpperCase().padStart(6, '0')
  return `GS-${datePart}-${suffix}`
}
