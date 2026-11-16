import { kobo } from '@golden-spoon/shared'
import { isBranchOpen } from '../domain/branch-hours.ts'
import { quoteOrder, type Fulfilment } from '../domain/pricing.ts'
import { badRequest, conflict } from '../errors.ts'
import { uniqueViolation } from '../pg-errors.ts'
import { findBranchWithHoursById, findZoneById } from '../repo/branches.ts'
import { findAvailableRewardForUser, redeemReward } from '../repo/loyalty.ts'
import {
  findOrderByIdempotencyKey,
  insertOrderItem,
  insertOrderItemOptions,
  insertOrderStatusEvent,
  insertOrder,
} from '../repo/orders.ts'
import { db } from '../db.ts'
import type { orderItemOptions, orderItems, orders } from '../schema/index.ts'
import { generateOrderNumber } from '../security/order-number.ts'
import { loadPackagingFeeKobo, priceLines, type PriceableLineInput } from './pricing-lines.ts'

type OrderRow = typeof orders.$inferSelect
type OrderItemRow = typeof orderItems.$inferSelect
type OrderItemOptionRow = typeof orderItemOptions.$inferSelect

const MAX_ORDER_NUMBER_ATTEMPTS = 3

export type CreateOrderInput = {
  branchId: string
  lines: PriceableLineInput[]
  rewardApplied: boolean
  userId: string | null
} & ({ fulfilment: 'pickup' } | { fulfilment: 'delivery'; zoneId: string; addressText: string })

export type OrderItemOptionDTO = { id: string; name: string; surchargeKobo: number }
export type OrderItemDTO = {
  id: string
  menuItemId: string
  name: string
  unitPriceKobo: number
  quantity: number
  lineTotalKobo: number
  options: OrderItemOptionDTO[]
}
export type OrderDTO = {
  id: string
  orderNumber: string
  status: string
  fulfilment: string
  subtotalKobo: number
  packagingKobo: number
  deliveryFeeKobo: number
  discountKobo: number
  totalKobo: number
  items: OrderItemDTO[]
}

export type CreateOrderResult = { order: OrderDTO; created: boolean }

function toOrderDTOFromExisting(order: Awaited<ReturnType<typeof findOrderByIdempotencyKey>>): OrderDTO {
  if (!order) throw new Error('invariant: toOrderDTOFromExisting called with no order')
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfilment: order.fulfilment,
    subtotalKobo: order.subtotalKobo,
    packagingKobo: order.packagingKobo,
    deliveryFeeKobo: order.deliveryFeeKobo,
    discountKobo: order.discountKobo,
    totalKobo: order.totalKobo,
    items: order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.nameSnapshot,
      unitPriceKobo: item.unitPriceKobo,
      quantity: item.quantity,
      lineTotalKobo: item.lineTotalKobo,
      options: item.options.map((option) => ({
        id: option.optionId,
        name: option.nameSnapshot,
        surchargeKobo: option.surchargeKobo,
      })),
    })),
  }
}

function toOrderDTOFromFresh(order: OrderRow, items: Array<{ row: OrderItemRow; options: OrderItemOptionRow[] }>): OrderDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfilment: order.fulfilment,
    subtotalKobo: order.subtotalKobo,
    packagingKobo: order.packagingKobo,
    deliveryFeeKobo: order.deliveryFeeKobo,
    discountKobo: order.discountKobo,
    totalKobo: order.totalKobo,
    items: items.map(({ row, options }) => ({
      id: row.id,
      menuItemId: row.menuItemId,
      name: row.nameSnapshot,
      unitPriceKobo: row.unitPriceKobo,
      quantity: row.quantity,
      lineTotalKobo: row.lineTotalKobo,
      options: options.map((option) => ({
        id: option.optionId,
        name: option.nameSnapshot,
        surchargeKobo: option.surchargeKobo,
      })),
    })),
  }
}

async function resolveFulfilmentForBranch(input: CreateOrderInput, branchId: string): Promise<Fulfilment> {
  if (input.fulfilment === 'pickup') return { kind: 'pickup' }

  const zone = await findZoneById(input.zoneId)
  if (!zone) throw badRequest(`unknown delivery zone "${input.zoneId}"`)
  if (zone.branchId !== branchId) throw badRequest(`delivery zone "${zone.name}" is not served by this branch`)
  if (!zone.isActive) throw badRequest(`delivery zone "${zone.name}" is not currently accepting orders`)

  return { kind: 'delivery', zoneId: zone.id, deliveryFeeKobo: kobo(zone.feeKobo) }
}

export async function createOrder(input: CreateOrderInput, idempotencyKey: string): Promise<CreateOrderResult> {
  const existing = await findOrderByIdempotencyKey(idempotencyKey)
  if (existing) return { order: toOrderDTOFromExisting(existing), created: false }

  const now = new Date()

  const branch = await findBranchWithHoursById(input.branchId)
  if (!branch) throw badRequest(`unknown branch "${input.branchId}"`)
  if (!isBranchOpen(branch.openingHours, now)) {
    throw conflict(`${branch.name} is currently closed`)
  }

  const fulfilment = await resolveFulfilmentForBranch(input, branch.id)
  const { domainLines, lineMeta } = await priceLines(input.lines, { requireAvailable: true })
  const packagingPerUnitKobo = await loadPackagingFeeKobo()

  let reward = null
  if (input.rewardApplied) {
    if (!input.userId) throw badRequest('only a signed-in customer can redeem a reward')
    reward = await findAvailableRewardForUser(input.userId, now)
    if (!reward) throw badRequest('no reward is available to redeem')
  }

  const quote = quoteOrder({
    lines: domainLines,
    fulfilment,
    packagingPerUnitKobo,
    rewardApplied: reward !== null,
  })

  try {
    const orderDTO = await db.transaction(async (tx) => {
      let order: OrderRow | undefined
      for (let attempt = 1; !order; attempt++) {
        try {
          order = await insertOrder(tx, {
            orderNumber: generateOrderNumber(now),
            userId: input.userId,
            branchId: branch.id,
            fulfilment: input.fulfilment,
            zoneId: fulfilment.kind === 'delivery' ? fulfilment.zoneId : null,
            addressText: input.fulfilment === 'delivery' ? input.addressText : null,
            status: 'pending_payment',
            subtotalKobo: quote.subtotalKobo,
            packagingKobo: quote.packagingKobo,
            deliveryFeeKobo: quote.deliveryFeeKobo,
            discountKobo: quote.discountKobo,
            totalKobo: quote.totalKobo,
            idempotencyKey,
          })
        } catch (error) {
          const violated = uniqueViolation(error)
          if (violated === 'orders_order_number_unique' && attempt < MAX_ORDER_NUMBER_ATTEMPTS) continue
          throw error
        }
      }

      const items: Array<{ row: OrderItemRow; options: OrderItemOptionRow[] }> = []
      for (let i = 0; i < domainLines.length; i++) {
        const line = domainLines[i]
        const meta = lineMeta[i]
        const quotedLine = quote.lines[i]
        if (!line || !meta || !quotedLine) throw new Error('invariant: order line data missing')

        const itemRow = await insertOrderItem(tx, {
          orderId: order.id,
          menuItemId: meta.menuItemId,
          nameSnapshot: meta.name,
          unitPriceKobo: quotedLine.unitPriceKobo,
          quantity: line.quantity,
          lineTotalKobo: quotedLine.lineTotalKobo,
        })

        const optionRows = await insertOrderItemOptions(
          tx,
          line.options.map((option) => ({
            orderItemId: itemRow.id,
            optionId: option.id,
            nameSnapshot: option.name,
            surchargeKobo: option.surchargeKobo,
          })),
        )

        items.push({ row: itemRow, options: optionRows })
      }

      await insertOrderStatusEvent(tx, {
        orderId: order.id,
        fromStatus: null,
        toStatus: 'pending_payment',
        actor: input.userId ?? 'guest',
      })

      if (reward) {
        const redeemed = await redeemReward(tx, reward.id, order.id, now)
        if (!redeemed) throw conflict('the selected reward is no longer available')
      }

      return toOrderDTOFromFresh(order, items)
    })

    return { order: orderDTO, created: true }
  } catch (error) {
    if (uniqueViolation(error) === 'orders_idempotency_key_idx') {
      // Raced with another request carrying the same idempotency key, which
      // committed first. Return what it created rather than erroring.
      const raced = await findOrderByIdempotencyKey(idempotencyKey)
      if (raced) return { order: toOrderDTOFromExisting(raced), created: false }
    }
    throw error
  }
}
