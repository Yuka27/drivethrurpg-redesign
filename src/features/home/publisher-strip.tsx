import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from './section-heading'
import { usePublisher } from '@/api/publishers'
import { useTitleFacets } from '@/api/titles'
import { PublisherLogo } from '@/components/site/publisher-logo'

/** Figma: eight logos in a row on desktop. */
const SHOWN = 8

/** Figma "Browse by Publisher": logo tiles of the publishers with the most titles. */
export function PublisherStrip() {
  const { t } = useTranslation('home')
  const publishers = useTitleFacets({}).data?.publishers.slice(0, SHOWN) ?? []
  if (publishers.length === 0) return null

  return (
    <section aria-labelledby="publishers" className="flex flex-col gap-4">
      <SectionHeading id="publishers">{t('publishers')}</SectionHeading>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-8 lg:overflow-visible">
        {publishers.map((publisher) => (
          <PublisherTile
            key={publisher.value}
            id={publisher.value}
            name={publisher.label}
          />
        ))}
      </ul>
    </section>
  )
}

function PublisherTile({ id, name }: { id: string; name: string }) {
  const logo = usePublisher(id).data?.logo
  return (
    <li className="shrink-0 snap-start lg:min-w-0">
      <Link
        to="/titles"
        search={{ publisher: id }}
        aria-label={name}
        title={name}
        className="flex size-[140px] overflow-hidden rounded-xl border border-muted bg-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:aspect-square lg:size-auto"
      >
        {/* the tile is the frame: the logo fills it, contained, without its own */}
        <PublisherLogo
          name={name}
          url={logo?.url}
          className="size-full rounded-none border-0 bg-transparent object-contain p-3 text-2xl"
        />
      </Link>
    </li>
  )
}
