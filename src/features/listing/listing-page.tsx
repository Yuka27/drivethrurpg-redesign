import { LayoutGridIcon, ListIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ListingFilterPanel } from './listing-filter-panel'
import {
  activeFilterCount,
  CLEARED_FILTERS,
  LISTING_FACETS,
  LISTING_SORTS,
  toTitleFilters,
  toTitleSort,
} from './listing-search'
import type { ListingFacet, ListingSearch, ListingSort } from './listing-search'
import { PromoBanner } from '@/components/site/promo-banner'
import { useListingFacets } from './use-listing-facets'
import { usePriceLabel } from './use-price-label'
import { useTitles } from '@/api/titles'
import { AppliedFilters } from '@/components/filters/applied-filters'
import type { AppliedFilter } from '@/components/filters/applied-filters'
import { FilterSheet } from '@/components/filters/filter-sheet'
import { QuickFilters } from '@/components/filters/quick-filters'
import { OptionSelect } from '@/components/site/option-select'
import { Pagination } from '@/components/site/pagination'
import { RecentlyViewed } from '@/components/title/recently-viewed'
import { TitleCard } from '@/components/title/title-card'
import { TitleRow } from '@/components/title/title-row'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useFormatNumber, useLanguageName } from '@/i18n/format'
import { joinList, splitList } from '@/lib/search-params'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/** Figma: 4 × 5 cards (2 × 10 on phones). */
const PAGE_SIZE = 20

/** Figma "Quick filters": common picks, one tap on or off. */
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
}: {
  search: ListingSearch
  onSearchChange: (patch: Partial<ListingSearch>) => void
}) {
  const { t } = useTranslation(['listing', 'common'])
  const formatNumber = useFormatNumber()
  const languageName = useLanguageName()
  const priceLabel = usePriceLabel()
  const [sheetOpen, setSheetOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  const titles = useTitles(toTitleFilters(search), {
    sort: toTitleSort(search.sort),
    page: search.page,
    pageSize: PAGE_SIZE,
  })

  const facetLabel = (facet: ListingFacet, value: string, apiLabel: string) =>
    facet === 'publisher'
      ? apiLabel
      : t(`facets.${facet}.${value}`, {
          defaultValue: apiLabel.replaceAll('_', ' '),
        })
  const facets = useListingFacets(search, facetLabel)

  const list = titles.data
  const total = list?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (search.page - 1) * PAGE_SIZE + 1
  const to = Math.min(search.page * PAGE_SIZE, total)

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

  // every value that is on, as a chip: "Rule System: OSR"
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
          facets.options(facet).find((option) => option.value === value)
            ?.label ?? value
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
  const panelProps = { search, onSearchChange, facetOptions: facets.options }
  const sortLabel = (sort: ListingSort) => t(`sorts.${sort}`)

  return (
    <div className="container flex flex-col gap-6 pt-4 pb-8 lg:gap-8">
      {/* desktop "Back to Home": in the header's nav row (SiteNav) */}
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">{t('heading')}</h1>
        <PromoBanner />
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
          // Figma: about two lines of chips on desktop, one chip on phones
          shown={isDesktop ? 9 : 1}
          className="[grid-area:applied] empty:hidden"
        />

        <aside
          aria-label={t('common:filters.title')}
          className="self-start [grid-area:sidebar] max-lg:hidden"
        >
          <ListingFilterPanel {...panelProps} variant="sidebar" />
        </aside>

        <QuickFilters
          filters={quick}
          className="[grid-area:quick] max-lg:hidden"
        />

        <p className="self-center text-xs text-muted-foreground [grid-area:showing]">
          {list &&
            t('showing', {
              from: formatNumber(from),
              to: formatNumber(to),
              total: formatNumber(total),
            })}
        </p>

        <div className="flex items-center gap-2 [grid-area:controls]">
          <div className="lg:hidden">
            <FilterSheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              activeCount={activeFilterCount(search)}
              resultCount={total}
              onClearAll={clearAll}
            >
              <ListingFilterPanel {...panelProps} variant="sheet" />
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
          <ToggleGroup
            type="single"
            value={search.view}
            onValueChange={(view) =>
              view && onSearchChange({ view: view as 'grid' | 'list' })
            }
            aria-label={t('view.label')}
            className="gap-0"
          >
            {(
              [
                ['grid', LayoutGridIcon],
                ['list', ListIcon],
              ] as const
            ).map(([view, Icon]) => (
              <ToggleGroupItem
                key={view}
                value={view}
                aria-label={t(`view.${view}`)}
                className="size-7 min-w-7 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <Icon aria-hidden />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div
          ref={resultsRef}
          className="flex scroll-mt-4 flex-col gap-4 [grid-area:results]"
        >
          {titles.isError ? (
            <p className="text-sm text-destructive">{t('loadError')}</p>
          ) : !list ? (
            <ul
              aria-busy
              aria-label={t('heading')}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 lg:gap-3"
            >
              {Array.from({ length: 8 }, (_, index) => (
                <li
                  key={index}
                  className="h-[340px] animate-pulse rounded-xl bg-card lg:h-[414px]"
                />
              ))}
            </ul>
          ) : list.items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl bg-card p-6">
              <p className="text-sm">{t('noResults')}</p>
              {activeFilterCount(search) > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  {t('clearFilters')}
                </Button>
              )}
            </div>
          ) : search.view === 'list' ? (
            <ul aria-label={t('heading')} className="flex flex-col gap-3">
              {list.items.map((title) => (
                <TitleRow key={title.id} title={title} />
              ))}
            </ul>
          ) : (
            <ul
              aria-label={t('heading')}
              className="grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-3 xl:grid-cols-4 lg:gap-3"
            >
              {list.items.map((title) => (
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
