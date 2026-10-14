import { PRICE_BANDS, toTitleFilters } from './listing-search'
import type { ListingFacet, ListingSearch } from './listing-search'
import { useTitleCounts, useTitleFacets } from '@/api/titles'
import type { TitleFacets } from '@/api/titles'
import type { FacetOption } from '@/components/filters/facet-option'
import { useLanguageName } from '@/i18n/format'
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
 * at most one request per facet in use, and only while it is. Languages come
 * the same way; the facets have no price counts, so each price band is one
 * cheap GET /titles (only its total), under every filter but the price.
 */
export function useListingFacets(
  search: ListingSearch,
  label: (facet: ListingFacet, value: string, apiLabel: string) => string,
) {
  const languageName = useLanguageName()
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
  const withoutLanguage = useTitleFacets(
    toTitleFilters(search, 'language'),
    search.language !== '',
  )

  // any price, each band, and a typed-in limit when there is one
  const priceLimits: Array<number | undefined> = [undefined, ...PRICE_BANDS]
  if (search.priceMax !== undefined && !priceLimits.includes(search.priceMax))
    priceLimits.push(search.priceMax)
  const withoutPrice = toTitleFilters(search, 'priceMax')
  const priceTotals = useTitleCounts(
    priceLimits.map((max) => ({
      ...withoutPrice,
      priceMax: max === undefined ? undefined : Math.round(max * 100),
    })),
  )

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

  /**
   * The languages the titles are in (the facets', not the site's own locales),
   * each counted under the other filters, named in the reader's language.
   */
  const languageOptions = (): Array<FacetOption> => {
    const picked = splitList(search.language)
    const source = picked.length > 0 ? withoutLanguage.data : base.data
    const listed = (source?.languages ?? []).map((language) => ({
      value: language.value,
      label: languageName(language.value),
      count: language.count,
    }))
    for (const code of picked)
      if (!listed.some((option) => option.value === code))
        listed.push({ value: code, label: languageName(code), count: 0 })
    return listed
  }

  /** Titles up to this price (whole units; undefined: any) under the other filters. */
  const priceCount = (max: number | undefined) =>
    priceTotals[priceLimits.indexOf(max)]?.data

  return {
    options,
    languageOptions: languageOptions(),
    priceCount,
    isPending: base.isPending,
  }
}
