import { describe, expect, it } from 'vite-plus/test'

import {
  activeFilterCount,
  LISTING_SEARCH_DEFAULTS,
  ListingSearchSchema,
  toTitleFilters,
  toTitleSort,
} from './listing-search'
import type { ListingSearch } from './listing-search'

const search = (patch: Partial<ListingSearch> = {}): ListingSearch => ({
  ...LISTING_SEARCH_DEFAULTS,
  ...patch,
})

describe('listing search', () => {
  it('reads the URL, falling back to defaults for anything invalid', () => {
    expect(
      ListingSearchSchema.parse({
        system: 'osr,d20_5e',
        priceMax: 10,
        sort: 'newest',
        view: 'list',
        page: 2,
      }),
    ).toMatchObject({
      system: 'osr,d20_5e',
      priceMax: 10,
      sort: 'newest',
      view: 'list',
      page: 2,
    })

    expect(
      ListingSearchSchema.parse({
        system: 'osr;drop',
        priceMax: -1,
        sort: 'cheapest',
        view: 'table',
        page: 0,
      }),
    ).toEqual(LISTING_SEARCH_DEFAULTS)
  })

  it('turns it into API filters: prices in cents, one facet left out on request', () => {
    const filters = toTitleFilters(
      search({ system: 'osr', format: 'pdf', priceMax: 12.5, onSale: true }),
    )
    expect(filters).toMatchObject({
      system: 'osr',
      format: 'pdf',
      priceMax: 1250,
      onSale: true,
    })
    expect(
      toTitleFilters(search({ system: 'osr' }), 'system').system,
    ).toBeUndefined()
    expect(toTitleFilters(search({ priceMax: 0 })).priceMax).toBe(0)
  })

  it('sends no sort for "Best Match"', () => {
    expect(toTitleSort('match')).toBeUndefined()
    expect(toTitleSort('price_asc')).toBe('price_asc')
  })

  it('counts the filters that are on', () => {
    expect(activeFilterCount(search())).toBe(0)
    expect(
      activeFilterCount(
        search({
          onSale: true,
          system: 'osr,d20_5e',
          priceMax: 0,
          language: 'pl',
        }),
      ),
    ).toBe(5)
  })
})
