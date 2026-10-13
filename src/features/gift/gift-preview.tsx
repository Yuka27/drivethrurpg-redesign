import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import type { Gift } from '@/api/gifts'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { useFormatDate } from '@/i18n/format'

/**
 * Mockup "gift": who it is from, how many titles, the sender's message and the
 * titles, on a card with a ribbon.
 */
export function GiftPreview({ gift }: { gift: Gift }) {
  const { t } = useTranslation('gift')
  const formatDate = useFormatDate({ month: 'short', day: 'numeric' })
  const sent = formatDate(gift.sentAt)

  return (
    <section
      aria-labelledby="gift-title"
      className="relative overflow-hidden rounded-[18px] border border-primary/35 bg-linear-160 from-primary/22 to-card to-60% p-7"
    >
      <span
        aria-hidden
        className="absolute -top-0.5 right-[34px] h-16 w-[26px] bg-primary/90 [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
      />
      <p className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {t('from', { name: gift.from.displayName })}
      </p>
      <h2
        id="gift-title"
        className="mt-1.5 mb-3.5 max-w-[16ch] font-heading text-2xl leading-tight font-extrabold"
      >
        {t('waiting', { count: gift.titles.length })}
      </h2>
      {gift.message && (
        <blockquote className="mb-[18px] rounded-r-[10px] border-l-[3px] border-primary bg-black/28 px-3.5 py-3 text-[15px] leading-normal">
          <p>“{gift.message}”</p>
          <footer className="mt-1.5 text-xs text-muted-foreground">
            {gift.to.email
              ? t('sentTo', { date: sent, email: gift.to.email })
              : t('sent', { date: sent })}
          </footer>
        </blockquote>
      )}
      <GiftTitles gift={gift} />
    </section>
  )
}

/** The gift's titles; `action` adds a button to each (Download on the done view). */
export function GiftTitles({
  gift,
  action,
  className = 'bg-black/28',
}: {
  gift: Gift
  action?: (title: Gift['titles'][number]) => ReactNode
  className?: string
}) {
  const facetLabel = useFacetLabel()
  return (
    <ul className="grid gap-2.5 text-left">
      {gift.titles.map((title) => (
        <li
          key={title.id}
          className={`flex items-center gap-3 rounded-xl border p-2.5 ${className}`}
        >
          <span className="aspect-[3/4] w-[52px] shrink-0 overflow-hidden rounded-md border bg-muted">
            {title.cover && (
              <img
                src={assetUrl(title.cover.url)}
                alt=""
                className="size-full object-cover"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{title.name}</span>
            <span className="text-xs text-muted-foreground">
              {title.formats
                .map((format) => facetLabel('format', format))
                .join(', ')}
            </span>
          </span>
          {action?.(title)}
        </li>
      ))}
    </ul>
  )
}
