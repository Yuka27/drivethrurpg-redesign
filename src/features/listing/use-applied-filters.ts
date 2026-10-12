import { useTranslation } from 'react-i18next'

import { LISTING_FACETS } from './listing-search'
import type { FilterPatch, FilterSearch, ListingFacet } from './listing-search'
import { usePriceLabel } from './use-price-label'
import type { AppliedFilter } from '@/components/filters/applied-filters'
import type { FacetOption } from '@/components/filters/facet-option'
import { useLanguageName } from '@/i18n/format'
import { joinList, splitList } from '@/lib/search-params'

/**
 * The filters that are on, as removable chips ("Rule System: OSR"), and
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

  const applied: Array<AppliedFilter> = [
    ...(search.onSale
      ? [
          {
            key: 'onSale',
            label: `${t('groups.promotions')}: ${t('onSale')}`,
            onRemove: () => onSearchChange({ onSale: false, page: 1 }),
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
        onRemove: () => togglePick(facet, value),
      })),
    ),
    ...(search.priceMax === undefined
      ? []
      : [
          {
            key: 'price',
            label: `${t('groups.price')}: ${priceLabel(search.priceMax)}`,
            onRemove: () => onSearchChange({ priceMax: undefined, page: 1 }),
          },
        ]),
    ...splitList(search.language).map((code) => ({
      key: `language:${code}`,
      label: `${t('groups.language')}: ${languageName(code)}`,
      onRemove: () =>
        onSearchChange({
          language: joinList(
            splitList(search.language).filter((item) => item !== code),
          ),
          page: 1,
        }),
    })),
  ]

  return { applied, togglePick }
}
