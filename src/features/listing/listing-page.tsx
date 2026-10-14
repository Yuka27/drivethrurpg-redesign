import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { GenreFollowButton } from './genre-follow-button'
import { ListingEmpty } from './listing-empty'
import { ListingFilterPanel } from './listing-filter-panel'
import { SearchHeader, SearchNoResults } from './search-results'
import {
  activeFilterCount,
  CLEARED_FILTERS,
  LISTING_SORTS,
  toTitleFilters,
  toTitleSort,
} from './listing-search'
import type { ListingFacet, ListingSearch, ListingSort } from './listing-search'
import { PromoBanner } from '@/components/site/promo-banner'
import { useAppliedFilters } from './use-applied-filters'
import { useListingFacets } from './use-listing-facets'
import { ViewToggle } from './view-toggle'
import { useSearchResults } from '@/api/search'
import { useTitles } from '@/api/titles'
import { AppliedFilters } from '@/components/filters/applied-filters'
import { FilterPanelSkeleton } from '@/components/filters/filter-panel-skeleton'
import { FilterSheet } from '@/components/filters/filter-sheet'
import { QuickFilters } from '@/components/filters/quick-filters'
import { ErrorState } from '@/components/site/empty-state'
import { OptionSelect } from '@/components/site/option-select'
import { Pagination } from '@/components/site/pagination'
import { RecentlyViewed } from '@/components/title/recently-viewed'
import { TitleCard } from '@/components/title/title-card'
import { TitleRow } from '@/components/title/title-row'
import { TitleResultsSkeleton } from '@/components/title/title-skeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormatNumber } from '@/i18n/format'
import { splitList } from '@/lib/search-params'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/** 4 × 5 cards (2 × 10 on phones). */
const PAGE_SIZE = 20

/** Quick filters: common picks, one tap on or off. */
const QUICK = [
  { key: 'd20_5e', facet: 'system', value: 'd20_5e' },
  { key: 'year_zero', facet: 'system', value: 'year_zero' },
  { key: 'pdf', facet: 'format', value: 'pdf' },
] as const

/**
 * /titles: the catalogue. Filtering, sorting and paging happen in the API
 * (GET /titles); the facet counts come from GET /titles/facets. Desktop: the
 * filters in a sidebar, applied ones as chips above; phones: a "Filters" sheet.
 */
export function ListingPage({
  search,
  onSearchChange,
  mode = 'catalog',
  onSearch,
}: {
  search: ListingSearch
  onSearchChange: (patch: Partial<ListingSearch>) => void
  /**
   * search: /search?q=, the same page over GET /search (only what matches the
   * words), headed "Results for “q”" instead of the banner
   */
  mode?: 'catalog' | 'search'
  /** a new search ("Did you mean", popular searches) */
  onSearch?: (q: string) => void
}) {
  const { t } = useTranslation(['listing', 'common'])
  const formatNumber = useFormatNumber()
  const [sheetOpen, setSheetOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  const searching = mode === 'search'
  const paging = {
    sort: toTitleSort(search.sort),
    page: search.page,
    pageSize: PAGE_SIZE,
  }
  const catalog = useTitles(toTitleFilters(search), {
    ...paging,
    enabled: !searching,
  })
  const found = useSearchResults(toTitleFilters(search), {
    ...paging,
    enabled: searching,
  })
  const titles = searching ? found : catalog
  // the results' name: the catalogue, or what was searched for
  const resultsLabel = searching
    ? t('search.heading', { q: search.q })
    : t('heading')

  const facetLabel = (facet: ListingFacet, value: string, apiLabel: string) =>
    facet === 'publisher'
      ? apiLabel
      : t(`facets.${facet}.${value}`, {
          defaultValue: apiLabel.replaceAll('_', ' '),
        })
  const facets = useListingFacets(search, facetLabel)

  const results = titles.data
  const total = results?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (search.page - 1) * PAGE_SIZE + 1
  const to = Math.min(search.page * PAGE_SIZE, total)

  const { applied, removals, togglePick } = useAppliedFilters(
    search,
    onSearchChange,
    facets.options,
  )

  const quick = [
    ...QUICK.map(({ key, facet, value }) => ({
      key,
      label: t(`quick.${key}`),
      active: splitList(search[facet]).includes(value),
      onToggle: () => togglePick(facet, value),
    })),
    {
      key: 'free',
      label: t('price.free'),
      active: search.priceMax === 0,
      onToggle: () =>
        onSearchChange({
          priceMax: search.priceMax === 0 ? undefined : 0,
          page: 1,
        }),
    },
  ]

  const clearAll = () => onSearchChange(CLEARED_FILTERS)
  const pickedGenres = splitList(search.genre)
  const panelProps = {
    search,
    onSearchChange,
    facetOptions: facets.options,
    languageOptions: facets.languageOptions,
    priceCount: facets.priceCount,
  }
  const sortLabel = (sort: ListingSort) => t(`sorts.${sort}`)

  return (
    <div className="container flex flex-col gap-6 pt-4 pb-8 lg:gap-8">
      {/* desktop "Back to Home": in the header's nav row (SiteNav) */}
      <div className="flex flex-col gap-4">
        {searching ? (
          <SearchHeader
            q={search.q}
            total={titles.data?.total}
            filtered={activeFilterCount(search) > 0}
          />
        ) : (
          <>
            <h1 className="sr-only">{t('heading')}</h1>
            <PromoBanner />
          </>
        )}
      </div>

      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-4',
          "[grid-template-areas:'controls'_'applied'_'showing'_'results']",
          // the last row takes what the sidebar adds, so the cards start at the top
          'lg:grid-cols-[275px_minmax(0,1fr)_auto] lg:grid-rows-[auto_auto_auto_1fr]',
          "lg:[grid-template-areas:'applied_applied_applied'_'sidebar_quick_quick'_'sidebar_showing_controls'_'sidebar_results_results']",
        )}
      >
        <AppliedFilters
          filters={applied}
          onClearAll={clearAll}
          // about two lines of chips on desktop, one chip on phones
          shown={isDesktop ? 9 : 1}
          className="[grid-area:applied] empty:hidden"
        />

        <aside
          aria-label={t('common:filters.title')}
          className="self-start [grid-area:sidebar] max-lg:hidden"
        >
          {facets.isPending ? (
            <FilterPanelSkeleton variant="sidebar" />
          ) : (
            <ListingFilterPanel {...panelProps} variant="sidebar" />
          )}
        </aside>

        <QuickFilters
          filters={quick}
          className="[grid-area:quick] max-lg:hidden"
        />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 self-center [grid-area:showing]">
          {results ? (
            <p className="text-xs text-muted-foreground">
              {t('showing', {
                from: formatNumber(from),
                to: formatNumber(to),
                total: formatNumber(total),
              })}
            </p>
          ) : (
            <Skeleton className="h-3 w-40" />
          )}
          {/* one genre picked: follow it (several: which one?) */}
          {pickedGenres.length === 1 && (
            <GenreFollowButton genre={pickedGenres[0]} />
          )}
        </div>

        <div className="flex items-center gap-2 [grid-area:controls]">
          <div className="lg:hidden">
            <FilterSheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              activeCount={activeFilterCount(search)}
              resultCount={total}
              onClearAll={clearAll}
            >
              {facets.isPending ? (
                <FilterPanelSkeleton variant="sheet" />
              ) : (
                <ListingFilterPanel {...panelProps} variant="sheet" />
              )}
            </FilterSheet>
          </div>
          <OptionSelect
            label={t('sort')}
            value={search.sort}
            options={LISTING_SORTS.map((sort) => ({
              value: sort,
              label: sortLabel(sort),
            }))}
            onValueChange={(sort) =>
              onSearchChange({ sort: sort as ListingSort, page: 1 })
            }
            display={t('sortDisplay', { option: sortLabel(search.sort) })}
            className="h-7 text-xs data-[size=default]:h-7 max-lg:ml-auto"
          />
          <ViewToggle
            view={search.view}
            onChange={(view) => onSearchChange({ view })}
          />
        </div>

        <div
          ref={resultsRef}
          className="flex scroll-mt-4 flex-col gap-4 [grid-area:results]"
        >
          {titles.isError ? (
            <ErrorState
              title={t('loadError')}
              onRetry={() => void titles.refetch()}
              className="rounded-xl bg-card"
            />
          ) : !results ? (
            <TitleResultsSkeleton view={search.view} label={resultsLabel} />
          ) : results.items.length === 0 &&
            searching &&
            activeFilterCount(search) === 0 ? (
            <SearchNoResults
              q={search.q}
              didYouMean={found.data?.didYouMean}
              onSearch={(q) => onSearch?.(q)}
            />
          ) : results.items.length === 0 ? (
            <ListingEmpty
              search={search}
              removals={removals}
              onSearchChange={onSearchChange}
              onClearAll={clearAll}
            />
          ) : search.view === 'list' ? (
            <ul aria-label={resultsLabel} className="flex flex-col gap-3">
              {results.items.map((title) => (
                <TitleRow key={title.id} title={title} />
              ))}
            </ul>
          ) : (
            <ul
              aria-label={resultsLabel}
              className="grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-3 xl:grid-cols-4 lg:gap-3"
            >
              {results.items.map((title) => (
                <TitleCard key={title.id} title={title} />
              ))}
            </ul>
          )}

          <Pagination
            page={search.page}
            pageCount={pageCount}
            onPageChange={(page) => {
              onSearchChange({ page })
              resultsRef.current?.scrollIntoView({ block: 'start' })
            }}
            className="self-center"
          />
        </div>
      </div>

      <RecentlyViewed />
    </div>
  )
}
