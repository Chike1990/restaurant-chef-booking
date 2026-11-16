import { findCategoriesWithItems } from '../repo/menu.ts'

export type MenuOptionDTO = {
  id: string
  name: string
  surchargeKobo: number
  isAvailable: boolean
}

export type MenuOptionGroupDTO = {
  id: string
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  options: MenuOptionDTO[]
}

export type MenuItemDTO = {
  id: string
  name: string
  description: string | null
  basePriceKobo: number
  imageUrl: string | null
  isAvailable: boolean
  isQuickAdd: boolean
  optionGroups: MenuOptionGroupDTO[]
}

export type MenuCategoryDTO = {
  id: string
  name: string
  items: MenuItemDTO[]
}

export type MenuResponse = {
  categories: MenuCategoryDTO[]
}

/** Shapes the menu for the client. Unavailable items and options are kept,
 *  not filtered out, so the UI can render "sold out" instead of a dish that
 *  mysteriously disappears. */
export async function getMenu(): Promise<MenuResponse> {
  const categories = await findCategoriesWithItems()

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: category.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        basePriceKobo: item.basePriceKobo,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        isQuickAdd: item.isQuickAdd,
        optionGroups: item.optionGroups.map((group) => ({
          id: group.id,
          name: group.name,
          isRequired: group.isRequired,
          minSelect: group.minSelections,
          maxSelect: group.maxSelections,
          options: group.options.map((option) => ({
            id: option.id,
            name: option.name,
            surchargeKobo: option.surchargeKobo,
            isAvailable: option.isAvailable,
          })),
        })),
      })),
    })),
  }
}
