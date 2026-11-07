import { describe, expect, it } from 'vitest'
import { createApp } from './app.ts'

/* A smoke test that the app wires up and routes resolve. Route-level tests
   against real Postgres arrive with the API work in block 4. */
describe('createApp', () => {
  it('serves liveness without touching the database', async () => {
    const app = createApp()
    const server = app.listen(0)
    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('expected a TCP address')
    }

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/health`)
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toMatchObject({ status: 'ok' })
    } finally {
      server.close()
    }
  })

  it('returns 404 as a problem-details shape', async () => {
    const app = createApp()
    const server = app.listen(0)
    const address = server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('expected a TCP address')
    }

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/nope`)
      expect(response.status).toBe(404)
      await expect(response.json()).resolves.toMatchObject({ status: 404, title: 'Not Found' })
    } finally {
      server.close()
    }
  })
})
