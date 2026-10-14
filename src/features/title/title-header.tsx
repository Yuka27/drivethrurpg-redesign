import { BotIcon, CheckIcon } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import type { TitleDetail } from '@/api/titles'
import { ContentLanguageBadge } from '@/components/title/content-language-note'
import { ratingVerdict, Stars } from '@/components/title/rating-stars'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { PdfPreviewLink } from './pdf-preview-link'
import { useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

const tagClass =
  'inline-flex h-[22px] items-center gap-1 rounded-sm px-2 text-xs font-medium'

/**
 * Cover, title, who made it, rating, tags and the short description. Side
 * by side on desktop, centred under the cover on phones.
 */
export function TitleHeader({
  title,
  headingRef,
}: {
  title: TitleDetail
  /** the sticky bar shows once this <h1> has scrolled away */
  headingRef?: RefObject<HTMLHeadingElement | null>
}) {
  const { t } = useTranslation('title')
  const facetLabel = useFacetLabel()
  const formatNumber = useFormatNumber()
  const formatAverage = useFormatNumber({ maximumFractionDigits: 1 })
  const authors = title.authors.map((author) => author.name).join(', ')
  // its own short text: the full description is right below, in Overview
  const lead = title.shortDescription

  return (
    <header className="flex flex-col items-center gap-2 text-center lg:flex-row lg:items-start lg:text-left">
      <div className="h-[245px] w-[190px] shrink-0 overflow-hidden rounded-xl border border-muted bg-card">
        {title.cover && (
          <img
            src={assetUrl(title.cover.url)}
            alt={title.cover.alt}
            className="size-full object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col items-center gap-2 py-2 lg:items-start lg:px-3">
        <div>
          <h1
            ref={headingRef}
            className="font-sans text-2xl leading-8 font-bold tracking-normal"
          >
            {title.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('by')}{' '}
            <span className="font-semibold text-foreground">
              {[authors, title.publisher?.name].filter(Boolean).join(' · ')}
            </span>
          </p>
        </div>

        {title.rating && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Stars
              value={title.rating.average}
              label={t('rating.stars', {
                average: formatAverage(title.rating.average),
              })}
            />
            <span className="font-semibold text-success">
              {t(`rating.verdict.${ratingVerdict(title.rating.average)}`)}
            </span>
            {t('rating.count', {
              count: title.rating.count,
              formatted: formatNumber(title.rating.count),
            })}
          </p>
        )}

        <ul
          aria-label={t('tags')}
          className="flex flex-wrap justify-center gap-2 lg:justify-start"
        >
          {title.type && (
            <li className={cn(tagClass, 'bg-muted')}>
              {facetLabel('type', title.type)}
            </li>
          )}
          {title.ruleSystem && (
            <li className={cn(tagClass, 'bg-muted')}>
              {facetLabel('system', title.ruleSystem)}
            </li>
          )}
          <li
            className={cn(
              tagClass,
              'border',
              title.contentFlags.aiGenerated
                ? 'border-border text-muted-foreground'
                : 'border-success text-success',
            )}
          >
            {title.contentFlags.aiGenerated ? (
              <BotIcon aria-hidden className="size-3" />
            ) : (
              <CheckIcon aria-hidden className="size-3" />
            )}
            {t(title.contentFlags.aiGenerated ? 'aiGenerated' : 'humanMade')}
          </li>
        </ul>
        {/* 14px under the tags: the column's 8px gap and 6px more */}
        {title.sampleFile && (
          <PdfPreviewLink file={title.sampleFile} className="mt-1.5" />
        )}
        <ContentLanguageBadge textLanguage={title.textLanguage} />

        {lead && (
          <p className="line-clamp-3 text-sm text-muted-foreground max-lg:hidden">
            {lead}
          </p>
        )}
      </div>
    </header>
  )
}
