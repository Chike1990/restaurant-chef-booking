import type { NextFunction, Request, Response } from 'express'
import type { UserRole } from '../schema/index.ts'
import { forbidden, unauthorized } from '../errors.ts'
import { verifyAccessToken } from '../security/tokens.ts'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole }
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized())
    return
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length))
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    next(unauthorized('invalid or expired access token'))
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, (error) => {
    if (error) {
      next(error)
      return
    }
    if (req.user?.role !== 'admin') {
      next(forbidden())
      return
    }
    next()
  })
}
