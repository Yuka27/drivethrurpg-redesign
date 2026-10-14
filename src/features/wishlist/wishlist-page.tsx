import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  FunnelIcon,
  HeartIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ShareDialog } from './share-dialog'
import { facetOptions, filterWishlist } from './wishlist-filters'
import { WISHLIST_SORTS } from './wishlist-search'
import type { WishlistSearch, WishlistSort } from './wishlist-search'
import {
  isOnSale,
  toTitleSummary,
  useAddWishlistToCart,
  useWishlist,
} from '@/api/wishlist'
import type { WishlistItem } from '@/api/wishlist'
import { useTitles } from '@/api/titles'
import { AppliedFilters } from '@/components/filters/applied-filters'
import { FilterPanelSkeleton } from '@/components/filters/filter-panel-skeleton'
import { FilterSheet } from '@/components/filters/filter-sheet'
import { QuickFilters } from '@/components/filters/quick-filters'
import {
  EmptyActions,
  EmptyLabel,
  EmptyState,
  ErrorState,
} from '@/components/site/empty-state'
import { CoverLinks } from '@/components/title/cover-links'
import { OptionSelect } from '@/components/site/option-select'
import { Pagination } from '@/components/site/pagination'
import { RecentlyViewed } from '@/components/title/recently-viewed'
import { TitleCard } from '@/components/title/title-card'
import { TitleRow } from '@/components/title/title-row'
import { TitleResultsSkeleton } from '@/components/title/title-skeletons'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ListingFilterPanel } from '@/features/listing/listing-filter-panel'
import { ViewToggle } from '@/features/listing/view-toggle'
import {
  activeFilterCount,
  CLEARED_FILTERS,
} from '@/features/listing/listing-search'
import type { ListingFacet } from '@/features/listing/listing-search'
import { useAppliedFilters } from '@/features/listing/use-applied-filters'
import { useFormatNumber } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/** 4 × 5 cards (2 × 10 on phones), as on the listing. */
const PAGE_SIZE = 20

/** What "Add all" and "Add sale titles" can still add: not owned, not in the cart. */
const addable = (items: Array<WishlistItem>) =>
  items
    .filter((item) => !item.owned && !item.inCart)
    .map((item) => item.titleId)

/**
 * /wishlist: the listing's layout and filters over the
 * saved titles. The API only pages, so the whole wishlist loads once and is
 * filtered, counted, sorted and paged here (as the library is). Above it:
 * Share, "Add all to cart" and, when some titles are on sale, a banner to add
 * those.
 */
export function WishlistPage({
  search,
  onSearchChange,
}: {
  search: WishlistSearch
  onSearchChange: (patch: Partial<WishlistSearch>) => void
}) {
  const { t } = useTranslation(['wishlist', 'listing', 'common'])
  const formatNumber = useFormatNumber()
  const facetLabel = useFacetLabel()
  const isDesktop = useIsDesktop()
  const [sheetOpen, setSheetOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const query = useWishlist()
  const items = query.data?.items ?? []

  const label =
    (facet: ListingFacet) => (value: string, item: WishlistItem | undefined) =>
      facet === 'publisher'
        ? (item?.publisher?.name ?? value)
        : facet === 'genre'
          ? value
          : facetLabel(facet, value)
  const options = (facet: ListingFacet) =>
    facetOptions(items, search, facet, label(facet))
  const { applied } = useAppliedFilters(search, onSearchChange, options)

  const shown = filterWishlist(items, search)
  const total = shown.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(search.page, pageCount)
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const pageItems = shown.slice(from - 1, to).map(toTitleSummary)
  const sale = items.filter(isOnSale)

  const quick = [
    {
      key: 'onSale',
      label: t('listing:onSale'),
      active: search.onSale,
      onToggle: () => onSearchChange({ onSale: !search.onSale, page: 1 }),
    },
    {
      key: 'free',
      label: t('listing:price.free'),
      active: search.priceMax === 0,
      onToggle: () =>
        onSearchChange({
          priceMax: search.priceMax === 0 ? undefined : 0,
          page: 1,
        }),
    },
  ]

  const clearAll = () => onSearchChange(CLEARED_FILTERS)
  const panelProps = {
    search,
    onSearchChange,
    facetOptions: options,
  }
  const sortLabel = (sort: WishlistSort) => t(`sorts.${sort}`)

  if (query.isError)
    return (
      <div className="container pt-4 pb-8">
        <ErrorState
          title={t('loadErrorTitle')}
          onRetry={() => void query.refetch()}
          className="rounded-xl bg-card"
        />
      </div>
    )

  return (
    <div className="container flex flex-col gap-6 pt-4 pb-8 lg:gap-8">
      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-4',
          "[grid-template-areas:'head'_'controls'_'applied'_'showing'_'results']",
          'lg:grid-cols-[275px_minmax(0,1fr)_auto] lg:grid-rows-[auto_auto_auto_auto_1fr]',
          "lg:[grid-template-areas:'sidebar_head_head'_'sidebar_quick_quick'_'sidebar_sale_sale'_'sidebar_showing_controls'_'sidebar_results_results']",
        )}
      >
        <div className="flex items-center justify-between gap-4 [grid-area:head]">
          <h1 className="font-sans text-2xl leading-8 font-bold">
            {t('heading')}
          </h1>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <ShareDialog />
              <AddToCartButton
                titleIds={addable(items)}
                variant="outline"
                className="h-8"
              >
                <ShoppingCartIcon aria-hidden />
                {t('addAll')}
              </AddToCartButton>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <>
            <QuickFilters
              filters={quick}
              className="[grid-area:quick] max-lg:hidden"
            />
            {sale.length > 0 && (
              <SaleBanner
                count={sale.length}
                titleIds={addable(sale)}
                className="[grid-area:sale] max-lg:hidden"
              />
            )}
            <AppliedFilters
              filters={applied}
              onClearAll={clearAll}
              shown={isDesktop ? 9 : 1}
              className="[grid-area:applied] empty:hidden lg:hidden"
            />
            <aside
              aria-label={t('common:filters.title')}
              className="self-start [grid-area:sidebar] max-lg:hidden"
            >
              <ListingFilterPanel {...panelProps} variant="sidebar" />
            </aside>
            <p className="self-center text-xs text-muted-foreground [grid-area:showing]">
              {t('listing:showing', {
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
                label={t('listing:sort')}
                value={search.sort}
                options={WISHLIST_SORTS.map((sort) => ({
                  value: sort,
                  label: sortLabel(sort),
                }))}
                onValueChange={(sort) =>
                  onSearchChange({ sort: sort as WishlistSort, page: 1 })
                }
                display={t('listing:sortDisplay', {
                  option: sortLabel(search.sort),
                })}
                className="h-7 text-xs data-[size=default]:h-7 max-lg:ml-auto"
              />
              <ViewToggle
                view={search.view}
                onChange={(view) => onSearchChange({ view })}
              />
            </div>
          </>
        )}

        {query.isPending && (
          <>
            <div className="[grid-area:sidebar] max-lg:hidden">
              <FilterPanelSkeleton variant="sidebar" />
            </div>
            <Skeleton className="h-3 w-40 self-center [grid-area:showing]" />
          </>
        )}

        <div
          ref={resultsRef}
          className="flex scroll-mt-4 flex-col gap-4 [grid-area:results]"
        >
          {!query.data ? (
            <TitleResultsSkeleton view={search.view} label={t('heading')} />
          ) : items.length === 0 ? (
            <EmptyWishlist />
          ) : pageItems.length === 0 ? (
            <EmptyState
              icon={<FunnelIcon />}
              title={t('listing:emptyState.title')}
              text={t('listing:emptyState.text')}
              className="rounded-xl bg-card"
            >
              <EmptyActions>
                <Button onClick={clearAll} className="rounded-lg">
                  {t('listing:emptyState.clearAll')}
                </Button>
              </EmptyActions>
            </EmptyState>
          ) : search.view === 'list' ? (
            <ul aria-label={t('heading')} className="flex flex-col gap-3">
              {pageItems.map((title) => (
                <TitleRow key={title.id} title={title} />
              ))}
            </ul>
          ) : (
            <ul
              aria-label={t('heading')}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3 xl:grid-cols-4"
            >
              {pageItems.map((title) => (
                <TitleCard key={title.id} title={title} />
              ))}
            </ul>
          )}

          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={(next) => {
              onSearchChange({ page: next })
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

/**
 * POST /wishlist/add-to-cart for several titles, then "N titles added" (and
 * how many owned ones were left out) with "View cart". Disabled when there is
 * nothing left to add.
 */
function AddToCartButton({
  titleIds,
  variant,
  className,
  children,
}: {
  titleIds: Array<string>
  variant?: 'outline'
  className?: string
  children: ReactNode
}) {
  const { t } = useTranslation(['wishlist', 'listing'])
  const apiError = useApiError()
  const navigate = useNavigate()
  const add = useAddWishlistToCart()
  const none = titleIds.length === 0

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={none || add.isPending}
      title={none ? t('allInCart') : undefined}
      onClick={() =>
        add.mutate(titleIds, {
          onSuccess: ({ skippedOwned }) => {
            const count = titleIds.length - skippedOwned.length
            toast.success(t('added', { count }), {
              description:
                skippedOwned.length > 0
                  ? t('skippedOwned', { count: skippedOwned.length })
                  : undefined,
              action: {
                label: t('listing:card.viewCart'),
                onClick: () => void navigate({ to: '/cart' }),
              },
            })
          },
          onError: (error) => toast.error(apiError(error)),
        })
      }
      className={cn('rounded-lg', className)}
    >
      {children}
    </Button>
  )
}

/** How many saved titles are on sale, and adding them. */
function SaleBanner({
  count,
  titleIds,
  className,
}: {
  count: number
  titleIds: Array<string>
  className?: string
}) {
  const { t } = useTranslation('wishlist')
  return (
    <section
      aria-label={t('sale.count', { count })}
      className={cn(
        'flex items-center gap-2 rounded-2xl border border-muted bg-linear-to-r from-card to-primary/20 px-6 py-4',
        className,
      )}
    >
      <p className="flex-1 text-sm">
        <strong>{t('sale.count', { count })}</strong> {t('sale.hint')}
      </p>
      <AddToCartButton titleIds={titleIds} className="h-9 px-2.5 text-sm">
        {t('sale.add')}
        <ArrowRightIcon aria-hidden />
      </AddToCartButton>
    </section>
  )
}

/** A few covers to start from: the API has no "popular on wishlists" list. */
const PICKS = 4

/**
 * An empty wishlist: the benefit (sale alerts) in one line, the store,
 * and a few popular titles to start from (the bestsellers).
 */
function EmptyWishlist() {
  const { t } = useTranslation('wishlist')
  const picks = useTitles({}, { sort: 'bestselling', page: 1, pageSize: PICKS })
    .data?.items
  return (
    <EmptyState
      icon={<HeartIcon />}
      title={t('empty.title')}
      text={t('empty.text')}
      className="rounded-xl bg-card"
    >
      <EmptyActions>
        <Button asChild className="rounded-lg">
          <Link to="/titles">{t('empty.browse')}</Link>
        </Button>
      </EmptyActions>
      {picks && picks.length > 0 && (
        <>
          <EmptyLabel id="wishlist-picks">{t('empty.picks')}</EmptyLabel>
          <CoverLinks titles={picks} labelledBy="wishlist-picks" />
        </>
      )}
    </EmptyState>
  )
}
