import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useTitleFacets, useTitles } from '@/api/titles'
import { Button } from '@/components/ui/button'
import { useFormatNumber } from '@/i18n/format'

/** Figma "mini banner": how big the catalogue is, and the way into it. */
export function CatalogBanner() {
  const { t } = useTranslation('home')
  const formatNumber = useFormatNumber()
  // one title is enough to learn the total
  const total = useTitles({}, { page: 1, pageSize: 1 }).data?.total
  const systems = useTitleFacets({}).data?.ruleSystems.length

  return (
    <section
      aria-labelledby="catalog"
      className="flex flex-col gap-3 rounded-2xl border border-muted bg-linear-to-r from-card to-primary/20 px-8 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-2"
    >
      <div className="flex flex-col gap-0.5">
        {total !== undefined && systems !== undefined && (
          <p className="text-xs text-muted-foreground">
            {t('catalog.stats', {
              titles: formatNumber(total),
              systems: formatNumber(systems),
            })}
          </p>
        )}
        <h2
          id="catalog"
          className="font-sans text-base leading-6 font-semibold"
        >
          {t('catalog.heading')}
        </h2>
      </div>
      <Button asChild className="h-9 rounded-lg max-lg:w-full">
        <Link to="/titles">
          {t('catalog.browse')}
          <ArrowRightIcon aria-hidden />
        </Link>
      </Button>
    </section>
  )
}
