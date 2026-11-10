import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://golden_spoon:golden_spoon@localhost:5433/golden_spoon',
  },
  verbose: true,
  strict: true,
})
