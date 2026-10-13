import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from './section-heading'
import { useTitles } from '@/api/titles'
import { ShelfCard } from '@/components/title/shelf-card'
import { ShelfSkeleton } from '@/components/title/title-skeletons'
import { usePriceLabel } from '@/features/listing/use-price-label'
import { cn } from '@/lib/utils'

/** Figma (phones): "Under $5", then links to the next bands. */
const MAX = 5
const MORE = [10, 20] as const

/** Figma mobile: cheap titles sliding sideways, and "See more: under $10 / under $20". */
export function UnderPrice({ className }: { className?: string }) {
  const { t } = useTranslation('home')
  const priceLabel = usePriceLabel()
  // the API takes minor units
  const query = useTitles({ priceMax: MAX * 100 }, { page: 1, pageSize: 8 })
  const titles = query.data?.items
  if (query.isPending) return <ShelfSkeleton className={className} />
  if (!titles?.length) return null

  return (
    <section
      aria-labelledby="under-price"
      className={cn('flex flex-col gap-4', className)}
    >
      <SectionHeading
        id="under-price"
        action={
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {t('seeMore')}
            <span className="flex overflow-hidden rounded-lg border border-border">
              {MORE.map((max) => (
                <Link
                  key={max}
                  to="/titles"
                  search={{ priceMax: max }}
                  className="flex h-8 items-center bg-background px-2.5 font-medium text-primary not-last:border-r not-last:border-border hover:bg-accent"
                >
                  {priceLabel(max).toLocaleLowerCase()}
                </Link>
              ))}
            </span>
          </span>
        }
      >
        {priceLabel(MAX)}
      </SectionHeading>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {titles.map((title) => (
          <li key={title.id} className="w-[200px] shrink-0 snap-start">
            <ShelfCard title={title} />
          </li>
        ))}
      </ul>
    </section>
  )
}
