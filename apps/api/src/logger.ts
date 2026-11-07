import pino from 'pino'
import { env, isProduction } from './env.ts'

export const logger = pino({
  level: env.LOG_LEVEL,
  /* Pretty, human-readable logs locally; newline-delimited JSON in production so
     CloudWatch can parse them. */
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
    remove: true,
  },
})
