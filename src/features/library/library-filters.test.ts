import { describe, expect, it } from 'vite-plus/test'

import { libraryItem, search } from '@/test/library'
import {
  activeFilterCount,
  facetOptions,
  filterLibrary,
  sortLibrary,
  statusCounts,
} from './library-filters'

const items = [
  libraryItem('a', {
    name: 'Ashes',
    ruleSystem: 'osr',
    formats: ['pdf', 'vtt'],
    hasUpdate: true,
    purchasedAt: '2026-07-01T00:00:00Z',
  }),
  libraryItem('b', {
    name: 'Brine',
    ruleSystem: 'd20_5e',
    publisher: { id: 'pub_chaosium', name: 'Chaosium Inc.' },
    giftFrom: { displayName: 'Jon' },
    purchasedAt: '2026-08-01T00:00:00Z',
  }),
  libraryItem('c', {
    name: 'Cinder',
    ruleSystem: 'pathfinder',
    type: 'setting',
    purchasedAt: '2026-06-01T00:00:00Z',
    lastUpdatedAt: '2026-09-01T00:00:00Z',
  }),
]
const names = (list: typeof items) => list.map((item) => item.title.name)

describe('filterLibrary', () => {
  it('ORs values within a facet and ANDs the facets', () => {
    expect(
      names(filterLibrary(items, search({ system: 'osr,d20_5e' }))),
    ).toEqual(['Ashes', 'Brine'])
    expect(
      names(
        filterLibrary(
          items,
          search({
            system: 'osr,d20_5e',
            type: 'adventure',
            publisher: 'pub_chaosium',
          }),
        ),
      ),
    ).toEqual(['Brine'])
  })

  it('filters by status', () => {
    expect(names(filterLibrary(items, search({ status: 'updated' })))).toEqual([
      'Ashes',
    ])
    expect(names(filterLibrary(items, search({ status: 'gifts' })))).toEqual([
      'Brine',
    ])
  })

  it('matches any of the formats an item comes in', () => {
    expect(names(filterLibrary(items, search({ format: 'vtt' })))).toEqual([
      'Ashes',
    ])
  })

  it('searches titles, publishers and file names, ignoring case', () => {
    expect(names(filterLibrary(items, search({ q: 'CHAOSIUM' })))).toEqual([
      'Brine',
    ])
    expect(names(filterLibrary(items, search({ q: 'c.pdf' })))).toEqual([
      'Cinder',
    ])
  })
})

describe('sortLibrary', () => {
  it('sorts by purchase, update, title or publisher', () => {
    expect(names(sortLibrary(items, 'added'))).toEqual([
      'Brine',
      'Ashes',
      'Cinder',
    ])
    // an item never updated counts from its purchase
    expect(names(sortLibrary(items, 'updated'))).toEqual([
      'Cinder',
      'Brine',
      'Ashes',
    ])
    expect(names(sortLibrary(items, 'title'))).toEqual([
      'Ashes',
      'Brine',
      'Cinder',
    ])
    expect(names(sortLibrary(items, 'publisher'))).toEqual([
      'Brine',
      'Ashes',
      'Cinder',
    ])
  })
})

describe('facet counts', () => {
  it('count each value under the other filters, not the facet’s own picks', () => {
    const options = facetOptions(
      items,
      search({ system: 'osr', status: 'all' }),
      'system',
      (value) => value,
    )
    // picking OSR does not zero its siblings
    expect(options.map(({ value, count }) => [value, count])).toEqual([
      ['d20_5e', 1],
      ['osr', 1],
      ['pathfinder', 1],
    ])
  })

  it('keep a picked value listed when nothing matches it', () => {
    const options = facetOptions(
      items,
      search({ status: 'gifts', system: 'osr' }),
      'system',
      (value) => value,
    )
    expect(options.find((option) => option.value === 'osr')?.count).toBe(0)
  })

  it('count statuses under the facets', () => {
    expect(statusCounts(items, search({ system: 'osr,d20_5e' }))).toEqual({
      all: 2,
      updated: 1,
      gifts: 1,
    })
  })

  it('counts the filters that are on', () => {
    expect(activeFilterCount(search())).toBe(0)
    expect(
      activeFilterCount(
        search({ status: 'gifts', system: 'osr,d20_5e', q: 'x' }),
      ),
    ).toBe(3)
  })
})
