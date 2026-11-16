import { asc, eq } from 'drizzle-orm'
import { db } from '../db.ts'
import { branches, deliveryZones } from '../schema/index.ts'

export function findBranchesWithHours() {
  return db.query.branches.findMany({
    orderBy: [asc(branches.name)],
    with: {
      openingHours: {
        orderBy: (openingHours, { asc }) => [asc(openingHours.dayOfWeek)],
      },
    },
  })
}

export function findBranchById(id: string) {
  return db.query.branches.findFirst({ where: eq(branches.id, id) })
}

export function findBranchWithHoursById(id: string) {
  return db.query.branches.findFirst({
    where: eq(branches.id, id),
    with: { openingHours: true },
  })
}

export function findZonesByBranchId(branchId: string) {
  return db.query.deliveryZones.findMany({
    where: eq(deliveryZones.branchId, branchId),
    orderBy: [asc(deliveryZones.name)],
  })
}

export function findZoneById(id: string) {
  return db.query.deliveryZones.findFirst({ where: eq(deliveryZones.id, id) })
}
