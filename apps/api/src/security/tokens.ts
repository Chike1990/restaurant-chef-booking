import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../env.ts'
import type { UserRole } from '../schema/index.ts'

const ACCESS_TOKEN_TTL = '15m'
export const REFRESH_TOKEN_TTL_DAYS = 30

export type AccessTokenPayload = {
  sub: string
  role: UserRole
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })
}

/** Throws (jsonwebtoken's own errors) on an expired, malformed or
 *  wrongly-signed token — callers map that to 401, never 500. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET)
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || typeof decoded.role !== 'string') {
    throw new Error('malformed access token payload')
  }
  return { sub: decoded.sub, role: decoded.role as UserRole }
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** A random 32-byte refresh token, returned to the client once. Only its
 *  hash is ever stored — same reasoning as passwords. */
export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { token, tokenHash: hashRefreshToken(token), expiresAt }
}
