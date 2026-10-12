import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  HeartIcon,
  LayoutGridIcon,
  ListIcon,
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
  toTitleCard,
  useAddWishlistToCart,
  useWishlist,
} from '@/api/wishlist'
import type { WishlistItem } from '@/api/wishlist'
import { AppliedFilters } from '@/components/filters/applied-filters'
import { FilterSheet } from '@/components/filters/filter-sheet'
import { QuickFilters } from '@/components/filters/quick-filters'
import { OptionSelect } from '@/components/site/option-select'
import { Pagination } from '@/components/site/pagination'
import { RecentlyViewed } from '@/components/title/recently-viewed'
import { TitleCard } from '@/components/title/title-card'
import { TitleRow } from '@/components/title/title-row'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ListingFilterPanel } from '@/features/listing/listing-filter-panel'
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

/** Figma: 4 × 5 cards (2 × 10 on phones), as on the listing. */
const PAGE_SIZE = 20

/** What "Add all" and "Add sale titles" can still add: not owned, not in the cart. */
const addable = (items: Array<WishlistItem>) =>
  items
    .filter((item) => !item.owned && !item.inCart)
    .map((item) => item.titleId)

/**
 * /wishlist (Figma "Wishlist"): the listing's layout and filters over the
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
  const pageItems = shown.slice(from - 1, to).map(toTitleCard)
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
    languages: false,
  }
  const sortLabel = (sort: WishlistSort) => t(`sorts.${sort}`)

  if (query.isError)
    return (
      <div className="container pt-4 pb-8">
        <p className="text-sm text-destructive">{t('loadError')}</p>
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
              <ToggleGroup
                type="single"
                value={search.view}
                onValueChange={(view) =>
                  view && onSearchChange({ view: view as 'grid' | 'list' })
                }
                aria-label={t('listing:view.label')}
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
                    aria-label={t(`listing:view.${view}`)}
                    className="size-7 min-w-7 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    <Icon aria-hidden />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </>
        )}

        <div
          ref={resultsRef}
          className="flex scroll-mt-4 flex-col gap-4 [grid-area:results]"
        >
          {!query.data ? (
            <ul
              aria-busy
              aria-label={t('heading')}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3 xl:grid-cols-4"
            >
              {Array.from({ length: 8 }, (_, index) => (
                <li
                  key={index}
                  className="h-[340px] animate-pulse rounded-xl bg-card lg:h-[414px]"
                />
              ))}
            </ul>
          ) : items.length === 0 ? (
            <EmptyWishlist />
          ) : pageItems.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl bg-card p-6">
              <p className="text-sm">{t('listing:noResults')}</p>
              <Button variant="outline" size="sm" onClick={clearAll}>
                {t('listing:clearFilters')}
              </Button>
            </div>
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

/** Figma "mini banner": how many saved titles are on sale, and adding them. */
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

function EmptyWishlist() {
  const { t } = useTranslation('wishlist')
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-card px-4 py-10 text-center">
      <HeartIcon aria-hidden className="size-8 text-muted-foreground" />
      <p className="font-bold">{t('empty.title')}</p>
      <p className="text-sm text-muted-foreground">{t('empty.text')}</p>
      <Button asChild className="rounded-lg">
        <Link to="/titles">{t('empty.browse')}</Link>
      </Button>
    </div>
  )
}
