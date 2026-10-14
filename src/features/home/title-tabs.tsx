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
import type { Followed } from '@/api/following'
import { useMe } from '@/api/me'
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
import { TitlePrice } from '@/components/title/title-price'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import { useFollowingSeen } from '@/stores/following-seen'
import { tagClass } from '@/components/title/tag-class'
import { PreviewFrame, TitlePreviewPanel } from './title-preview'

/** Rows a tab shows (GET /home sends up to ten a section; the feed more). */
export const HOME_LIST_ROWS = 10
/** ms a row is pointed at before the panel shows it */
const PREVIEW_DELAY = 150

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
            titles={sections.get(tab)?.titles.slice(0, HOME_LIST_ROWS) ?? []}
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
          // only genres and series followed: say the feed is meant for them too
          // (GET /following/feed lists followed publishers' titles for now)
          followed.every(
            (f) => f.kind === 'genre' || f.kind === 'product_line',
          ) ? (
            <EmptyState
              icon={<RssIcon />}
              title={t('following.categoriesTitle')}
              text={t('following.categories')}
              className="rounded-xl bg-card"
            >
              <EmptyActions>
                <Button asChild variant="outline" className="rounded-lg">
                  <Link to="/following">{t('following.manage')}</Link>
                </Button>
              </EmptyActions>
            </EmptyState>
          ) : (
            <EmptyState
              icon={<RssIcon />}
              title={t('following.noneTitle')}
              text={t('following.none')}
              className="rounded-xl bg-card"
            />
          )
        ) : (
          <TitleList
            key={tab}
            titles={feed.data.slice(0, HOME_LIST_ROWS)}
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
function useFollowReason(followed: Array<Followed>) {
  const { t } = useTranslation('home')
  return (title: TitleSummary) => {
    if (
      title.publisher &&
      followed.some(
        (f) => f.kind === 'publisher' && f.id === title.publisher?.id,
      )
    )
      return t('following.fromPublisher', { name: title.publisher.name })
    const system = followed.find(
      (f) => f.kind === 'rule_system' && f.id === title.ruleSystem,
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
  followed: Array<Followed>
  withReasons?: boolean
}) {
  const { t } = useTranslation(['home', 'listing'])
  // the row under the pointer or focus; the panel follows it after a moment,
  // so sweeping across the list does not load every title on the way
  const [pointedId, setPointedId] = useState<string>()
  const previewId = useDebouncedValue(pointedId, PREVIEW_DELAY)
  const reason = useFollowReason(followed)
  // the first row until one is pointed at: its preview loads with the tab
  const preview = titles.find((title) => title.id === previewId) ?? titles.at(0)
  if (!preview) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <ul className="flex flex-col">
        {titles.map((title) => (
          <li key={title.id}>
            <Link
              to="/titles/$titleId"
              params={{ titleId: title.id }}
              onMouseEnter={() => setPointedId(title.id)}
              onFocus={() => setPointedId(title.id)}
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
                      f.kind === 'publisher' && f.id === title.publisher?.id,
                  )
                    ? t('following.chip')
                    : undefined
                }
              />
              {title.payWhatYouWant ? (
                <p className="shrink-0 text-right text-sm font-semibold lg:text-base">
                  {t('price.payWhatYouWant', { ns: 'listing' })}
                </p>
              ) : (
                <TitlePrice
                  title={title}
                  className="shrink-0 flex-col items-end gap-0 text-sm font-semibold lg:text-base"
                />
              )}
              <ChevronRightIcon
                aria-hidden
                className="size-3 shrink-0 lg:hidden"
              />
            </Link>
          </li>
        ))}
      </ul>
      {/* desktop only (phones open the title); announced as it changes */}
      {/* sticks under the header; a panel taller than the window scrolls
          inside itself instead of stretching the page past the list */}
      <div
        aria-live="polite"
        className="sticky top-[calc(var(--header-h,0px)+16px)] max-h-[calc(100dvh-var(--header-h,0px)-32px)] overflow-y-auto overscroll-contain rounded-xl [scrollbar-width:thin] max-[859px]:hidden"
      >
        {/* a new title starts its edition and sample afresh */}
        <PreviewFrame>
          <TitlePreviewPanel key={preview.id} titleId={preview.id} />
        </PreviewFrame>
      </div>
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
        {Array.from({ length: HOME_LIST_ROWS }, (_, index) => (
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
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <ul className="flex flex-col">
          {Array.from({ length: HOME_LIST_ROWS }, (_, index) => (
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
        <Skeleton className="h-[640px] rounded-xl max-[859px]:hidden" />
      </div>
    </div>
  )
}
