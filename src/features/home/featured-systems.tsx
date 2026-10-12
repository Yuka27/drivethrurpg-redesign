import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from './section-heading'
import { assetUrl } from '@/api/client'
import { useTitleFacets, useTitles } from '@/api/titles'
import { DealBadges } from '@/components/title/deal-badges'
import { useFacetLabel } from '@/components/title/use-facet-label'

/** Figma: three groups of four. */
const GROUPS = 3
const PER_GROUP = 4

/**
 * Figma "Featured for you": three genres with four titles each. The API has no
 * genres, so the groups are the three rule systems with the most titles, each
 * with its four bestsellers.
 */
export function FeaturedSystems() {
  const { t } = useTranslation('home')
  const systems = useTitleFacets({}).data?.ruleSystems.slice(0, GROUPS) ?? []
  if (systems.length === 0) return null

  return (
    <section aria-labelledby="featured" className="flex flex-col gap-4">
      <SectionHeading id="featured">{t('featured')}</SectionHeading>
      <ul className="grid gap-4 lg:grid-cols-3">
        {systems.map((system) => (
          <SystemGroup key={system.value} system={system.value} />
        ))}
      </ul>
    </section>
  )
}

function SystemGroup({ system }: { system: string }) {
  const { t } = useTranslation('home')
  const facetLabel = useFacetLabel()
  const titles = useTitles(
    { system },
    { sort: 'bestselling', page: 1, pageSize: PER_GROUP },
  ).data?.items
  const name = facetLabel('system', system)

  return (
    <li className="flex flex-col gap-1 overflow-hidden rounded-xl border border-muted bg-card pt-2">
      <div className="px-4">
        <h3 className="font-sans text-base leading-6 font-medium">
          <Link to="/titles" search={{ system }} className="hover:underline">
            {name}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">{t('featuredSystem')}</p>
      </div>
      <ul aria-label={name} className="grid grid-cols-2">
        {(titles ?? []).map((title) => (
          <li key={title.id}>
            <Link
              to="/titles/$titleId"
              params={{ titleId: title.id }}
              className="group flex flex-col"
            >
              <span className="relative block h-[185px] bg-muted">
                {title.cover && (
                  <img
                    src={assetUrl(title.cover.url)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-b from-transparent from-33% to-card/80"
                />
                <DealBadges
                  title={title}
                  tone="primary"
                  className="absolute bottom-2 left-2"
                />
              </span>
              <span className="truncate px-3 py-2 text-xs text-muted-foreground group-hover:text-foreground">
                {title.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </li>
  )
}
