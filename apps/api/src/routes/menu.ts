import { Router } from 'express'
import { getMenu } from '../service/menu.ts'

export const menuRouter: Router = Router()

menuRouter.get('/menu', async (_req, res) => {
  const menu = await getMenu()
  res.json(menu)
})
