import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from './section-heading'
import { assetUrl } from '@/api/client'
import type { TitleSummary } from '@/api/titles'
import { DealBadges } from '@/components/title/deal-badges'
import { LoadingStatus } from '@/components/site/loading-status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Figma desktop: two wide tiles, then two half-height ones stacked. */
const DESKTOP = 4

const TILES_CLASS =
  '-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 lg:mx-0 lg:grid lg:h-[162px] lg:grid-cols-[402fr_402fr_370fr] lg:grid-rows-2 lg:gap-x-3 lg:gap-y-2 lg:overflow-visible lg:p-0'
const tileClass = (index: number) =>
  cn(
    'h-[162px] w-[318px] shrink-0 snap-start lg:h-auto lg:w-auto lg:min-w-0',
    index < 2 && 'lg:row-span-2',
    index >= DESKTOP && 'lg:hidden',
  )

/**
 * Figma "Discounts & Promos": cover tiles with the discount and price, sliding
 * sideways on phones. The tiles are the API's "On sale" titles (the mockup's
 * campaign art and labels have no API), so the title is there for screen
 * readers only, as in the mockup.
 */
export function PromoTiles({ titles }: { titles: Array<TitleSummary> }) {
  const { t } = useTranslation('home')
  if (titles.length === 0) return null

  return (
    <section aria-labelledby="promos" className="flex flex-col gap-4">
      <SectionHeading
        id="promos"
        action={
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
        }
      >
        {t('promos')}
      </SectionHeading>
      <ul className={TILES_CLASS}>
        {titles.map((title, index) => (
          <li key={title.id} className={tileClass(index)}>
            <Link
              to="/titles/$titleId"
              params={{ titleId: title.id }}
              className="group relative flex size-full overflow-hidden rounded-xl border border-muted bg-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {title.cover && (
                <img
                  src={assetUrl(title.cover.url)}
                  alt=""
                  className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none"
                />
              )}
              <span className="sr-only">{title.title}</span>
              <DealBadges title={title} className="relative mt-auto p-2" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
      <ul aria-hidden className={TILES_CLASS}>
        {Array.from({ length: DESKTOP }, (_, index) => (
          <li key={index} className={tileClass(index)}>
            <Skeleton className="size-full rounded-xl" />
          </li>
        ))}
      </ul>
    </div>
  )
}
