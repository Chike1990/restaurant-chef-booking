import { Router } from 'express'
import { badRequest } from '../errors.ts'
import { listBranches, listZonesForBranch } from '../service/branches.ts'

export const branchesRouter: Router = Router()

branchesRouter.get('/branches', async (_req, res) => {
  const branches = await listBranches()
  res.json({ branches })
})

branchesRouter.get('/branches/:id/zones', async (req, res) => {
  const { id } = req.params
  if (!id) throw badRequest('branch id is required')

  const zones = await listZonesForBranch(id)
  res.json({ zones })
})
