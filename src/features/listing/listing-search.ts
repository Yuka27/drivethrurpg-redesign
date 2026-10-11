import { z } from 'zod'

import type { TitleFilters, TitleSort } from '@/api/titles'
import { listParam, splitList } from '@/lib/search-params'

export const LISTING_SORTS = [
  'match',
  'bestselling',
  'newest',
  'price_asc',
  'price_desc',
] as const
export type ListingSort = (typeof LISTING_SORTS)[number]

/** The multi-select facets the API counts, in the sidebar's order. */
export const LISTING_FACETS = ['system', 'type', 'format', 'publisher'] as const
export type ListingFacet = (typeof LISTING_FACETS)[number]

/** Figma "Price": bands, as the highest price (in whole currency units). */
export const PRICE_BANDS = [0, 5, 10, 20, 50] as const

/** What the listing opens on. Figma: "Sort: Best Match", cards. Defaults stay out of the URL. */
export const LISTING_SEARCH_DEFAULTS = {
  onSale: false,
  system: '',
  type: '',
  format: '',
  publisher: '',
  language: '',
  priceMax: undefined as number | undefined,
  sort: 'match' as ListingSort,
  view: 'grid' as 'grid' | 'list',
  page: 1,
}

/**
 * /titles?system=osr,d20_5e&priceMax=10&onSale=true&sort=newest&view=list&page=2.
 * Filters, sort, view and page live in the URL (Back, reload and shared links
 * keep them); anything invalid falls back to its default.
 */
export const ListingSearchSchema = z.object({
  onSale: z.boolean().default(false).catch(false),
  system: listParam.default(''),
  type: listParam.default(''),
  format: listParam.default(''),
  publisher: listParam.default(''),
  /** content languages, as GET /meta/locales codes: ?language=pl,de */
  language: listParam.default(''),
  priceMax: z.number().min(0).optional().catch(undefined),
  sort: z.enum(LISTING_SORTS).default('match').catch('match'),
  view: z.enum(['grid', 'list']).default('grid').catch('grid'),
  page: z.number().int().min(1).default(1).catch(1),
})
export type ListingSearch = z.infer<typeof ListingSearchSchema>

/** The API's filters for this search; `except` leaves one facet out (for its counts). */
export function toTitleFilters(
  search: ListingSearch,
  except?: ListingFacet,
): TitleFilters {
  return {
    onSale: search.onSale,
    system: except === 'system' ? undefined : search.system,
    type: except === 'type' ? undefined : search.type,
    format: except === 'format' ? undefined : search.format,
    publisher: except === 'publisher' ? undefined : search.publisher,
    language: search.language,
    // the API takes minor units of the display currency
    priceMax:
      search.priceMax === undefined
        ? undefined
        : Math.round(search.priceMax * 100),
  }
}

/** "Best match" is the API's own order: no sort parameter. */
export const toTitleSort = (sort: ListingSort): TitleSort | undefined =>
  sort === 'match' ? undefined : sort

/** Everything that narrows the list, cleared; sort and view stay. */
export const CLEARED_FILTERS = {
  onSale: false,
  system: '',
  type: '',
  format: '',
  publisher: '',
  language: '',
  priceMax: undefined,
  page: 1,
} satisfies Partial<ListingSearch>

export const activeFilterCount = (search: ListingSearch) =>
  (search.onSale ? 1 : 0) +
  (search.priceMax === undefined ? 0 : 1) +
  splitList(search.language).length +
  LISTING_FACETS.reduce(
    (sum, facet) => sum + splitList(search[facet]).length,
    0,
  )
