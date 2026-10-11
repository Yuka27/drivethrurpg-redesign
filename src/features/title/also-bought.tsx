import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import { useSimilarTitles } from '@/api/titles'
import { TitlePrice } from '@/components/title/title-price'
import { useFacetLabel } from '@/components/title/use-facet-label'

/** Figma: five titles, then a link to more like them. */
const SHOWN = 5

/** Figma "Customers also bought": GET /titles/{id}/similar, and more of the same system. */
export function AlsoBought({
  titleId,
  ruleSystem,
}: {
  titleId: string
  ruleSystem: string | null
}) {
  const { t } = useTranslation('title')
  const facetLabel = useFacetLabel()
  const similar = useSimilarTitles(titleId).data?.slice(0, SHOWN)
  if (!similar?.length) return null

  return (
    <section
      aria-labelledby="also-bought"
      className="flex flex-col rounded-xl bg-card px-4 py-4"
    >
      <h2 id="also-bought" className="px-2 pb-2 font-sans text-base font-bold">
        {t('alsoBought')}
      </h2>
      <ul>
        {similar.map((item) => (
          <li key={item.id} className="border-b border-muted last:border-b-0">
            <Link
              to="/titles/$titleId"
              params={{ titleId: item.id }}
              className="group flex items-center gap-4 px-1 py-3"
            >
              <span className="h-[76px] w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.cover && (
                  <img
                    src={assetUrl(item.cover.url)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 text-sm font-bold group-hover:underline">
                  {item.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[
                    item.type && facetLabel('type', item.type),
                    item.ruleSystem && facetLabel('system', item.ruleSystem),
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </span>
              <TitlePrice
                title={item}
                className="shrink-0 flex-col items-end gap-0 text-sm"
              />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/titles"
        search={ruleSystem ? { system: ruleSystem } : {}}
        className="flex items-center justify-center gap-1 pt-3 text-sm text-primary hover:underline"
      >
        {t('moreRecommendations')}
        <ArrowRightIcon aria-hidden className="size-4" />
      </Link>
    </section>
  )
}
