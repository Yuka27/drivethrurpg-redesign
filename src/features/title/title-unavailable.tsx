import { Link } from '@tanstack/react-router'
import { BookXIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useSimilarTitles } from '@/api/titles'
import type { TitleDetail } from '@/api/titles'
import {
  EmptyActions,
  EmptyLabel,
  EmptyState,
} from '@/components/site/empty-state'
import { CoverLinks } from '@/components/title/cover-links'
import { Button } from '@/components/ui/button'

/** Mockup: three replacements. */
const SIMILAR = 3

/**
 * Mockup "Product: no longer available": what happened, that an owner's copy
 * is safe (and where it is), then similar titles instead.
 */
export function TitleUnavailable({ title }: { title: TitleDetail }) {
  const { t } = useTranslation('title')
  const { t: tCommon } = useTranslation()
  const similar = useSimilarTitles(title.id).data?.slice(0, SIMILAR)

  return (
    <div className="container flex flex-col items-center pt-6 pb-8">
      {title.owned && (
        <p
          role="note"
          className="mb-2 w-full max-w-[560px] rounded-[10px] border border-success/45 bg-success/14 px-3.5 py-3 text-sm"
        >
          <b>{t('unavailable.owned')}</b> {t('unavailable.ownedText')}
        </p>
      )}
      <EmptyState
        as="h1"
        icon={<BookXIcon />}
        title={t('unavailable.title')}
        text={
          <>
            <span className="block font-semibold text-foreground">
              {title.title}
            </span>
            {t('unavailable.text')}
          </>
        }
      >
        <EmptyActions>
          {title.owned ? (
            <Button asChild className="rounded-lg">
              <Link to="/library">{t('unavailable.library')}</Link>
            </Button>
          ) : (
            <Button asChild className="rounded-lg">
              <Link to="/titles">{tCommon('emptyStates.browseStore')}</Link>
            </Button>
          )}
        </EmptyActions>
        {similar && similar.length > 0 && (
          <>
            <EmptyLabel id="similar-titles">
              {t('unavailable.similar')}
            </EmptyLabel>
            <CoverLinks
              titles={similar}
              labelledBy="similar-titles"
              className="w-[70px]"
            />
          </>
        )}
      </EmptyState>
    </div>
  )
}
