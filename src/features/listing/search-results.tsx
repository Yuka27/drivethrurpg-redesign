import { Link } from '@tanstack/react-router'
import { SearchXIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useMe } from '@/api/me'
import { useToggleFollow } from '@/api/following'
import { usePublisher } from '@/api/publishers'
import { usePopularSearches, useSearchSuggestions } from '@/api/search'
import {
  EmptyActions,
  EmptyLabel,
  EmptyState,
} from '@/components/site/empty-state'
import { PublisherLogo } from '@/components/site/publisher-logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormatNumber } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { useAuthDialogStore } from '@/stores/auth-dialog'

/** Up to two publishers above the results. */
const PUBLISHERS = 2

const chipClass =
  'rounded-full border bg-secondary px-3.5 py-[7px] text-[13px] font-medium hover:border-foreground/35'

/**
 * "Results for “vaesen”", how many (with the filters), and
 * the publishers whose name matches, each one tap to follow.
 */
export function SearchHeader({
  q,
  total,
  filtered,
}: {
  q: string
  /** undefined while loading */
  total: number | undefined
  filtered: boolean
}) {
  const { t } = useTranslation('listing')
  const formatNumber = useFormatNumber()
  const publishers =
    useSearchSuggestions(q).data?.publishers.slice(0, PUBLISHERS) ?? []

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-heading text-2xl leading-tight font-bold [overflow-wrap:anywhere]">
          {t('search.heading', { q })}
        </h1>
        {total !== undefined ? (
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
            {t('search.count', {
              count: total,
              formatted: formatNumber(total),
            })}
            {filtered && ` ${t('search.withFilters')}`}
          </p>
        ) : (
          <Skeleton className="mt-1.5 h-4 w-36" />
        )}
      </div>
      {publishers.length > 0 && (
        <ul
          aria-label={t('search.publishers')}
          className="flex flex-wrap gap-3"
        >
          {publishers.map((publisher) => (
            <PublisherCard
              key={publisher.id}
              id={publisher.id}
              name={publisher.name}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function PublisherCard({ id, name }: { id: string; name: string }) {
  const { t } = useTranslation('listing')
  const apiError = useApiError()
  const formatNumber = useFormatNumber()
  const { data: me } = useMe()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const publisher = usePublisher(id).data
  const toggle = useToggleFollow()
  const following = Boolean(me) && Boolean(publisher?.following)

  return (
    <li className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 sm:max-w-[380px] sm:min-w-[260px]">
      <PublisherLogo
        name={name}
        url={publisher?.logo?.url}
        className="size-[42px] rounded-full"
      />
      <span className="min-w-0 flex-1">
        <Link
          to="/titles"
          search={{ publisher: id }}
          className="block truncate text-sm font-bold hover:underline"
        >
          {name}
        </Link>
        <span className="text-xs text-muted-foreground">
          {t('search.publisher')}
          {publisher?.titleCount !== undefined &&
            ` · ${t('search.count', {
              count: publisher.titleCount,
              formatted: formatNumber(publisher.titleCount),
            })}`}
        </span>
      </span>
      <Button
        variant="secondary"
        size="sm"
        aria-pressed={following}
        aria-label={t('search.followLabel', { name })}
        disabled={toggle.isPending}
        onClick={(event) => {
          if (!me) {
            openAuth('login', { returnFocusTo: event.currentTarget })
            return
          }
          toggle.mutate(
            { kind: 'publisher', id, on: !following },
            { onError: (error) => toast.error(apiError(error)) },
          )
        }}
        className="border"
      >
        {t(following ? 'search.following' : 'search.follow')}
      </Button>
    </li>
  )
}

/**
 * No results (nothing for the words themselves, before any filter):
 * the fix the API suggests, tips, popular searches and the whole catalogue.
 */
export function SearchNoResults({
  q,
  didYouMean,
  onSearch,
}: {
  q: string
  didYouMean: string | null | undefined
  onSearch: (q: string) => void
}) {
  const { t } = useTranslation('listing')
  const popular = usePopularSearches().data ?? []

  return (
    <EmptyState
      icon={<SearchXIcon />}
      title={t('search.none.title', { q })}
      text={
        didYouMean ? (
          <Trans
            t={t}
            i18nKey="search.none.didYouMean"
            values={{ fix: didYouMean }}
            components={{
              fix: (
                <button
                  type="button"
                  onClick={() => onSearch(didYouMean)}
                  className="font-bold text-primary-text underline underline-offset-3"
                />
              ),
            }}
          />
        ) : (
          t('search.none.text')
        )
      }
      className="mx-auto max-w-[640px] [&_h2]:[overflow-wrap:anywhere]"
    >
      <ul className="mb-1.5 list-disc pl-5 text-left text-sm text-muted-foreground">
        <li>{t('search.none.tip1')}</li>
        <li>{t('search.none.tip2')}</li>
        <li>{t('search.none.tip3')}</li>
      </ul>
      {popular.length > 0 && (
        <>
          <EmptyLabel id="popular-searches">
            {t('search.none.popular')}
          </EmptyLabel>
          <ul
            aria-labelledby="popular-searches"
            className="flex flex-wrap justify-center gap-2"
          >
            {popular.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  onClick={() => onSearch(term)}
                  className={chipClass}
                >
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-[18px]">
        <EmptyActions>
          <Button asChild className="rounded-lg">
            <Link to="/titles">{t('search.none.browse')}</Link>
          </Button>
        </EmptyActions>
      </div>
    </EmptyState>
  )
}
