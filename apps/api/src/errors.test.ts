import { describe, expect, it } from 'vitest'
import { badRequest, conflict, forbidden, notFound, unauthorized, unprocessable } from './errors.ts'

describe('problem details helpers', () => {
  it('badRequest is a 400 with the given detail', () => {
    const error = badRequest('missing field "name"')
    expect(error.status).toBe(400)
    expect(error.toProblem()).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'missing field "name"',
    })
  })

  it('unprocessable carries extra fields through to the problem body', () => {
    const error = unprocessable('validation failed', { errors: [{ path: 'phone', message: 'invalid' }] })
    expect(error.toProblem()).toEqual({
      type: 'about:blank',
      title: 'Unprocessable Content',
      status: 422,
      detail: 'validation failed',
      errors: [{ path: 'phone', message: 'invalid' }],
    })
  })

  it('unauthorized defaults its detail', () => {
    expect(unauthorized().toProblem().detail).toBe('Authentication required')
  })

  it('forbidden defaults its detail', () => {
    expect(forbidden().toProblem().detail).toBe('Not allowed')
  })

  it('notFound and conflict map to the right status', () => {
    expect(notFound('no such order').status).toBe(404)
    expect(conflict('already exists').status).toBe(409)
  })
})
