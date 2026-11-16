import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    /* `env.ts` validates on import and exits the process if anything is missing,
       so tests need a complete, obviously-fake environment. Nothing here points
       at a real service; suites that need Postgres override DATABASE_URL. */
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://golden_spoon:golden_spoon@127.0.0.1:5432/golden_spoon_test',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key',
      LOG_LEVEL: 'silent',
      JWT_SECRET: 'test-jwt-secret-obviously-fake-but-32-plus-chars',
    },
  },
})
