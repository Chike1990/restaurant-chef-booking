import { z } from 'zod'

/**
 * Environment configuration, validated once at startup.
 *
 * The app reads `env` from here and never touches `process.env` again. If a
 * variable is missing or malformed the process exits immediately with a list of
 * every problem — not three requests later with `undefined is not a function`.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  /* Object storage for dish and event photos. MinIO locally, S3 in AWS. */
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).default('eu-west-2'),
  S3_BUCKET: z.string().min(1).default('golden-spoon-media'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),

  /* Comma-separated list of origins allowed to call the API. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    // Deliberately console + exit rather than throw: this runs before the logger
    // exists, and a stack trace would bury the actual list of missing variables.
    console.error(`Invalid environment configuration:\n${problems}\n`)
    process.exit(1)
  }

  return parsed.data
}

export const env = loadEnv()

export const isProduction = env.NODE_ENV === 'production'
