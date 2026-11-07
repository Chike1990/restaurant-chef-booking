import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { pinoHttp } from 'pino-http'
import { env } from './env.ts'
import { logger } from './logger.ts'
import { checkDatabase } from './db.ts'

export function createApp(): Express {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(pinoHttp({ logger }))

  /* Liveness: is the process up? Used by the container runtime. */
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV })
  })

  /* Readiness: can we actually serve traffic? Used by the ALB target group. */
  app.get('/api/ready', async (_req, res) => {
    const databaseUp = await checkDatabase()
    res.status(databaseUp ? 200 : 503).json({
      status: databaseUp ? 'ready' : 'degraded',
      checks: { database: databaseUp ? 'up' : 'down' },
    })
  })

  app.use((_req, res) => {
    res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404 })
  })

  /* Placeholder error handler. Block 4 replaces this with proper RFC 7807
     problem details once there are real domain errors to map. */
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: error }, 'unhandled request error')
    res.status(500).json({ type: 'about:blank', title: 'Internal Server Error', status: 500 })
  })

  return app
}
