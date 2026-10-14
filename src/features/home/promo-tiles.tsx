import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from './section-heading'
import { assetUrl } from '@/api/client'
import { useHomePromos } from '@/api/titles'
import type { Promo } from '@/api/titles'
import { AppAnchor } from '@/components/site/app-anchor'
import { IconTooltip } from '@/components/site/icon-tooltip'
import { LoadingStatus } from '@/components/site/loading-status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormatDate } from '@/i18n/format'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { cn } from '@/lib/utils'

/** A desktop page: two tall tiles, then two half-height ones stacked. */
const PAGE = 4

/** Phones: one row of every tile. Desktop: a row of pages, one in view. */
const SCROLLER_CLASS =
  '-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 lg:mx-0 lg:p-0 lg:[scrollbar-width:none]'
/** Phones: no box of its own (its tiles join the row); desktop: the grid. */
const PAGE_CLASS =
  'max-lg:contents lg:grid lg:h-[162px] lg:w-full lg:shrink-0 lg:snap-start lg:grid-cols-[402fr_402fr_370fr] lg:grid-rows-2 lg:gap-x-3 lg:gap-y-2'
/** A tile spans both rows unless it shares the last column with another. */
const tall = (index: number, count: number) =>
  index < 2 || (index === 2 && count === 3)
const tileClass = (index: number, count: number) =>
  cn(
    'h-[162px] w-[318px] shrink-0 snap-start lg:h-auto lg:w-auto lg:min-w-0',
    tall(index, count) && 'lg:row-span-2',
  )

/** The promos four at a time: one desktop page each. */
const pagesOf = (promos: Array<Promo>) =>
  Array.from({ length: Math.ceil(promos.length / PAGE) }, (_, page) =>
    promos.slice(page * PAGE, page * PAGE + PAGE),
  )

/**
 * "Discounts & Promos": the GET /home campaigns, each on its art (the URL as
 * the API gives it) with its label, discount, title and end date. Desktop
 * shows four at a time (of three, the last one tall); more become pages with
 * previous/next buttons. Phones slide sideways through them all. Its outline
 * while GET /home loads.
 */
export function PromoTiles() {
  const { t } = useTranslation('home')
  const promos = useHomePromos()
  const reducedMotion = useReducedMotion()
  const scroller = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  if (promos.isPending) return <PromoTilesSkeleton />
  if (!promos.data?.length) return null

  const pages = pagesOf(promos.data)
  const goTo = (next: number) => {
    const box = scroller.current
    const target = box?.children[next]
    if (!box || !(target instanceof HTMLElement)) return
    box.scrollTo({
      left: target.offsetLeft - box.offsetLeft,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }
  const arrow = (direction: 'previous' | 'next') => (
    <IconTooltip label={t(`promo.${direction}`)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={t(`promo.${direction}`)}
        disabled={
          direction === 'previous' ? page === 0 : page >= pages.length - 1
        }
        onClick={() => goTo(page + (direction === 'previous' ? -1 : 1))}
        className="size-8 rounded-lg"
      >
        {direction === 'previous' ? (
          <ChevronLeftIcon aria-hidden />
        ) : (
          <ChevronRightIcon aria-hidden />
        )}
      </Button>
    </IconTooltip>
  )

  return (
    <section aria-labelledby="promos" className="flex flex-col gap-4">
      <SectionHeading
        id="promos"
        action={
          <div className="flex items-center gap-2">
            {pages.length > 1 && (
              // phones swipe through every tile instead
              <div className="flex gap-1 max-lg:hidden">
                {arrow('previous')}
                {arrow('next')}
              </div>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
            >
              <Link to="/titles" search={{ onSale: true }}>
                {t('viewMore')}
              </Link>
            </Button>
          </div>
        }
      >
        {t('promos')}
      </SectionHeading>
      <div
        ref={scroller}
        // the page in view, for the buttons (a tab to a tile moves it too)
        onScroll={(event) => {
          const { scrollLeft, clientWidth } = event.currentTarget
          setPage(Math.round(scrollLeft / Math.max(clientWidth, 1)))
        }}
        className={SCROLLER_CLASS}
      >
        {pages.map((items, index) => (
          <ul
            key={items[0].id}
            aria-label={
              pages.length > 1
                ? t('promo.page', { index: index + 1, total: pages.length })
                : undefined
            }
            className={PAGE_CLASS}
          >
            {items.map((promo, position) => (
              <li key={promo.id} className={tileClass(position, items.length)}>
                <PromoTile
                  promo={promo}
                  compact={!tall(position, items.length)}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  )
}

/** `compact`: a half-height desktop tile, with the discount and title only. */
function PromoTile({ promo, compact }: { promo: Promo; compact: boolean }) {
  const { t } = useTranslation('home')
  const formatDate = useFormatDate({ day: 'numeric', month: 'short' })

  return (
    <AppAnchor
      href={promo.link}
      className="group relative isolate flex size-full overflow-hidden rounded-xl border border-muted bg-black outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {promo.art && (
        <img
          src={assetUrl(promo.art.url)}
          // the words are on the tile: the art is decoration
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-10 size-full object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 from-20% to-transparent to-80%"
      />
      {/* always over dark art: the dark theme's colours, in both themes */}
      <div
        className={cn(
          'dark mt-auto flex min-w-0 flex-col items-start gap-1 p-3 text-white',
          compact && 'lg:gap-0.5 lg:p-2',
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {promo.discountLabel && (
            <span className="rounded-sm bg-update px-1.5 py-0.5 text-xs font-bold text-update-foreground">
              {promo.discountLabel}
            </span>
          )}
          {promo.label && (
            <span
              className={cn(
                'text-xs font-semibold text-white/80 uppercase',
                compact && 'lg:hidden',
              )}
            >
              {promo.label}
            </span>
          )}
        </div>
        <span
          className={cn(
            'font-heading text-lg leading-6 font-bold',
            compact && 'lg:text-base lg:leading-5',
          )}
        >
          {promo.title}
        </span>
        {(promo.subtitle || promo.endsAt) && (
          <span
            className={cn(
              'max-w-full truncate text-xs text-white/80',
              compact && 'lg:hidden',
            )}
          >
            {[
              promo.subtitle,
              promo.endsAt &&
                t('promo.endsAt', { date: formatDate(promo.endsAt) }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
      </div>
    </AppAnchor>
  )
}

/** The tiles' outline while GET /home loads. */
export function PromoTilesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <LoadingStatus />
      <div aria-hidden className="flex items-center justify-between">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div aria-hidden className={SCROLLER_CLASS}>
        <ul className={PAGE_CLASS}>
          {Array.from({ length: PAGE }, (_, index) => (
            <li key={index} className={tileClass(index, PAGE)}>
              <Skeleton className="size-full rounded-xl" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
