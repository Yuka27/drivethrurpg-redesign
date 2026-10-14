import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from './section-heading'
import type { Publisher } from '@/api/publishers'
import { useHomePublishers } from '@/api/titles'
import { PublisherLogo } from '@/components/site/publisher-logo'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Eight logos in a row on desktop; phones scroll through them all. */
const SHOWN = 8

const STRIP_CLASS =
  '-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-8 lg:overflow-visible'

/**
 * "Browse by Publisher": logo tiles of the publishers GET /home lists, which
 * are only those with their own logo, in its order.
 */
export function PublisherStrip() {
  const { t } = useTranslation('home')
  const publishers = useHomePublishers()
  if (publishers.isPending) return <PublisherStripSkeleton />
  if (!publishers.data?.length) return null

  return (
    <section aria-labelledby="publishers" className="flex flex-col gap-4">
      <SectionHeading id="publishers">{t('publishers')}</SectionHeading>
      <ul className={STRIP_CLASS}>
        {publishers.data.map((publisher, index) => (
          <PublisherTile
            key={publisher.id}
            publisher={publisher}
            className={cn(index >= SHOWN && 'lg:hidden')}
          />
        ))}
      </ul>
    </section>
  )
}

function PublisherTile({
  publisher,
  className,
}: {
  publisher: Publisher
  className?: string
}) {
  return (
    <li className={cn('shrink-0 snap-start lg:min-w-0', className)}>
      <Link
        to="/titles"
        search={{ publisher: publisher.id }}
        aria-label={publisher.name}
        title={publisher.name}
        className="flex size-[140px] overflow-hidden rounded-xl border border-muted bg-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:aspect-square lg:size-auto"
      >
        {/* the tile is the frame: the logo fills it, contained, without its own */}
        <PublisherLogo
          name={publisher.name}
          url={publisher.logo?.url}
          className="size-full rounded-none border-0 bg-transparent object-contain p-3 text-2xl"
        />
      </Link>
    </li>
  )
}

/** The strip's outline while the publishers load. */
function PublisherStripSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <Skeleton className="h-7 w-48" />
      <div className={STRIP_CLASS}>
        {Array.from({ length: SHOWN }, (_, index) => (
          <Skeleton
            key={index}
            className="size-[140px] shrink-0 rounded-xl lg:aspect-square lg:size-auto"
          />
        ))}
      </div>
    </div>
  )
}
