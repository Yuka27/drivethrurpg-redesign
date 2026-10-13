import { Link } from '@tanstack/react-router'
import { ChevronRightIcon, RssIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import {
  feedUnavailable,
  useFollowingTitles,
  useFollowTargets,
} from '@/api/following'
import type { FollowTarget } from '@/api/following'
import { useMe } from '@/api/me'
import { useTitle } from '@/api/titles'
import type { HomeSection, TitleSummary } from '@/api/titles'
import {
  EmptyActions,
  EmptyState,
  ErrorState,
} from '@/components/site/empty-state'
import { LoadingStatus } from '@/components/site/loading-status'
import { OptionSelect } from '@/components/site/option-select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ratingVerdict, Stars } from '@/components/title/rating-stars'
import { CartButton, WishlistButton } from '@/components/title/title-actions'
import { TitlePrice } from '@/components/title/title-price'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { useFormatDate, useFormatMoney, useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'
import { useFollowingSeen } from '@/stores/following-seen'
import { tagClass } from '@/components/title/tag-class'

/** Five titles a tab. */
const SHOWN = 5

/**
 * The tabs ("New Releases", "Following", "Bestselling", "Specials", "Free &
 * PWYW"): the API's home sections, and the feed of what the user follows
 * (signed in only). "Popular Upcoming" has no data.
 */
const TABS = ['new', 'following', 'bestselling', 'sale', 'free'] as const
type Tab = (typeof TABS)[number]

/**
 * Tabs of short title lists. Desktop: tabs, the list, and a preview of the
 * title under the pointer or focus. Phones: a dropdown instead of tabs, rows
 * that open the title, no preview.
 */
export function TitleTabs({
  sections,
}: {
  sections: Map<string, HomeSection>
}) {
  const { t } = useTranslation('home')
  const id = useId()
  const me = useMe().data
  const signedIn = Boolean(me)
  const targets = useFollowTargets(signedIn)
  const feed = useFollowingTitles(signedIn)
  // a feed that cannot be shown (no endpoint, another shape) hides the tab
  const following =
    signedIn &&
    !(feed.isError && feedUnavailable(feed.error)) &&
    !(targets.isError && feedUnavailable(targets.error))

  const tabs = TABS.filter((item) =>
    item === 'following'
      ? following
      : (sections.get(item)?.titles.length ?? 0) > 0,
  )
  const [picked, setPicked] = useState<Tab>()
  const tab = picked && tabs.includes(picked) ? picked : tabs.at(0)

  // newer releases than the user last saw in the tab: a dot on it
  const latest = feed.data?.reduce<string | undefined>(
    (newest, item) =>
      item.releaseDate && (!newest || item.releaseDate > newest)
        ? item.releaseDate
        : newest,
    undefined,
  )
  const seen = useFollowingSeen((state) => (me ? state.seen[me.id] : undefined))
  const markSeen = useFollowingSeen((state) => state.markSeen)
  useEffect(() => {
    if (tab === 'following' && me && latest) markSeen(me.id, latest)
  }, [tab, me, latest, markSeen])
  const unseen =
    tab !== 'following' && Boolean(latest && (!seen || latest > seen))

  if (!tab) return null
  const panelId = `${id}-panel`
  const followed = targets.data ?? []
  const label = (item: Tab) => t(`tabs.${item}`)

  return (
    <section aria-label={t('lists')} className="flex flex-col gap-2 pt-4">
      <div
        role="tablist"
        aria-label={t('lists')}
        className="flex gap-1 max-lg:hidden"
      >
        {tabs.map((item) => (
          <button
            key={item}
            role="tab"
            type="button"
            id={`${id}-${item}`}
            aria-selected={item === tab}
            aria-controls={panelId}
            // the dot, in words: "Following new"
            aria-label={
              item === 'following' && unseen
                ? `${label(item)} ${t('tabs.unseen')}`
                : undefined
            }
            onClick={() => setPicked(item)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-2.5 pt-0.5 pb-1 text-base',
              item === tab
                ? 'border-primary font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label(item)}
            {item === 'following' && unseen && (
              <span aria-hidden className="size-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="border-b-2 border-primary lg:hidden">
        <OptionSelect
          label={t('lists')}
          value={tab}
          options={tabs.map((item) => ({
            value: item,
            label:
              item === 'following' && unseen
                ? `${label(item)} · ${t('tabs.unseen')}`
                : label(item),
          }))}
          onValueChange={(value) => setPicked(value as Tab)}
          className="h-8 w-full justify-between border-0 bg-transparent px-0 text-base font-semibold shadow-none dark:bg-transparent"
        />
      </div>

      <div id={panelId} role="tabpanel" aria-labelledby={`${id}-${tab}`}>
        {tab !== 'following' ? (
          <TitleList
            // a new tab starts its preview on its first title
            key={tab}
            titles={sections.get(tab)?.titles.slice(0, SHOWN) ?? []}
            followed={tab === 'new' ? followed : []}
          />
        ) : targets.isPending || feed.isPending ? (
          <RowsSkeleton />
        ) : followed.length === 0 ? (
          <EmptyState
            icon={<RssIcon />}
            title={t('following.emptyTitle')}
            text={t('following.empty')}
            className="rounded-xl bg-card"
          >
            <EmptyActions>
              <Button asChild className="rounded-lg">
                <Link to="/following">{t('following.manage')}</Link>
              </Button>
            </EmptyActions>
          </EmptyState>
        ) : feed.isError ? (
          <ErrorState
            title={t('following.loadError')}
            onRetry={() => void feed.refetch()}
            className="rounded-xl bg-card"
          />
        ) : feed.data.length === 0 ? (
          <EmptyState
            icon={<RssIcon />}
            title={t('following.noneTitle')}
            text={t('following.none')}
            className="rounded-xl bg-card"
          />
        ) : (
          <TitleList
            key={tab}
            titles={feed.data.slice(0, SHOWN)}
            followed={followed}
            withReasons
          />
        )}
      </div>
    </section>
  )
}

/**
 * Why a title is in the Following feed: a followed publisher ("New from
 * Chaosium"), else a followed rule system ("New for Pathfinder 2e"). The
 * feed sends no reason, and titles carry no imprint to match.
 */
function useFollowReason(followed: Array<FollowTarget>) {
  const { t } = useTranslation('home')
  return (title: TitleSummary) => {
    if (
      title.publisher &&
      followed.some(
        (f) => f.type === 'publisher' && f.id === title.publisher?.id,
      )
    )
      return t('following.fromPublisher', { name: title.publisher.name })
    const system = followed.find(
      (f) => f.type === 'rule_system' && f.id === title.ruleSystem,
    )
    return system ? t('following.forSystem', { name: system.name }) : undefined
  }
}

/** Five rows and, on desktop, the preview of the hovered or focused one. */
function TitleList({
  titles,
  followed,
  withReasons = false,
}: {
  titles: Array<TitleSummary>
  /** what the user follows: reasons (Following) or "Following" chips (New) */
  followed: Array<FollowTarget>
  withReasons?: boolean
}) {
  const { t } = useTranslation('home')
  const [previewId, setPreviewId] = useState<string>()
  const reason = useFollowReason(followed)
  const preview = titles.find((title) => title.id === previewId) ?? titles.at(0)
  if (!preview) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,424px)]">
      <ul className="flex flex-col">
        {titles.map((title) => (
          <li key={title.id}>
            <Link
              to="/titles/$titleId"
              params={{ titleId: title.id }}
              onMouseEnter={() => setPreviewId(title.id)}
              onFocus={() => setPreviewId(title.id)}
              className={cn(
                'flex items-center gap-3 rounded-md px-1 py-2 lg:gap-4',
                title.id === preview.id && 'lg:bg-card',
              )}
            >
              <span className="size-[60px] shrink-0 overflow-hidden rounded-md bg-muted lg:size-20">
                {title.cover && (
                  <img
                    src={assetUrl(title.cover.url)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
              </span>
              <RowText
                title={title}
                subtitle={withReasons ? reason(title) : undefined}
                chip={
                  !withReasons &&
                  followed.some(
                    (f) =>
                      f.type === 'publisher' && f.id === title.publisher?.id,
                  )
                    ? t('following.chip')
                    : undefined
                }
              />
              <TitlePrice
                title={title}
                className="shrink-0 flex-col items-end gap-0 text-sm font-semibold lg:text-base"
              />
              <ChevronRightIcon
                aria-hidden
                className="size-3 shrink-0 lg:hidden"
              />
            </Link>
          </li>
        ))}
      </ul>
      <TitlePreview title={preview} />
    </div>
  )
}

/** The title, then a reason (Following) or its type and system, and a chip. */
function RowText({
  title,
  subtitle,
  chip,
}: {
  title: TitleSummary
  subtitle?: string
  chip?: string
}) {
  const facetLabel = useFacetLabel()
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="line-clamp-2 text-sm font-semibold lg:line-clamp-1 lg:text-base">
        {title.title}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground lg:text-sm">
          {subtitle ??
            [
              title.type && facetLabel('type', title.type),
              title.ruleSystem && facetLabel('system', title.ruleSystem),
            ]
              .filter(Boolean)
              .join(', ')}
        </span>
        {chip && <span className={cn(tagClass, 'shrink-0')}>{chip}</span>}
      </span>
    </span>
  )
}

/** The Following tab's rows while its feed loads. */
function RowsSkeleton() {
  return (
    <div>
      <LoadingStatus />
      <ul aria-hidden className="flex flex-col">
        {Array.from({ length: SHOWN }, (_, index) => (
          <li
            key={index}
            className="flex items-center gap-3 px-1 py-2 lg:gap-4"
          >
            <Skeleton className="size-[60px] shrink-0 lg:size-20" />
            <span className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </span>
            <Skeleton className="h-5 w-12 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Desktop only: the hovered or focused title, with what its page would say first. */
function TitlePreview({ title }: { title: TitleSummary }) {
  const { t } = useTranslation(['home', 'title', 'listing'])
  const facetLabel = useFacetLabel()
  const formatMoney = useFormatMoney()
  const formatNumber = useFormatNumber()
  const formatAverage = useFormatNumber({ maximumFractionDigits: 1 })
  const formatDate = useFormatDate({ dateStyle: 'short' })
  // the detail (authors, pages, description) fills in when it arrives
  const detail = useTitle(title.id).data
  const byline = [
    ...(detail?.authors.map((author) => author.name) ?? []),
    title.publisher?.name,
  ]
    .filter(Boolean)
    .join(', ')
  const price =
    title.price.amount === 0
      ? t('listing:price.free')
      : formatMoney(title.price)

  const facts = [
    title.ruleSystem && [
      facetLabel('system', title.ruleSystem),
      t('title:facts.system'),
    ],
    detail?.pageCount && [
      formatNumber(detail.pageCount),
      t('title:facts.pages'),
    ],
    detail?.releaseDate && [formatDate(detail.releaseDate), t('released')],
  ].filter((fact): fact is [string, string] => Boolean(fact))

  return (
    <aside
      aria-label={t('preview', { title: title.title })}
      className="flex flex-col gap-1 overflow-hidden rounded-xl border border-muted bg-card py-3 max-lg:hidden"
    >
      <div className="flex flex-col gap-0.5 px-4 pb-1">
        <h3 className="font-sans text-base leading-6 font-semibold">
          <Link
            to="/titles/$titleId"
            params={{ titleId: title.id }}
            className="hover:underline"
          >
            {title.title}
          </Link>
        </h3>
        {byline && (
          <p className="truncate text-xs text-muted-foreground">
            {t('byline', { names: byline })}
          </p>
        )}
      </div>
      {title.rating && (
        <p className="flex items-center gap-2 px-4 text-xs">
          <Stars
            value={title.rating.average}
            label={t('title:rating.stars', {
              average: formatAverage(title.rating.average),
            })}
          />
          <span className="text-primary-text">
            {t(`title:rating.verdict.${ratingVerdict(title.rating.average)}`)} (
            {formatNumber(title.rating.count)})
          </span>
        </p>
      )}
      <ul className="flex flex-wrap gap-1 px-4 py-2">
        {[
          title.type && facetLabel('type', title.type),
          title.ruleSystem && facetLabel('system', title.ruleSystem),
        ]
          .filter(Boolean)
          .map((tag) => (
            <li key={tag} className={tagClass}>
              {tag}
            </li>
          ))}
      </ul>
      <div className="flex flex-1 flex-col gap-2">
        <div className="px-4">
          <div className="h-[122px] overflow-hidden rounded-md bg-muted">
            {title.cover && (
              <img
                src={assetUrl(title.cover.url)}
                alt=""
                className="size-full object-cover"
              />
            )}
          </div>
        </div>
        {facts.length > 0 && (
          <dl className="flex gap-4 border-y border-muted px-4 py-2">
            {facts.map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-base font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {(detail?.shortDescription || detail?.description) && (
          <p className="line-clamp-5 px-4 py-1 text-sm text-muted-foreground">
            {detail.shortDescription || detail.description}
          </p>
        )}
        <div className="mt-auto flex gap-1 px-4">
          <CartButton
            title={title}
            labelClassName=""
            text={t('title:buy.addToCart', { price })}
            className="h-8 flex-1"
          />
          <WishlistButton title={title} className="size-8" />
        </div>
      </div>
    </aside>
  )
}

/** The tabs' outline while GET /home loads: tabs, five rows, the preview. */
export function TitleTabsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2 pt-4">
      <div className="flex gap-3 pb-1">
        {[28, 24, 20, 24].map((width, index) => (
          <Skeleton
            key={index}
            className="h-6"
            style={{ width: `${width * 4}px` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,424px)]">
        <ul className="flex flex-col">
          {Array.from({ length: SHOWN }, (_, index) => (
            <li
              key={index}
              className="flex items-center gap-3 px-1 py-2 lg:gap-4"
            >
              <Skeleton className="size-[60px] shrink-0 lg:size-20" />
              <span className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </span>
              <Skeleton className="h-5 w-12 shrink-0" />
            </li>
          ))}
        </ul>
        <Skeleton className="h-[440px] rounded-xl max-lg:hidden" />
      </div>
    </div>
  )
}
