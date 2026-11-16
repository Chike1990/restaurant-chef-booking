import { eq } from 'drizzle-orm'
import { db } from '../db.ts'
import { settings } from '../schema/index.ts'

export async function findSettingValue(key: string): Promise<string | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) })
  return row?.value ?? null
}
