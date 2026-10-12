import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from './section-heading'
import { assetUrl } from '@/api/client'
import { useTitles } from '@/api/titles'
import { TitlePrice } from '@/components/title/title-price'
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
  const titles = useTitles({ priceMax: MAX * 100 }, { page: 1, pageSize: 8 })
    .data?.items
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
            <Link
              to="/titles/$titleId"
              params={{ titleId: title.id }}
              className="group flex flex-col overflow-hidden rounded-xl border border-muted bg-card"
            >
              <span className="block h-[200px] bg-muted">
                {title.cover && (
                  <img
                    src={assetUrl(title.cover.url)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="flex flex-col px-3 py-2">
                <span className="truncate text-sm group-hover:underline">
                  {title.title}
                </span>
                <TitlePrice
                  title={title}
                  className="flex-row-reverse justify-end text-xs"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
