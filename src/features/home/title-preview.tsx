import { Link } from '@tanstack/react-router'
import { CheckIcon, LibraryBigIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { EditionPicker } from './edition-picker'
import { assetUrl } from '@/api/client'
import { usePreview } from '@/api/titles'
import type { PreviewEdition, TitlePreview } from '@/api/titles'
import { LoadingStatus } from '@/components/site/loading-status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ratingVerdict, Stars } from '@/components/title/rating-stars'
import { tagClass } from '@/components/title/tag-class'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { WishlistButton } from '@/components/title/title-actions'
import { useAddToCart } from '@/features/title/use-buy'
import { useFormatDate, useFormatMoney, useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

const PAD = 'flex flex-col gap-4 p-5'

/**
 * The panel's card. It stays while the titles in it change, and its height
 * follows theirs smoothly (none under reduced motion), so a title with
 * samples and one without do not jump.
 */
export function PreviewFrame({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const content = inner.current
    if (!content) return
    const measure = () => setHeight(content.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      // the measured content's height: `box-content` keeps the border outside it
      style={{ height }}
      className="box-content overflow-hidden rounded-xl border border-muted bg-card transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      <div ref={inner}>{children}</div>
    </div>
  )
}

/**
 * The home list's preview of one title (GET /titles/{id}/preview): name,
 * rating and tags, its sample pages (or, without any, a small cover by the
 * name), facts, badges, a short description and the edition picker with the
 * buy button. Its outline until the preview first arrives.
 */
export function TitlePreviewPanel({ titleId }: { titleId: string }) {
  const { t } = useTranslation('home')
  const preview = usePreview(titleId)
  if (preview.isPending) return <PreviewSkeleton />
  if (preview.isError)
    return (
      <div className="flex flex-col items-start gap-3 p-5 text-sm">
        <p className="text-muted-foreground">{t('preview.loadError')}</p>
        <Button asChild variant="outline" size="sm" className="rounded-lg">
          <Link to="/titles/$titleId" params={{ titleId }}>
            {t('preview.open')}
          </Link>
        </Button>
      </div>
    )
  return <Panel title={preview.data} />
}

function Panel({ title }: { title: TitlePreview }) {
  const { t } = useTranslation(['home', 'title'])
  const facetLabel = useFacetLabel()
  const formatNumber = useFormatNumber()
  const formatAverage = useFormatNumber({ maximumFractionDigits: 1 })
  const formatDate = useFormatDate({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const [sku, setSku] = useState(
    () =>
      (
        title.editions.find((edition) => edition.default) ??
        title.editions.at(0)
      )?.sku ?? '',
  )
  const edition = title.editions.find((item) => item.sku === sku)
  const samples = title.previewPages.length > 0

  const tags = [
    title.type && facetLabel('type', title.type),
    title.ruleSystemName,
    ...title.genres,
  ].filter((tag): tag is string => Boolean(tag))
  const facts = [
    title.pageCount !== null && [
      formatNumber(title.pageCount),
      t('preview.facts.pages'),
    ],
    edition && [edition.label, t('preview.facts.format')],
    title.languageLabel && [title.languageLabel, t('preview.facts.language')],
    title.releaseDate && [
      formatDate(title.releaseDate),
      t('preview.facts.released'),
    ],
  ].filter((fact): fact is [string, string] => Boolean(fact))
  const badges = [
    title.humanCreated && t('preview.humanCreated'),
    title.instantDownload && t('preview.instantDownload'),
  ].filter((badge): badge is string => Boolean(badge))

  return (
    <aside
      aria-label={t('preview.label', { title: title.title })}
      className="flex flex-col"
    >
      {/* the card resizes (PreviewFrame); a new title's content fades in with it */}
      <div className="flex animate-in flex-col duration-300 ease-out fade-in-0 motion-reduce:animate-none">
        <div className={PAD}>
          <div className="flex gap-3">
            {/* no sample pages: the cover, small and whole, by the name */}
            {!samples && title.cover && (
              <img
                src={assetUrl(title.cover.url)}
                alt={title.cover.alt}
                className="h-auto w-16 shrink-0 self-start rounded-sm object-contain"
              />
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="font-sans text-lg leading-6 font-semibold">
                <Link
                  to="/titles/$titleId"
                  params={{ titleId: title.id }}
                  className="hover:underline"
                >
                  {title.title}
                </Link>
              </h3>
              {title.publisher && (
                <p className="truncate text-sm text-muted-foreground">
                  {title.publisher.name}
                </p>
              )}
            </div>
          </div>
          {title.rating && (
            <p className="flex items-center gap-2 text-sm">
              <Stars
                value={title.rating.average}
                label={t('title:rating.stars', {
                  average: formatAverage(title.rating.average),
                })}
              />
              <span className="text-primary-text">
                {t(
                  `title:rating.verdict.${ratingVerdict(title.rating.average)}`,
                )}
              </span>
              <span className="text-muted-foreground">
                ({formatNumber(title.rating.count)})
              </span>
            </p>
          )}
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <li key={tag} className={tagClass}>
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {samples && <Samples title={title} />}

        <div className={PAD}>
          {facts.length > 0 && (
            <dl className="grid grid-cols-4 gap-2">
              {facts.map(([value, label]) => (
                <div key={label} className="flex min-w-0 flex-col-reverse">
                  <dt className="text-[12px] tracking-wide text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="text-[12px] font-bold [overflow-wrap:anywhere]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {badges.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-success">
              {badges.map((badge) => (
                <li key={badge} className="flex items-center gap-1">
                  <CheckIcon aria-hidden className="size-4" />
                  {badge}
                </li>
              ))}
            </ul>
          )}
          {title.shortDescription && (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {title.shortDescription}
            </p>
          )}
          <BuyArea title={title} edition={edition} onSkuChange={setSku} />
        </div>
      </div>
    </aside>
  )
}

/**
 * The sample spreads: one large (3:2, whole), "Sample k of n", thumbnails to
 * switch (hover, focus or click) and "See all N pages" when the title has
 * more than are shown.
 */
function Samples({ title }: { title: TitlePreview }) {
  const { t } = useTranslation('home')
  const [active, setActive] = useState(0)
  const pages = title.previewPages
  const page = pages[Math.min(active, pages.length - 1)]

  return (
    <div className="flex flex-col gap-2 border-y border-muted bg-secondary/40 pb-3">
      <div className="relative aspect-[3/2] bg-black">
        <img
          src={assetUrl(page.url)}
          alt={page.alt}
          className="size-full object-contain"
        />
        <span className="absolute right-2 bottom-2 rounded-full bg-black/80 px-2 py-0.5 text-[11px] text-white">
          {t('preview.sample', {
            index: Math.min(active, pages.length - 1) + 1,
            total: pages.length,
          })}
        </span>
      </div>
      {(pages.length > 1 || title.previewPageTotal > pages.length) && (
        <div className="flex flex-col gap-2 px-5">
          {pages.length > 1 && (
            <div className="flex gap-1.5">
              {pages.map((item, index) => (
                <button
                  key={item.url + index}
                  type="button"
                  aria-pressed={index === active}
                  aria-label={t('preview.samplePage', { index: index + 1 })}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onClick={() => setActive(index)}
                  className={cn(
                    'aspect-[3/2] w-[calc((100%-18px)/4)] shrink-0 overflow-hidden rounded-md border-2 bg-black outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    index === active ? 'border-primary' : 'border-transparent',
                  )}
                >
                  <img
                    src={assetUrl(item.url)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          {title.previewPageTotal > pages.length && (
            <Link
              to="/titles/$titleId"
              params={{ titleId: title.id }}
              hash="samples"
              className="self-start text-sm text-primary-text hover:underline"
            >
              {t('preview.seeAll', { count: title.previewPageTotal })}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The editions, then one button saying what it does: "Add to Cart · $29.99"
 * (the chosen edition), "Get it free", "Pre-order · $17.99"; for an owner the
 * library, and nothing to buy once the title is withdrawn. The heart beside.
 * Every word here is 14px.
 */
function BuyArea({
  title,
  edition,
  onSkuChange,
}: {
  title: TitlePreview
  edition: PreviewEdition | undefined
  onSkuChange: (sku: string) => void
}) {
  const { t } = useTranslation('home')
  const formatMoney = useFormatMoney()
  const add = useAddToCart(title)
  const buying = title.available && !title.owned
  const price = edition && formatMoney(edition.price)

  const action = !title.available ? (
    <Button disabled className="h-11 flex-1 rounded-lg text-sm">
      {t('preview.unavailable')}
    </Button>
  ) : title.owned ? (
    <Button
      asChild
      variant="outline"
      className="h-11 flex-1 rounded-lg border-success text-sm text-success hover:text-success"
    >
      <Link to="/library">
        <LibraryBigIcon aria-hidden />
        {t('preview.inLibrary')}
      </Link>
    </Button>
  ) : (
    <Button
      onClick={() => edition && add.addToCart(edition)}
      disabled={!edition || add.isPending}
      className="h-11 flex-1 rounded-lg text-sm"
    >
      {!edition || !price
        ? t('preview.unavailable')
        : title.upcoming
          ? t('preview.preorder', { price })
          : edition.price.amount === 0
            ? t('preview.getFree')
            : t('preview.addToCart', { price })}
    </Button>
  )

  return (
    <div className="flex flex-col gap-3 text-sm">
      {buying && title.editions.length > 0 && (
        <EditionPicker
          editions={title.editions}
          value={edition?.sku ?? ''}
          onChange={onSkuChange}
        />
      )}
      <div className="flex gap-2">
        {action}
        <WishlistButton title={title} className="size-11" />
      </div>
    </div>
  )
}

/** The panel's outline while its first preview loads: never a blank box. */
export function PreviewSkeleton() {
  return (
    <div>
      <LoadingStatus />
      <div aria-hidden>
        <div className={PAD}>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-1">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>
        <Skeleton className="aspect-[3/2] w-full rounded-none" />
        <div className={PAD}>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9" />
            ))}
          </div>
          <Skeleton className="h-12" />
          <Skeleton className="h-14 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-lg" />
            <Skeleton className="size-11 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
