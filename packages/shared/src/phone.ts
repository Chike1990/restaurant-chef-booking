/**
 * Phone numbers for Golden Spoon.
 *
 * Every phone number is stored in one shape: `+234` followed by the 10-digit
 * subscriber number, e.g. `+2348031234567`. Customers type numbers every way
 * imaginable — `0803 123 4567`, `234-803-123-4567`, `+234 (0) 803…` — so they
 * are normalised once, at the edge, and nothing downstream ever sees a raw one.
 *
 * `Phone` is branded like `Kobo`: a plain string cannot be passed where a phone
 * is expected without going through `normalizePhone()`.
 */
import { z } from 'zod'

declare const PHONE: unique symbol

export type Phone = string & { readonly [PHONE]: true }

/** Nigerian mobile subscriber number, without the country code or trunk 0:
 *  first digit 7/8/9, second 0/1 (070x, 080x, 081x, 090x, 091x), 10 digits. */
const SUBSCRIBER = /^[789][01]\d{8}$/

/**
 * Turn anything a customer might type into `+234XXXXXXXXXX`, or `null` if it is
 * not a Nigerian mobile number. Returns `null` rather than throwing because a
 * bad phone number is expected user input, not a programming error.
 */
export function normalizePhone(input: string): Phone | null {
  // 1. Drop formatting people add: spaces, dashes, dots, brackets.
  let digits = input.replace(/[\s\-().]/g, '')

  // 2. Strip the country code or the trunk 0, whichever is there.
  if (digits.startsWith('+234')) digits = digits.slice(4)
  else if (digits.startsWith('234')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)

  // 3. "+234 (0) 803…" leaves a stray trunk 0 after the country code.
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)

  // 4. whatever that is left must be the subscriber number.
  if (!SUBSCRIBER.test(digits)) return null

  return `+234${digits}` as Phone
}

/**
 * Zod schema for any request field that carries a phone number. Parses the raw
 * string and outputs a normalised `Phone`, or fails validation with a message
 * the client can show — so a bad number is a 400, never a database error.
 */
export const phoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizePhone(value)
  if (phone === null) {
    ctx.issues.push({
      code: 'custom',
      message: 'Enter a Nigerian mobile number, e.g. 0803 123 4567',
      input: value,
    })
    return z.NEVER
  }
  return phone
})
