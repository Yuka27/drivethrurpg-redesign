import { FlagIcon, MessagesSquareIcon, ReplyIcon, StarIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useTitleDiscussions, useTitleReviews } from '@/api/titles'
import type { Discussion, Review, TitleDetail } from '@/api/titles'
import { Pagination } from '@/components/site/pagination'
import { Stars } from '@/components/title/rating-stars'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormatDate, useFormatNumber } from '@/i18n/format'
import { useComingSoon } from '@/lib/use-coming-soon'

/** Figma: five entries a page. */
const PAGE_SIZE = 5

type Entry =
  | { kind: 'review'; date: string; review: Review }
  | { kind: 'discussion'; date: string; discussion: Discussion }

/**
 * Figma "Reviews & Discussions": the rating summary, then reviews and discussion
 * threads in one list, newest first. Replying, flagging and starting a thread
 * have no API yet.
 */
export function ReviewsSection({ title }: { title: TitleDetail }) {
  const { t } = useTranslation('title')
  const reviewsQuery = useTitleReviews(title.id)
  const discussionsQuery = useTitleDiscussions(title.id)
  const reviews = reviewsQuery.data
  const discussions = discussionsQuery.data
  const loading = reviewsQuery.isPending || discussionsQuery.isPending
  const comingSoon = useComingSoon()
  const [page, setPage] = useState(1)

  const entries: Array<Entry> = [
    ...(reviews?.items ?? []).map((review) => ({
      kind: 'review' as const,
      date: review.createdAt,
      review,
    })),
    ...(discussions?.items ?? []).map((discussion) => ({
      kind: 'discussion' as const,
      date: discussion.lastReplyAt ?? discussion.createdAt,
      discussion,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))
  const total = (reviews?.total ?? 0) + (discussions?.total ?? 0)
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const shown = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="flex scroll-mt-[calc(var(--header-h,0px)+var(--stick-h,0px)+12px)] flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="reviews-heading"
          className="font-sans text-base leading-6 font-bold"
        >
          {loading
            ? t('stickyNav.reviews')
            : t('reviews.heading', { count: total })}
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={comingSoon}
          className="h-8 max-sm:w-full"
        >
          {t('reviews.startDiscussion')}
        </Button>
      </div>

      {loading && <ReviewsSkeleton rating={Boolean(title.rating)} />}

      {title.rating && reviews && !loading && (
        <RatingSummary
          average={title.rating.average}
          count={title.rating.count}
          histogram={reviews.histogram}
        />
      )}

      {!loading && shown.length > 0 && (
        <ul className="flex flex-col gap-2">
          {shown.map((entry) => (
            <li
              key={
                entry.kind === 'review' ? entry.review.id : entry.discussion.id
              }
            >
              {entry.kind === 'review' ? (
                <ReviewItem review={entry.review} onAction={comingSoon} />
              ) : (
                <DiscussionItem
                  discussion={entry.discussion}
                  onAction={comingSoon}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        className="self-center"
      />
    </section>
  )
}

/** Figma "raiting card": the average, then one bar per star with its share. */
function RatingSummary({
  average,
  count,
  histogram,
}: {
  average: number
  count: number
  histogram: Array<number>
}) {
  const { t } = useTranslation('title')
  const formatNumber = useFormatNumber()
  const formatAverage = useFormatNumber({ maximumFractionDigits: 1 })
  const formatPercent = useFormatNumber({
    style: 'percent',
    maximumFractionDigits: 0,
  })
  const sum = histogram.reduce((total, value) => total + value, 0)

  return (
    <div className="flex items-center gap-4 rounded-xl bg-card p-6">
      <div className="flex shrink-0 flex-col items-center text-center">
        <p className="text-4xl leading-10 font-bold">
          {formatAverage(average)}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="max-sm:hidden">{t('reviews.outOf')} · </span>
          {t('reviews.ratings', { count, formatted: formatNumber(count) })}
        </p>
        <Stars
          value={average}
          label={t('rating.stars', { average: formatAverage(average) })}
          className="mt-1"
        />
      </div>
      <ul
        aria-label={t('reviews.breakdown')}
        className="flex min-w-0 flex-1 flex-col gap-1"
      >
        {[5, 4, 3, 2, 1].map((stars) => {
          const share = sum === 0 ? 0 : (histogram[stars - 1] ?? 0) / sum
          return (
            <li key={stars} className="flex items-center gap-2 text-sm">
              <span className="flex w-5 shrink-0 items-center" aria-hidden>
                {stars}
                <StarIcon className="size-3 text-muted-foreground" />
              </span>
              <span className="sr-only">
                {t('reviews.starsShare', { count: stars })}
              </span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-warning"
                  style={{ width: `${share * 100}%` }}
                />
              </span>
              <span className="w-9 shrink-0 text-right text-muted-foreground">
                {formatPercent(share)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const cardClass = 'flex flex-col gap-3 rounded-xl bg-card p-6'

function EntryActions({ onAction }: { onAction: () => void }) {
  const { t } = useTranslation('title')
  return (
    <div className="flex items-center justify-between">
      <Button variant="secondary" size="sm" onClick={onAction} className="h-8">
        <ReplyIcon aria-hidden />
        {t('reviews.reply')}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onAction}
        aria-label={t('reviews.flag')}
        className="size-8 rounded-lg border-border bg-background shadow-none dark:bg-background"
      >
        <FlagIcon aria-hidden />
      </Button>
    </div>
  )
}

function EntryHeader({
  name,
  date,
  children,
}: {
  name: string
  date: string
  children?: ReactNode
}) {
  const formatDate = useFormatDate()
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-sm font-bold">{name}</p>
        {children}
      </div>
      <time dateTime={date} className="shrink-0 text-sm text-muted-foreground">
        {formatDate(date)}
      </time>
    </div>
  )
}

function ReviewItem({
  review,
  onAction,
}: {
  review: Review
  onAction: () => void
}) {
  const { t } = useTranslation('title')
  return (
    <article className={cardClass}>
      <EntryHeader name={review.author.displayName} date={review.createdAt}>
        {review.verifiedOwner && (
          <span className="inline-flex h-[22px] items-center rounded-sm bg-update px-2 text-xs font-medium text-update-foreground">
            {t('reviews.purchaser')}
          </span>
        )}
        <Stars
          value={review.rating}
          label={t('reviews.rated', { count: review.rating })}
        />
      </EntryHeader>
      <div className="text-sm">
        {review.title && <p className="font-semibold">{review.title}</p>}
        <p>{review.body}</p>
      </div>
      <EntryActions onAction={onAction} />
    </article>
  )
}

function DiscussionItem({
  discussion,
  onAction,
}: {
  discussion: Discussion
  onAction: () => void
}) {
  const { t } = useTranslation('title')
  return (
    <article className={cardClass}>
      <EntryHeader
        name={discussion.author.displayName}
        date={discussion.lastReplyAt ?? discussion.createdAt}
      />
      <p className="text-sm">{discussion.title}</p>
      {discussion.replyCount > 0 && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessagesSquareIcon aria-hidden className="size-3.5" />
          {t('reviews.replies', { count: discussion.replyCount })}
        </p>
      )}
      <EntryActions onAction={onAction} />
    </article>
  )
}

/** The rating card and a few entries while reviews and discussions load. */
function ReviewsSkeleton({ rating }: { rating: boolean }) {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {rating && (
        <div className="flex items-center gap-4 rounded-xl bg-card p-6">
          <div className="flex w-24 shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-10 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-2" />
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-xl bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
