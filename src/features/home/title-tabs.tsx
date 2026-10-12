import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import { useTitle } from '@/api/titles'
import type { HomeSection, TitleCard } from '@/api/titles'
import { OptionSelect } from '@/components/site/option-select'
import { ratingVerdict, Stars } from '@/components/title/rating-stars'
import { CartButton, WishlistButton } from '@/components/title/title-actions'
import { TitlePrice } from '@/components/title/title-price'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { useFormatDate, useFormatMoney, useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

/** Figma: five titles a tab. */
const SHOWN = 5

/**
 * Figma's tabs ("New Releases", "Bestselling", "Specials", "Free & PWYW"),
 * as the API's home sections. "Popular Upcoming" has no data.
 */
const TABS = ['new', 'bestselling', 'sale', 'free'] as const
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
  const tabs = TABS.filter((tab) => (sections.get(tab)?.titles.length ?? 0) > 0)
  const [tab, setTab] = useState<Tab | undefined>(tabs[0])
  const current = tab && sections.get(tab)
  const titles = current?.titles.slice(0, SHOWN) ?? []
  const [previewId, setPreviewId] = useState<string>()
  const preview = titles.find((title) => title.id === previewId) ?? titles[0]

  if (!tab || !current) return null
  const panelId = `${id}-panel`

  const select = (next: Tab) => {
    setTab(next)
    setPreviewId(undefined)
  }

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
            onClick={() => select(item)}
            className={cn(
              'border-b-2 px-2.5 pt-0.5 pb-1 text-base',
              item === tab
                ? 'border-primary font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`tabs.${item}`)}
          </button>
        ))}
      </div>
      <div className="border-b-2 border-primary lg:hidden">
        <OptionSelect
          label={t('lists')}
          value={tab}
          options={tabs.map((item) => ({
            value: item,
            label: t(`tabs.${item}`),
          }))}
          onValueChange={(value) => select(value as Tab)}
          className="h-8 w-full justify-between border-0 bg-transparent px-0 text-base font-semibold shadow-none dark:bg-transparent"
        />
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,424px)]"
      >
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
                <TitleSummary title={title} />
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
    </section>
  )
}

function TitleSummary({ title }: { title: TitleCard }) {
  const facetLabel = useFacetLabel()
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="line-clamp-2 text-sm font-semibold lg:line-clamp-1 lg:text-base">
        {title.title}
      </span>
      <span className="truncate text-xs text-muted-foreground lg:text-sm">
        {[
          title.type && facetLabel('type', title.type),
          title.ruleSystem && facetLabel('system', title.ruleSystem),
        ]
          .filter(Boolean)
          .join(', ')}
      </span>
    </span>
  )
}

/** Desktop only: the hovered or focused title, with what its page would say first. */
function TitlePreview({ title }: { title: TitleCard }) {
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
          <span className="text-primary">
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
            <li
              key={tag}
              className="inline-flex h-[22px] items-center rounded-md border border-border px-2 text-xs font-medium"
            >
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
        {detail?.description && (
          <p className="line-clamp-5 px-4 py-1 text-sm text-muted-foreground">
            {detail.description}
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
