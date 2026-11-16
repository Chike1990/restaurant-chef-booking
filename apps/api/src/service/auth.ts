import { conflict, unauthorized } from '../errors.ts'
import { uniqueViolation } from '../pg-errors.ts'
import { findRefreshTokenByHash, insertRefreshToken, revokeRefreshToken } from '../repo/refresh-tokens.ts'
import { findUserByEmail, findUserById, insertUser } from '../repo/users.ts'
import type { users } from '../schema/index.ts'
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../security/password.ts'
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../security/tokens.ts'

type UserRow = typeof users.$inferSelect

export type RegisterInput = {
  email: string
  password: string
  fullName: string
  phone: string
}

export type UserDTO = {
  id: string
  email: string
  fullName: string
  phone: string
  role: UserRow['role']
}

export type AuthResult = {
  user: UserDTO
  accessToken: string
  refreshToken: string
}

function toUserDTO(user: UserRow): UserDTO {
  return { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role }
}

async function issueTokensFor(user: UserRow): Promise<AuthResult> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role })
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken()
  await insertRefreshToken({ userId: user.id, tokenHash, expiresAt })
  return { user: toUserDTO(user), accessToken, refreshToken }
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await findUserByEmail(input.email)
  if (existing) throw conflict('an account with this email already exists')

  const passwordHash = await hashPassword(input.password)

  let user: UserRow
  try {
    user = await insertUser({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
    })
  } catch (error) {
    // The findUserByEmail check above isn't atomic with the insert — a
    // concurrent registration with the same email can still race past it,
    // so the unique index is the real guard. Map its violation to the same
    // 409 rather than a raw 500.
    if (uniqueViolation(error) !== null) throw conflict('an account with this email already exists')
    throw error
  }

  return issueTokensFor(user)
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await findUserByEmail(email)

  if (!user) {
    // Constant-time decoy: a missing email still pays the cost of a real
    // argon2 verification, so response timing can't be used to tell which
    // emails are registered.
    await verifyPassword(DUMMY_PASSWORD_HASH, password)
    throw unauthorized('invalid email or password')
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) throw unauthorized('invalid email or password')

  return issueTokensFor(user)
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  const tokenHash = hashRefreshToken(refreshToken)
  const stored = await findRefreshTokenByHash(tokenHash)

  if (!stored || stored.revokedAt !== null || stored.expiresAt <= new Date()) {
    throw unauthorized('invalid or expired refresh token')
  }

  // Revoke before issuing the replacement: single-use, and a crash between
  // these two lines leaves the old token dead rather than reusable.
  await revokeRefreshToken(stored.id)

  const user = await findUserById(stored.userId)
  if (!user) throw unauthorized('invalid or expired refresh token')

  return issueTokensFor(user)
}

export async function getCurrentUser(userId: string): Promise<UserDTO> {
  const user = await findUserById(userId)
  if (!user) throw unauthorized('the authenticated user no longer exists')
  return toUserDTO(user)
}
