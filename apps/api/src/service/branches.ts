import { notFound } from '../errors.ts'
import { findBranchById, findBranchesWithHours, findZonesByBranchId } from '../repo/branches.ts'

export type OpeningHoursDTO = {
  dayOfWeek: number
  opensAt: string | null
  closesAt: string | null
  isClosed: boolean
}

export type BranchDTO = {
  id: string
  name: string
  address: string
  isMain: boolean
  acceptsDelivery: boolean
  openingHours: OpeningHoursDTO[]
}

export type DeliveryZoneDTO = {
  id: string
  name: string
  feeKobo: number
  isActive: boolean
}

export async function listBranches(): Promise<BranchDTO[]> {
  const branches = await findBranchesWithHours()

  return branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    isMain: branch.isMain,
    acceptsDelivery: branch.acceptsDelivery,
    openingHours: branch.openingHours.map((hours) => ({
      dayOfWeek: hours.dayOfWeek,
      opensAt: hours.opensAt,
      closesAt: hours.closesAt,
      isClosed: hours.isClosed,
    })),
  }))
}

export async function listZonesForBranch(branchId: string): Promise<DeliveryZoneDTO[]> {
  const branch = await findBranchById(branchId)
  if (!branch) throw notFound(`no branch with id "${branchId}"`)

  const zones = await findZonesByBranchId(branchId)
  return zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    feeKobo: zone.feeKobo,
    isActive: zone.isActive,
  }))
}
