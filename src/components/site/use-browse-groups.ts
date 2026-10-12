import { useTranslation } from 'react-i18next'

import { useTitleFacets } from '@/api/titles'
import type { TitleFacets } from '@/api/titles'
import type { ListingFacet } from '@/features/listing/listing-search'

/** Figma's order: Publisher, Genre, Product Type, Rule System, Format. */
const GROUPS = [
  ['publisher', 'publishers'],
  ['genre', 'genres'],
  ['type', 'types'],
  ['system', 'ruleSystems'],
  ['format', 'formats'],
] as const satisfies ReadonlyArray<readonly [ListingFacet, keyof TitleFacets]>

/** Enough to scan in a dropdown; "Browse all titles" leads to the rest. */
const SHOWN = 10

export type BrowseGroup = {
  facet: ListingFacet
  title: string
  options: Array<{ value: string; label: string; count: number }>
}

/**
 * The header's "browse" menus (desktop dropdowns, mobile accordions): each
 * facet's values with the most titles, from GET /titles/facets, each a link to
 * the listing filtered by it. A facet the API returns empty (Genre, until the
 * API has genres) is left out.
 */
export function useBrowseGroups(): Array<BrowseGroup> {
  const { t } = useTranslation('listing')
  const facets = useTitleFacets({}).data
  if (!facets) return []

  return GROUPS.map(([facet, key]) => ({
    facet,
    title: t(`groups.${facet}`),
    options: facets[key].slice(0, SHOWN).map((value) => ({
      value: value.value,
      label:
        facet === 'publisher'
          ? value.label
          : t(`facets.${facet}.${value.value}`, { defaultValue: value.label }),
      count: value.count,
    })),
  })).filter((group) => group.options.length > 0)
}
