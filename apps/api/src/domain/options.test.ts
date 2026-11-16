import { describe, expect, it } from 'vitest'
import { validateSelection, type OptionGroupSpec } from './options.ts'

const swallow: OptionGroupSpec = {
  id: 'g-swallow',
  name: 'Swallow',
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  optionIds: ['pounded-yam', 'eba', 'semovita', 'akpu'],
}

const extraWrap: OptionGroupSpec = {
  id: 'g-wrap',
  name: 'Extra wrap',
  isRequired: false,
  minSelect: 0,
  maxSelect: 1,
  optionIds: ['extra-wrap'],
}

const protein: OptionGroupSpec = {
  id: 'g-protein',
  name: 'Protein',
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  optionIds: ['none', 'beef', 'chicken', 'goat', 'fish', 'assorted'],
}

const groups = [swallow, extraWrap, protein]

describe('validateSelection', () => {
  it('accepts a valid selection covering every required group', () => {
    expect(() => validateSelection(groups, ['eba', 'goat'])).not.toThrow()
  })

  it('accepts skipping an optional group', () => {
    expect(() => validateSelection(groups, ['eba', 'goat'])).not.toThrow()
  })

  it('rejects an option id that belongs to no group on this item', () => {
    // e.g. an option id copied from a different dish entirely
    expect(() => validateSelection(groups, ['eba', 'goat', 'other-dish-option'])).toThrow(RangeError)
  })

  it('rejects a required group with no selection', () => {
    expect(() => validateSelection(groups, ['eba'])).toThrow(/Protein/)
  })

  it('rejects a required group below its minimum even when another group is satisfied', () => {
    expect(() => validateSelection([swallow], [])).toThrow(/Swallow/)
  })

  it('rejects exceeding a group’s maximum', () => {
    expect(() => validateSelection(groups, ['eba', 'semovita', 'goat'])).toThrow(/Swallow/)
  })

  it('rejects selecting the same option twice', () => {
    expect(() => validateSelection(groups, ['eba', 'goat', 'goat'])).toThrow(/more than once/)
  })

  it('allows a group that is required but misconfigured with minSelect 0', () => {
    const misconfigured: OptionGroupSpec = { ...protein, minSelect: 0 }
    expect(() => validateSelection([misconfigured], [])).toThrow(/Protein/)
  })

  it('handles an item with no option groups at all', () => {
    expect(() => validateSelection([], [])).not.toThrow()
  })

  it('rejects any selection on an item with no option groups', () => {
    expect(() => validateSelection([], ['anything'])).toThrow(RangeError)
  })
})
