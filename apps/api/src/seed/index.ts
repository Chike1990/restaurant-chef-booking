import { eq } from 'drizzle-orm'
import { naira } from '@golden-spoon/shared'
import { closeDatabase, db } from '../db.ts'
import * as s from '../schema/index.ts'

const ADMIN_EMAIL = 'admin@goldenspooncuisine.com'

type OptionSpec = { name: string; surchargeNaira?: number }

type OptionGroupSpec = {
  name: string
  isRequired: boolean
  minSelections: number
  maxSelections: number
  options: OptionSpec[]
}

type MenuItemSpec = {
  name: string
  priceNaira: number
  isQuickAdd?: boolean
  description?: string
  optionGroups?: OptionGroupSpec[]
}

type CategorySpec = {
  name: string
  sortOrder: number
  items: MenuItemSpec[]
}

const PROTEIN_OPTIONS: OptionSpec[] = [
  { name: 'None' },
  { name: 'Beef', surchargeNaira: 800 },
  { name: 'Chicken', surchargeNaira: 1000 },
  { name: 'Goat meat', surchargeNaira: 1500 },
  { name: 'Fish', surchargeNaira: 1500 },
  { name: 'Assorted', surchargeNaira: 2000 },
]

/** A main dish: picking a protein is part of ordering the dish. */
const requiredProtein = (): OptionGroupSpec => ({
  name: 'Protein',
  isRequired: true,
  minSelections: 1,
  maxSelections: 1,
  options: PROTEIN_OPTIONS,
})

/** A grill that already names its protein (goat, croaker…) — this is an
 *  optional top-up, so "None" doesn't make sense here. */
const extraProtein = (): OptionGroupSpec => ({
  name: 'Extra protein',
  isRequired: false,
  minSelections: 0,
  maxSelections: 1,
  options: PROTEIN_OPTIONS.filter((option) => option.name !== 'None'),
})

const SWALLOW_GROUP: OptionGroupSpec = {
  name: 'Swallow',
  isRequired: true,
  minSelections: 1,
  maxSelections: 1,
  options: [{ name: 'Pounded yam' }, { name: 'Eba' }, { name: 'Semovita' }, { name: 'Akpu' }],
}

const EXTRA_WRAP_GROUP: OptionGroupSpec = {
  name: 'Extra wrap',
  isRequired: false,
  minSelections: 0,
  maxSelections: 1,
  options: [{ name: 'Extra wrap', surchargeNaira: 500 }],
}

const PORTION_GROUP: OptionGroupSpec = {
  name: 'Portion',
  isRequired: true,
  minSelections: 1,
  maxSelections: 1,
  options: [{ name: 'Regular' }, { name: 'Large', surchargeNaira: 1200 }],
}

const CATEGORIES: CategorySpec[] = [
  {
    name: 'Soups & Swallows',
    sortOrder: 1,
    items: [
      { name: 'Ofe onugbu', priceNaira: 4800, optionGroups: [SWALLOW_GROUP, EXTRA_WRAP_GROUP, requiredProtein()] },
      { name: 'Oha soup', priceNaira: 5000, optionGroups: [SWALLOW_GROUP, EXTRA_WRAP_GROUP, requiredProtein()] },
      { name: 'Egusi soup', priceNaira: 4800, optionGroups: [SWALLOW_GROUP, EXTRA_WRAP_GROUP, requiredProtein()] },
      { name: 'Ogbono soup', priceNaira: 4500, optionGroups: [SWALLOW_GROUP, EXTRA_WRAP_GROUP, requiredProtein()] },
      {
        name: 'Nsala with catfish',
        priceNaira: 6500,
        optionGroups: [SWALLOW_GROUP, EXTRA_WRAP_GROUP, requiredProtein()],
      },
    ],
  },
  {
    name: 'Rice',
    sortOrder: 2,
    items: [
      { name: 'Smoky party jollof', priceNaira: 4500, optionGroups: [PORTION_GROUP, requiredProtein()] },
      { name: 'Fried rice', priceNaira: 4800, optionGroups: [PORTION_GROUP, requiredProtein()] },
      { name: 'White rice & stew', priceNaira: 4000, optionGroups: [PORTION_GROUP, requiredProtein()] },
    ],
  },
  {
    name: 'Local Favourites',
    sortOrder: 3,
    items: [
      { name: 'Abacha & ugba', priceNaira: 3800 },
      { name: 'Nkwobi', priceNaira: 5800 },
      { name: 'Isi ewu', priceNaira: 7500 },
      { name: 'Beans & plantain', priceNaira: 3500 },
    ],
  },
  {
    name: 'Grills & Sides',
    sortOrder: 4,
    items: [
      { name: 'Grilled chicken (quarter)', priceNaira: 3500, optionGroups: [extraProtein()] },
      { name: 'Peppered goat meat', priceNaira: 4000, optionGroups: [extraProtein()] },
      { name: 'Grilled croaker', priceNaira: 6500, optionGroups: [extraProtein()] },
      { name: 'Fried plantain', priceNaira: 1200 },
      { name: 'Coleslaw', priceNaira: 800 },
    ],
  },
  {
    name: 'Small Chops',
    sortOrder: 5,
    items: [
      { name: 'Puff-puff (10)', priceNaira: 1500 },
      { name: 'Samosa (4)', priceNaira: 2000 },
      { name: 'Spring rolls (4)', priceNaira: 2000 },
      { name: 'Small chops platter', priceNaira: 6500 },
    ],
  },
  {
    name: 'Bakery',
    sortOrder: 6,
    items: [
      { name: 'Meat pie', priceNaira: 1000 },
      {
        name: 'Celebration cake, 6-inch',
        priceNaira: 18500,
        isQuickAdd: false,
        description: 'Made to order — allow 48 hours notice.',
      },
    ],
  },
  {
    name: 'Drinks',
    sortOrder: 7,
    items: [
      { name: 'Zobo 50cl', priceNaira: 1000 },
      { name: 'Chapman', priceNaira: 1500 },
      { name: 'Bottled water', priceNaira: 400 },
      { name: 'Soft drink 35cl', priceNaira: 600 },
    ],
  },
]

const BRANCHES = [
  { name: 'Awka', address: 'Aroma Junction', isMain: true },
  { name: 'Oko', address: 'Federal Polytechnic Road', isMain: false },
  { name: 'Onitsha', address: 'Upper Iweka', isMain: false },
  { name: 'Ufuma', address: 'Town Centre', isMain: false },
  { name: 'Asaba', address: 'Nnebisi Road', isMain: false },
]

/** Mon–Sat hours, and Sunday hours — `null` means closed Sunday. */
const HOURS: Record<string, { monSat: [string, string]; sunday: [string, string] | null }> = {
  Awka: { monSat: ['08:00', '21:00'], sunday: ['10:00', '20:00'] },
  Oko: { monSat: ['08:00', '20:00'], sunday: null },
  Onitsha: { monSat: ['08:00', '21:00'], sunday: ['10:00', '20:00'] },
  Ufuma: { monSat: ['09:00', '19:00'], sunday: null },
  Asaba: { monSat: ['08:00', '21:00'], sunday: ['10:00', '20:00'] },
}

const AWKA_ZONES = [
  { name: 'Aroma', feeNaira: 800 },
  { name: 'Ifite', feeNaira: 1000 },
  { name: 'Temp Site', feeNaira: 1000 },
  { name: 'Regina Caeli', feeNaira: 1000 },
  { name: 'Unizik Junction', feeNaira: 1000 },
  { name: 'Okpuno', feeNaira: 1200 },
  { name: 'Agu-Awka', feeNaira: 1200 },
  { name: 'Nkwelle', feeNaira: 1300 },
  { name: 'Amawbia', feeNaira: 1500 },
  { name: 'Udoka Estate', feeNaira: 1500 },
]

const SERVICES = [
  { name: 'Catering', slug: 'catering', summary: 'Catering for events of any size.' },
  {
    name: 'Celebration cakes & bakery',
    slug: 'celebration-cakes-bakery',
    summary: 'Custom cakes and bakery for birthdays, weddings and more.',
  },
  {
    name: 'Small chops & surprise packages',
    slug: 'small-chops-surprise-packages',
    summary: 'Small chops platters and surprise packages for any occasion.',
  },
  { name: 'Private chef', slug: 'private-chef', summary: 'A private chef for your event or household.' },
  { name: 'Decoration', slug: 'decoration', summary: 'Event decoration, from intimate to large scale.' },
  { name: 'Ushering', slug: 'ushering', summary: 'Professional ushers for your event.' },
]

async function seed() {
  console.log('seeding…')

  // Children cascade from these deletes: branches -> delivery_zones,
  // opening_hours; categories -> menu_items -> option_groups -> options.
  await db.delete(s.categories)
  await db.delete(s.branches)
  await db.delete(s.services)
  await db.delete(s.settings)
  await db.delete(s.users).where(eq(s.users.email, ADMIN_EMAIL))

  await db.insert(s.settings).values([
    { key: 'packaging_fee_kobo', value: String(naira(200)) },
    { key: 'loyalty_reward_threshold', value: '5' },
    { key: 'loyalty_stamp_rate', value: '1' },
    { key: 'loyalty_reward_expiry_days', value: '60' },
  ])

  const branchRows = await db.insert(s.branches).values(BRANCHES).returning()

  const openingHoursRows = branchRows.flatMap((branch) => {
    const hours = HOURS[branch.name]
    if (!hours) throw new Error(`no hours configured for branch ${branch.name}`)

    const weekdayRows = Array.from({ length: 6 }, (_, i) => ({
      branchId: branch.id,
      dayOfWeek: i + 1,
      opensAt: hours.monSat[0],
      closesAt: hours.monSat[1],
      isClosed: false,
    }))

    const sundayRow = hours.sunday
      ? { branchId: branch.id, dayOfWeek: 0, opensAt: hours.sunday[0], closesAt: hours.sunday[1], isClosed: false }
      : { branchId: branch.id, dayOfWeek: 0, opensAt: null, closesAt: null, isClosed: true }

    return [...weekdayRows, sundayRow]
  })
  await db.insert(s.openingHours).values(openingHoursRows)

  const awka = branchRows.find((branch) => branch.name === 'Awka')
  if (!awka) throw new Error('Awka branch insert returned nothing')

  await db.insert(s.deliveryZones).values(
    AWKA_ZONES.map((zone) => ({
      branchId: awka.id,
      name: zone.name,
      feeKobo: naira(zone.feeNaira),
    })),
  )

  for (const category of CATEGORIES) {
    const [categoryRow] = await db
      .insert(s.categories)
      .values({ name: category.name, sortOrder: category.sortOrder })
      .returning()
    if (!categoryRow) throw new Error(`category insert returned nothing for ${category.name}`)

    for (const item of category.items) {
      const [menuItemRow] = await db
        .insert(s.menuItems)
        .values({
          categoryId: categoryRow.id,
          name: item.name,
          description: item.description,
          basePriceKobo: naira(item.priceNaira),
          isQuickAdd: item.isQuickAdd ?? true,
        })
        .returning()
      if (!menuItemRow) throw new Error(`menu item insert returned nothing for ${item.name}`)

      for (const group of item.optionGroups ?? []) {
        const [optionGroupRow] = await db
          .insert(s.optionGroups)
          .values({
            menuItemId: menuItemRow.id,
            name: group.name,
            isRequired: group.isRequired,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
          })
          .returning()
        if (!optionGroupRow) throw new Error(`option group insert returned nothing for ${group.name}`)

        await db.insert(s.options).values(
          group.options.map((option) => ({
            optionGroupId: optionGroupRow.id,
            name: option.name,
            surchargeKobo: naira(option.surchargeNaira ?? 0),
          })),
        )
      }
    }
  }

  await db.insert(s.services).values(SERVICES)

  await db.insert(s.users).values({
    email: ADMIN_EMAIL,
    // TODO(block 4): replace with a real argon2 hash once auth lands.
    passwordHash: 'TODO-not-a-real-hash',
    fullName: 'Golden Spoon Admin',
    phone: '+2348000000000',
    role: 'admin',
  })
}

seed()
  .then(() => console.log('done'))
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(closeDatabase)
