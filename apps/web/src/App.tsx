import { useEffect, useState } from 'react'
import { formatNaira, naira } from '@golden-spoon/shared'

/**
 * Day 1 shell. Deliberately unstyled — the Tailwind design system, routing and
 * real screens are Day 2, block 1. This exists to prove three wires are live:
 * React renders, the `/api` proxy reaches Express, and the shared package
 * resolves across the workspace.
 */
type ApiStatus = 'checking' | 'ok' | 'unreachable'

export function App() {
  const [status, setStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/health', { signal: controller.signal })
      .then((response) => setStatus(response.ok ? 'ok' : 'unreachable'))
      .catch(() => setStatus('unreachable'))

    return () => controller.abort()
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '40rem' }}>
      <h1>Golden Spoon Cuisine</h1>
      <p>Whatever the problem, chop first.</p>
      <dl>
        <dt>API</dt>
        <dd>{status}</dd>
        <dt>Shared money helper</dt>
        <dd>{formatNaira(naira(4800))} — ofe onugbu</dd>
      </dl>
    </main>
  )
}
