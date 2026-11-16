/**
 * Validates a cart line's option selection against the menu item's option
 * groups. Pure and synchronous — the caller has already loaded the groups
 * for the specific item being ordered.
 */
export type OptionGroupSpec = {
  id: string
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  optionIds: string[]
}

/** Throws a `RangeError` describing the first rule broken. */
export function validateSelection(groups: OptionGroupSpec[], selectedOptionIds: string[]): void {
  const selectedSet = new Set(selectedOptionIds)
  if (selectedSet.size !== selectedOptionIds.length) {
    throw new RangeError('the same option was selected more than once')
  }

  const groupForOption = new Map<string, OptionGroupSpec>()
  for (const group of groups) {
    for (const optionId of group.optionIds) groupForOption.set(optionId, group)
  }

  for (const optionId of selectedOptionIds) {
    if (!groupForOption.has(optionId)) {
      throw new RangeError(`option "${optionId}" does not belong to this item`)
    }
  }

  for (const group of groups) {
    const count = group.optionIds.filter((optionId) => selectedSet.has(optionId)).length
    // A required group must demand at least one selection even if minSelect
    // is misconfigured to 0 — isRequired is the stronger signal.
    const effectiveMin = group.isRequired ? Math.max(1, group.minSelect) : group.minSelect

    if (count < effectiveMin) {
      throw new RangeError(`"${group.name}" requires at least ${effectiveMin} selection(s), got ${count}`)
    }
    if (count > group.maxSelect) {
      throw new RangeError(`"${group.name}" allows at most ${group.maxSelect} selection(s), got ${count}`)
    }
  }
}
