import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import pg from 'pg'
import { env } from './env.ts'
import { logger } from './logger.ts'
import * as schema from './schema/index.ts'

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (error) => {
  logger.error({ err: error }, 'idle postgres client errored')
})

export const db = drizzle(pool, { schema })

export async function checkDatabase(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`)
    return true
  } catch (error) {
    logger.error({ err: error }, 'database health check failed')
    return false
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end()
}
