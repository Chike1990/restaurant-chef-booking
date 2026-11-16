import { eq, sql } from 'drizzle-orm'
import { db } from '../db.ts'
import { users } from '../schema/index.ts'

export function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: sql`lower(${users.email}) = lower(${email})` })
}

export function findUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) })
}

export type NewUser = {
  email: string
  passwordHash: string
  fullName: string
  phone: string
}

export async function insertUser(values: NewUser) {
  const [user] = await db.insert(users).values(values).returning()
  if (!user) throw new Error('user insert returned nothing')
  return user
}
