import { createApp } from './app.ts'
import { env } from './env.ts'
import { logger } from './logger.ts'
import { closeDatabase } from './db.ts'

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'golden-spoon api listening')
})

/* ECS sends SIGTERM and waits before SIGKILL. Finish in-flight requests and
   release the pool rather than dropping connections mid-order. */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down')
  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, 'error closing server')
    }
    await closeDatabase()
    process.exit(error ? 1 : 0)
  })

  setTimeout(() => {
    logger.error('shutdown timed out, forcing exit')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
