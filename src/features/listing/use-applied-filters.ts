import { useTranslation } from 'react-i18next'

import { LISTING_FACETS } from './listing-search'
import type { FilterPatch, FilterSearch, ListingFacet } from './listing-search'
import { usePriceLabel } from './use-price-label'
import type { AppliedFilter } from '@/components/filters/applied-filters'
import type { FacetOption } from '@/components/filters/facet-option'
import { useLanguageName } from '@/i18n/format'
import { joinList, splitList } from '@/lib/search-params'

/**
 * The filters that are on, as removable chips ("Rule System: OSR") and as
 * `removals` (each with the search without it, for "loosen one"), and
 * `togglePick` to turn one facet value on or off. Shared by the listing and
 * the wishlist, which use the same filters.
 */
export function useAppliedFilters(
  search: FilterSearch,
  onSearchChange: (patch: FilterPatch) => void,
  options: (facet: ListingFacet) => Array<FacetOption>,
) {
  const { t } = useTranslation('listing')
  const languageName = useLanguageName()
  const priceLabel = usePriceLabel()

  const withoutPick = (facet: ListingFacet, value: string): FilterPatch => ({
    [facet]: joinList(
      splitList(search[facet]).filter((item) => item !== value),
    ),
  })
  const togglePick = (facet: ListingFacet, value: string) => {
    const picked = splitList(search[facet])
    onSearchChange({
      [facet]: joinList(
        picked.includes(value)
          ? picked.filter((item) => item !== value)
          : [...picked, value],
      ),
      page: 1,
    })
  }

  // every filter that is on, and what the search is without it
  const removals: Array<{ key: string; label: string; patch: FilterPatch }> = [
    ...(search.onSale
      ? [
          {
            key: 'onSale',
            label: `${t('groups.promotions')}: ${t('onSale')}`,
            patch: { onSale: false },
          },
        ]
      : []),
    ...LISTING_FACETS.flatMap((facet) =>
      splitList(search[facet]).map((value) => ({
        key: `${facet}:${value}`,
        label: `${t(`groups.${facet}`)}: ${
          options(facet).find((option) => option.value === value)?.label ??
          value
        }`,
        patch: withoutPick(facet, value),
      })),
    ),
    ...(search.priceMax === undefined
      ? []
      : [
          {
            key: 'price',
            label: `${t('groups.price')}: ${priceLabel(search.priceMax)}`,
            patch: { priceMax: undefined },
          },
        ]),
    ...splitList(search.language).map((code) => ({
      key: `language:${code}`,
      label: `${t('groups.language')}: ${languageName(code)}`,
      patch: {
        language: joinList(
          splitList(search.language).filter((item) => item !== code),
        ),
      },
    })),
  ]

  // as removable chips: "Rule System: OSR"
  const applied: Array<AppliedFilter> = removals.map(
    ({ key, label, patch }) => ({
      key,
      label,
      onRemove: () => onSearchChange({ ...patch, page: 1 }),
    }),
  )

  return { applied, removals, togglePick }
}
