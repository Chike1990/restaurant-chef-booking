import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { pinoHttp } from 'pino-http'
import { ZodError } from 'zod'
import { env } from './env.ts'
import { logger } from './logger.ts'
import { checkDatabase } from './db.ts'
import { ProblemError, unprocessable } from './errors.ts'
import { menuRouter } from './routes/menu.ts'
import { branchesRouter } from './routes/branches.ts'
import { cartRouter } from './routes/cart.ts'
import { authRouter } from './routes/auth.ts'
import { ordersRouter } from './routes/orders.ts'

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

  app.use('/api', menuRouter)
  app.use('/api', branchesRouter)
  app.use('/api', cartRouter)
  app.use('/api', authRouter)
  app.use('/api', ordersRouter)

  app.use((_req, res) => {
    res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404 })
  })

  /* RFC 7807 problem details for every error. Never put error.message from
     an unknown error into the response — that's how internals leak. */
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ProblemError) {
      res.status(error.status).json(error.toProblem())
      return
    }

    if (error instanceof ZodError) {
      const problem = unprocessable('The request body failed validation.', {
        errors: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      })
      res.status(problem.status).json(problem.toProblem())
      return
    }

    logger.error({ err: error }, 'unhandled request error')
    res.status(500).json({ type: 'about:blank', title: 'Internal Server Error', status: 500 })
  })

  return app
}
