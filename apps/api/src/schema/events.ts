import { relations } from 'drizzle-orm'
import { boolean, index, pgEnum, pgTable, smallint, text } from 'drizzle-orm/pg-core'
import { users } from './identity.ts'
import { createdAt, id, idRef, kobo, optionalIdRef, timestamps, tstz } from './_shared.ts'

export const enquiryStatus = pgEnum('enquiry_status', [
  'new',
  'quoted',
  'accepted',
  'declined',
  'cancelled',
])
export type EnquiryStatus = (typeof enquiryStatus.enumValues)[number]

export const services = pgTable('services', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  summary: text('summary').notNull(),
  basePriceKobo: kobo('base_price_kobo'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const enquiries = pgTable(
  'enquiries',
  {
    id: id(),
    userId: optionalIdRef('user_id', () => users.id),
    serviceId: idRef('service_id', () => services.id, 'restrict'),
    contactName: text('contact_name').notNull(),
    phone: text('phone').notNull(),
    eventDate: tstz('event_date').notNull(),
    guestCount: smallint('guest_count').notNull(),
    location: text('location').notNull(),
    notes: text('notes'),
    status: enquiryStatus('status').notNull().default('new'),
    ...timestamps,
  },
  (t) => [index('enquiries_user_idx').on(t.userId), index('enquiries_service_idx').on(t.serviceId)],
)

export const quotes = pgTable(
  'quotes',
  {
    id: id(),
    enquiryId: idRef('enquiry_id', () => enquiries.id),
    totalKobo: kobo('total_kobo').notNull(),
    depositKobo: kobo('deposit_kobo').notNull(),
    validUntil: tstz('valid_until').notNull(),
    acceptedAt: tstz('accepted_at'),
    ...timestamps,
  },
  (t) => [index('quotes_enquiry_idx').on(t.enquiryId)],
)

export const quoteLineItems = pgTable(
  'quote_line_items',
  {
    id: id(),
    quoteId: idRef('quote_id', () => quotes.id),
    description: text('description').notNull(),
    unitPriceKobo: kobo('unit_price_kobo').notNull(),
    quantity: smallint('quantity').notNull(),
    lineTotalKobo: kobo('line_total_kobo').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('quote_line_items_quote_idx').on(t.quoteId)],
)

export const servicesRelations = relations(services, ({ many }) => ({
  enquiries: many(enquiries),
}))

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  user: one(users, { fields: [enquiries.userId], references: [users.id] }),
  service: one(services, { fields: [enquiries.serviceId], references: [services.id] }),
  quotes: many(quotes),
}))

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  enquiry: one(enquiries, { fields: [quotes.enquiryId], references: [enquiries.id] }),
  lineItems: many(quoteLineItems),
}))

export const quoteLineItemsRelations = relations(quoteLineItems, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLineItems.quoteId], references: [quotes.id] }),
}))
