import { toTitleFilters } from './listing-search'
import type { ListingFacet, ListingSearch } from './listing-search'
import { useTitleFacets } from '@/api/titles'
import type { TitleFacets } from '@/api/titles'
import type { FacetOption } from '@/components/filters/facet-option'
import { splitList } from '@/lib/search-params'

const RESPONSE_KEY: Record<ListingFacet, keyof TitleFacets> = {
  genre: 'genres',
  system: 'ruleSystems',
  type: 'types',
  format: 'formats',
  publisher: 'publishers',
}

/**
 * Each facet's options with counts. GET /titles/facets counts under every
 * filter, the facet's own picks included, which would leave only the picked
 * values. So a facet with picks is counted by a second request without them:
 * at most one request per facet in use, and only while it is.
 */
export function useListingFacets(
  search: ListingSearch,
  label: (facet: ListingFacet, value: string, apiLabel: string) => string,
) {
  const base = useTitleFacets(toTitleFilters(search))
  const without = {
    genre: useTitleFacets(toTitleFilters(search, 'genre'), search.genre !== ''),
    system: useTitleFacets(
      toTitleFilters(search, 'system'),
      search.system !== '',
    ),
    type: useTitleFacets(toTitleFilters(search, 'type'), search.type !== ''),
    format: useTitleFacets(
      toTitleFilters(search, 'format'),
      search.format !== '',
    ),
    publisher: useTitleFacets(
      toTitleFilters(search, 'publisher'),
      search.publisher !== '',
    ),
  }

  const options = (facet: ListingFacet): Array<FacetOption> => {
    const picked = splitList(search[facet])
    const source = picked.length > 0 ? without[facet].data : base.data
    const values = source?.[RESPONSE_KEY[facet]] ?? []
    const listed = values.map((value) => ({
      value: value.value,
      label: label(facet, value.value, value.label),
      count: value.count,
    }))
    // a picked value the other filters rule out stays listed, at 0
    for (const value of picked)
      if (!listed.some((option) => option.value === value))
        listed.push({ value, label: label(facet, value, value), count: 0 })
    return listed
  }

  return { options, isPending: base.isPending }
}
