import { useTranslation } from 'react-i18next'

import { facetOptions, statusCounts } from './library-filters'
import { LIBRARY_FACETS, LIBRARY_STATUSES } from './library-search'
import type {
  LibraryFacet,
  LibrarySearch,
  LibraryStatus,
} from './library-search'
import type { LibraryItem } from '@/api/library'
import { CheckboxFacet } from '@/components/filters/checkbox-facet'
import { FilterGroup } from '@/components/filters/filter-group'
import { RadioFacet } from '@/components/filters/radio-facet'
import { joinList, splitList } from '@/lib/search-params'

/** The long facets get a search box: rule systems and publishers. */
const SEARCH_BOX = {
  system: {
    label: 'searchFacet.system',
    placeholder: 'searchFacet.systemPlaceholder',
  },
  publisher: {
    label: 'searchFacet.publisher',
    placeholder: 'searchFacet.publisherPlaceholder',
  },
} as const satisfies Partial<Record<LibraryFacet, object>>
const searchKeys = (facet: LibraryFacet) =>
  facet in SEARCH_BOX ? SEARCH_BOX[facet as keyof typeof SEARCH_BOX] : null

/** Status and the four facets, for the desktop sidebar and the mobile sheet alike. */
export function LibraryFilterPanel({
  items,
  search,
  onSearchChange,
  variant,
}: {
  /** the whole library: options and counts come from it */
  items: Array<LibraryItem>
  search: LibrarySearch
  onSearchChange: (patch: Partial<LibrarySearch>) => void
  variant: 'sidebar' | 'sheet'
}) {
  const { t } = useTranslation(['library', 'listing'])
  const counts = statusCounts(items, search)

  const label = (facet: LibraryFacet, value: string, item: LibraryItem) =>
    facet === 'publisher'
      ? (item.publisher?.name ?? value)
      : // a value without a translation shows as the API spells it, tidied
        t(`listing:facets.${facet}.${value}`, {
          defaultValue: value.replaceAll('_', ' '),
        })

  return (
    <div className="flex flex-col gap-2">
      <FilterGroup
        title={t('status.title')}
        variant={variant}
        // the sheet opens on Status; the rest start closed there
        defaultOpen
      >
        <RadioFacet
          label={t('status.title')}
          value={search.status}
          onChange={(status) =>
            onSearchChange({ status: status as LibraryStatus, page: 1 })
          }
          options={LIBRARY_STATUSES.map((status) => ({
            value: status,
            label: t(`status.${status}`),
            count: counts[status],
          }))}
        />
      </FilterGroup>

      {LIBRARY_FACETS.map((facet) => {
        const selected = splitList(search[facet])
        const options = facetOptions(items, search, facet, (value, item) =>
          label(facet, value, item),
        )
        if (options.length === 0) return null
        const keys = searchKeys(facet)
        return (
          <FilterGroup
            key={facet}
            title={t(`facets.${facet}`)}
            selectedCount={selected.length}
            variant={variant}
          >
            <CheckboxFacet
              options={options}
              selected={selected}
              onChange={(values) =>
                onSearchChange({ [facet]: joinList(values), page: 1 })
              }
              search={
                keys
                  ? { label: t(keys.label), placeholder: t(keys.placeholder) }
                  : undefined
              }
            />
          </FilterGroup>
        )
      })}
    </div>
  )
}
