/**
 * Drizzle wraps the real Postgres error in a DrizzleQueryError, with the
 * code/constraint Postgres actually reports nested under `.cause` — so
 * checking only the outermost error for `.code`/`.constraint` silently never
 * matches. Walk the cause chain instead.
 *
 * Returns the violated constraint/index name for a unique-violation
 * (Postgres code 23505) anywhere in the chain, or `null`.
 */
export function uniqueViolation(error: unknown): string | null {
  for (let current: unknown = error; current != null; current = (current as { cause?: unknown }).cause) {
    if (
      typeof current === 'object' &&
      'code' in current &&
      current.code === '23505' &&
      'constraint' in current &&
      typeof current.constraint === 'string'
    ) {
      return current.constraint
    }
  }
  return null
}
