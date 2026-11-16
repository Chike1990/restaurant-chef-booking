import { phoneSchema } from '@golden-spoon/shared'
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.ts'
import { getCurrentUser, login, refresh, register } from '../service/auth.ts'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: phoneSchema,
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const authRouter: Router = Router()

authRouter.post('/auth/register', async (req, res) => {
  const input = registerSchema.parse(req.body)
  const result = await register(input)
  res.status(201).json(result)
})

authRouter.post('/auth/login', async (req, res) => {
  const input = loginSchema.parse(req.body)
  const result = await login(input.email, input.password)
  res.json(result)
})

authRouter.post('/auth/refresh', async (req, res) => {
  const input = refreshSchema.parse(req.body)
  const result = await refresh(input.refreshToken)
  res.json(result)
})

authRouter.get('/auth/me', requireAuth, async (req, res) => {
  // requireAuth guarantees req.user is set before next() is called.
  if (!req.user) throw new Error('invariant: requireAuth did not attach a user')
  const user = await getCurrentUser(req.user.id)
  res.json({ user })
})
