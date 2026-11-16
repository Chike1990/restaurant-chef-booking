import argon2, { type HashOptions } from 'argon2'

const ARGON2_OPTIONS: HashOptions = { type: argon2.argon2id }

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

/**
 * A real argon2id hash of a password nobody will ever type, computed once at
 * startup. The login miss-path verifies against this instead of skipping
 * straight to "unauthorized" — otherwise a missing-email response returns
 * instantly while a wrong-password response takes as long as a real hash
 * verification, and that timing difference alone is a user-enumeration
 * oracle.
 */
export const DUMMY_PASSWORD_HASH = await hashPassword('not-a-real-password-used-for-timing-only')
