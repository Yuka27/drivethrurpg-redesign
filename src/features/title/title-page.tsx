import { Link, useLocation } from '@tanstack/react-router'
import { SearchXIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AlsoBought } from './also-bought'
import { BuyCard } from './buy-card'
import { DetailsSection } from './details-section'
import { OverviewSection } from './overview-section'
import { ProductStickyNav } from './product-sticky-nav/product-sticky-nav'
import {
  SECTIONS,
  useScrollSpy,
  useScrollToSection,
} from './product-sticky-nav/use-scroll-spy'
import type { Section } from './product-sticky-nav/use-scroll-spy'
import { FollowCard, PublisherCard } from './publisher-cards'
import { ReviewsSection } from './reviews-section'
import { TitleHeader } from './title-header'
import { TitleUnavailable } from './title-unavailable'
import { chosenEdition, defaultSku } from './use-buy'
import { ApiError } from '@/api/client'
import { useTitle, useTitleDiscussions, useTitleReviews } from '@/api/titles'
import {
  EmptyActions,
  EmptyState,
  ErrorState,
} from '@/components/site/empty-state'
import { RecentlyViewed } from '@/components/title/recently-viewed'
import { LoadingStatus } from '@/components/site/loading-status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useRecentlyViewed } from '@/stores/recently-viewed'

const isSection = (hash: string): hash is Section =>
  (SECTIONS as ReadonlyArray<string>).includes(hash)

/**
 * /titles/$titleId. Desktop: the title and its sections on the left, the buy,
 * publisher, follow and "Customers also bought" cards on the right. Phones: one
 * column, the buy cards right after the header, "also bought" last. Each part is
 * rendered once; `contents` + `order` rearrange them. Above it all, under the
 * site header, the sticky menu (breadcrumb, then the product bar); its tabs
 * and the in-page ones follow the reader's position (scroll-spy).
 */
export function TitlePage({ titleId }: { titleId: string }) {
  const { t } = useTranslation('title')
  const title = useTitle(titleId)
  const reviews = useTitleReviews(titleId).data
  const discussions = useTitleDiscussions(titleId).data
  const record = useRecentlyViewed((state) => state.record)
  // the chosen edition, shared by the buy box and the sticky bar
  const [pickedSku, setPickedSku] = useState<string>()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const edgeRef = useRef<HTMLDivElement>(null)
  const active = useScrollSpy(edgeRef)
  const { scrollTo, onSectionClick } = useScrollToSection()
  const hash = useLocation({ select: (location) => location.hash })

  // for "Recently Viewed" (home, listing, other product pages)
  const loaded = title.data
  useEffect(() => {
    if (loaded)
      record({
        id: loaded.id,
        title: loaded.title,
        coverUrl: loaded.cover?.url ?? null,
      })
  }, [loaded, record])

  // opened at /titles/x#reviews: go there once the sections exist
  const hashHandled = useRef(false)
  useEffect(() => {
    if (!loaded || hashHandled.current) return
    hashHandled.current = true
    if (isSection(hash)) scrollTo(hash, false)
  }, [loaded, hash, scrollTo])

  if (title.isError) {
    const missing =
      title.error instanceof ApiError && title.error.status === 404
    return (
      <div className="container py-10">
        {missing ? (
          <EmptyState as="h1" icon={<SearchXIcon />} title={t('notFound')}>
            <EmptyActions>
              <Button asChild className="rounded-lg">
                <Link to="/titles">{t('browse')}</Link>
              </Button>
            </EmptyActions>
          </EmptyState>
        ) : (
          <ErrorState
            title={t('loadErrorTitle')}
            onRetry={() => void title.refetch()}
          />
        )}
      </div>
    )
  }

  const data = title.data
  if (!data) return <TitlePageSkeleton />

  // withdrawn from sale: say so, keep an owner's copy in view, offer others
  if (!data.available) return <TitleUnavailable title={data} />

  const discussionCount = (reviews?.total ?? 0) + (discussions?.total ?? 0)
  const sku = pickedSku ?? defaultSku(data)
  const { edition, owned } = chosenEdition(data, sku)

  return (
    <>
      <ProductStickyNav
        title={data}
        edition={edition}
        owned={owned}
        headingRef={headingRef}
        edgeRef={edgeRef}
        active={active}
        onSectionClick={onSectionClick}
      />
      <div className="container flex flex-col gap-6 pt-4 pb-8 lg:gap-8">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_379px] lg:items-start lg:gap-8">
          <div className="contents lg:flex lg:flex-col lg:gap-6">
            <div className="order-1">
              <TitleHeader title={data} headingRef={headingRef} />
            </div>

            <nav
              aria-label={t('tabs.label')}
              className="order-3 border-b border-muted"
            >
              <ul className="flex">
                {SECTIONS.map((id) => (
                  <li key={id} className="max-sm:flex-1">
                    <a
                      href={`#${id}`}
                      aria-current={active === id ? 'true' : undefined}
                      onClick={onSectionClick(id)}
                      className={cn(
                        'flex h-8 items-center justify-center border-b-2 px-2 text-sm whitespace-nowrap',
                        active === id
                          ? 'border-primary font-medium text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {id === 'reviews'
                        ? reviews && discussions
                          ? t('tabs.reviews', { count: discussionCount })
                          : t('stickyNav.reviews')
                        : t(`tabs.${id}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="order-4 flex flex-col gap-8">
              <OverviewSection title={data} />
              <DetailsSection title={data} />
              <ReviewsSection title={data} />
            </div>
          </div>

          <aside
            aria-label={t('aside')}
            className="contents lg:flex lg:flex-col lg:gap-2"
          >
            <div className="order-2 flex flex-col gap-2">
              <BuyCard title={data} sku={sku} onSkuChange={setPickedSku} />
              {data.publisher && (
                <>
                  <PublisherCard
                    publisherId={data.publisher.id}
                    name={data.publisher.name}
                  />
                  <FollowCard
                    publisherId={data.publisher.id}
                    name={data.publisher.name}
                  />
                </>
              )}
            </div>
            <div className="order-5">
              <AlsoBought titleId={data.id} ruleSystem={data.ruleSystem} />
            </div>
          </aside>
        </div>

        <RecentlyViewed exclude={data.id} />
      </div>
    </>
  )
}

/** The product page's outline while GET /titles/{id} loads. */
function TitlePageSkeleton() {
  return (
    <div className="container flex flex-col gap-6 pt-4 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_379px] lg:items-start lg:gap-8">
      <LoadingStatus />
      <div aria-hidden className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
          <Skeleton className="h-[245px] w-[190px] shrink-0 rounded-xl" />
          <div className="flex w-full flex-col items-center gap-3 py-2 lg:items-start lg:px-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-[22px] w-20" />
              <Skeleton className="h-[22px] w-24" />
            </div>
          </div>
        </div>
        <div className="flex gap-4 border-b border-muted pb-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>
      <div aria-hidden className="flex flex-col gap-2">
        <div className="flex flex-col gap-4 rounded-xl bg-card p-4">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-card px-4 py-1">
          <Skeleton className="size-20 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-[22px] w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}
