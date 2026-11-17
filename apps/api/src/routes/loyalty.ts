import { Router } from 'express'
import { requireAuth } from '../middleware/auth.ts'
import { getLoyaltySummary, redeemStampsForReward } from '../service/loyalty.ts'

export const loyaltyRouter: Router = Router()

loyaltyRouter.get('/loyalty/me', requireAuth, async (req, res) => {
  if (!req.user) throw new Error('invariant: requireAuth did not attach a user')
  const summary = await getLoyaltySummary(req.user.id)
  res.json(summary)
})

loyaltyRouter.post('/loyalty/redeem', requireAuth, async (req, res) => {
  if (!req.user) throw new Error('invariant: requireAuth did not attach a user')
  const reward = await redeemStampsForReward(req.user.id)
  res.status(201).json({ reward })
})
