import { eq } from 'drizzle-orm'
import { db } from '../db.ts'
import { refreshTokens } from '../schema/index.ts'

export async function insertRefreshToken(values: { userId: string; tokenHash: string; expiresAt: Date }) {
  const [row] = await db.insert(refreshTokens).values(values).returning()
  if (!row) throw new Error('refresh token insert returned nothing')
  return row
}

export function findRefreshTokenByHash(tokenHash: string) {
  return db.query.refreshTokens.findFirst({ where: eq(refreshTokens.tokenHash, tokenHash) })
}

/** Revocation is how a refresh token is made single-use: refreshing marks
 *  the old row revoked before issuing the new one, it's never deleted. */
export async function revokeRefreshToken(id: string) {
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id))
}
