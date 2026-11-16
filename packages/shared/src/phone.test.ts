import { describe, expect, it } from 'vitest'
import { normalizePhone, phoneSchema } from './phone.ts'

describe('normalizePhone', () => {
  it.each([
    ['0803 123 4567', '+2348031234567'],
    ['07031234567', '+2347031234567'],
    ['09061234567', '+2349061234567'],
    ['08131234567', '+2348131234567'],
    ['2348031234567', '+2348031234567'],
    ['+234 803-123-4567', '+2348031234567'],
    ['+234 (0) 803 123 4567', '+2348031234567'],
    ['8031234567', '+2348031234567'],
    ['+2348031234567', '+2348031234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each([
    ['0803123', 'too short'],
    ['080312345678', 'too long'],
    ['hello', 'not digits'],
    ['', 'empty'],
    ['08531234567', 'not a mobile prefix'],
    ['+4478031234567', 'foreign number'],
  ])('rejects %s()', (input) => {
    expect(normalizePhone(input)).toBeNull()
  })
})

describe('phoneSchema', () => {
  it('outputs the normalized number', () => {
    expect(phoneSchema.parse('0803 123 4567')).toBe('+2348031234567')
  })

  it('fails with a readable message', () => {
    const result = phoneSchema.safeParse('hello')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toMatch(/Nigerian mobile number/)
  })
})
