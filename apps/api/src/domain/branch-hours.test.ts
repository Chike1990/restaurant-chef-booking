import { describe, expect, it } from 'vitest'
import { isBranchOpen, type OpeningHoursRow } from './branch-hours.ts'

// Awka: Mon-Sat 08:00-21:00, Sunday 10:00-20:00 (Africa/Lagos, UTC+1).
const AWKA_HOURS: OpeningHoursRow[] = [
  { dayOfWeek: 0, opensAt: '10:00:00', closesAt: '20:00:00', isClosed: false },
  ...Array.from({ length: 6 }, (_, i) => ({
    dayOfWeek: i + 1,
    opensAt: '08:00:00',
    closesAt: '21:00:00',
    isClosed: false,
  })),
]

const OKO_HOURS: OpeningHoursRow[] = [
  { dayOfWeek: 0, opensAt: null, closesAt: null, isClosed: true },
  ...Array.from({ length: 6 }, (_, i) => ({
    dayOfWeek: i + 1,
    opensAt: '08:00:00',
    closesAt: '20:00:00',
    isClosed: false,
  })),
]

describe('isBranchOpen', () => {
  it('is open mid-afternoon on a weekday', () => {
    // 2026-11-16 is a Monday. 12:00 UTC = 13:00 Lagos.
    expect(isBranchOpen(AWKA_HOURS, new Date('2026-11-16T12:00:00Z'))).toBe(true)
  })

  it('is closed before opening time', () => {
    // 06:00 UTC = 07:00 Lagos, before Awka's 08:00 open.
    expect(isBranchOpen(AWKA_HOURS, new Date('2026-11-16T06:00:00Z'))).toBe(false)
  })

  it('is closed exactly at closing time', () => {
    // 20:00 UTC = 21:00 Lagos, Awka's weekday close — closing is exclusive.
    expect(isBranchOpen(AWKA_HOURS, new Date('2026-11-16T20:00:00Z'))).toBe(false)
  })

  it('is open one minute before closing', () => {
    expect(isBranchOpen(AWKA_HOURS, new Date('2026-11-16T19:59:00Z'))).toBe(true)
  })

  it('uses Sunday hours on a Sunday', () => {
    // 2026-11-15 is a Sunday. 09:00 UTC = 10:00 Lagos, Awka's Sunday open.
    expect(isBranchOpen(AWKA_HOURS, new Date('2026-11-15T09:00:00Z'))).toBe(true)
    expect(isBranchOpen(AWKA_HOURS, new Date('2026-11-15T08:00:00Z'))).toBe(false)
  })

  it('respects isClosed even within what would be open hours on another day', () => {
    expect(isBranchOpen(OKO_HOURS, new Date('2026-11-15T12:00:00Z'))).toBe(false)
  })

  it('is closed when there is no row at all for that day', () => {
    const noSunday = AWKA_HOURS.filter((row) => row.dayOfWeek !== 0)
    expect(isBranchOpen(noSunday, new Date('2026-11-15T12:00:00Z'))).toBe(false)
  })
})
