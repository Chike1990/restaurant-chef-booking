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

/** The transaction handle `db.transaction(async (tx) => ...)` passes to its
 *  callback — exported so repo functions that must run inside a transaction
 *  can accept it as a parameter instead of reaching for the module-level `db`. */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

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
