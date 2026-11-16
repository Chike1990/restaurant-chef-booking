/** `opening_hours.day_of_week`/`opens_at`/`closes_at` as Postgres returns
 *  them: 0 = Sunday … 6 = Saturday, times as "HH:MM:SS" strings. */
export type OpeningHoursRow = {
  dayOfWeek: number
  opensAt: string | null
  closesAt: string | null
  isClosed: boolean
}

const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Lagos' })
const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Africa/Lagos',
})
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/**
 * Is the branch open at `now`, read in Africa/Lagos regardless of the
 * server's own timezone? Doesn't handle hours that cross midnight — no
 * branch in seed-data.md needs that, so it's out of scope rather than
 * silently wrong.
 */
export function isBranchOpen(hours: readonly OpeningHoursRow[], now: Date): boolean {
  const dayOfWeek = WEEKDAY_INDEX[DAY_FORMATTER.format(now)]
  const today = hours.find((row) => row.dayOfWeek === dayOfWeek)

  if (!today || today.isClosed || !today.opensAt || !today.closesAt) return false

  const currentTime = TIME_FORMATTER.format(now)
  return currentTime >= today.opensAt.slice(0, 8) && currentTime < today.closesAt.slice(0, 8)
}
