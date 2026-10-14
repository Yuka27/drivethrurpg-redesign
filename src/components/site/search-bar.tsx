import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ClockIcon,
  SearchIcon,
  TrendingUpIcon,
  XIcon,
} from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { LoadingStatus } from './loading-status'
import { PublisherLogo } from './publisher-logo'
import { assetUrl } from '@/api/client'
import {
  MIN_SUGGEST_LENGTH,
  usePopularSearches,
  useSearchSuggestions,
} from '@/api/search'
import type { Suggestions } from '@/api/search'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormatMoney } from '@/i18n/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import { useRecentSearches } from '@/stores/recent-searches'

/** Four titles, two publishers, four suggested searches. */
const LIMITS = { queries: 4, titles: 4, publishers: 2 }

type SuggestedTitle = Suggestions['titles'][number]
type SuggestedPublisher = Suggestions['publishers'][number]

/** Something the arrow keys move through and Enter picks. */
type Option =
  | { kind: 'recent' | 'query'; value: string }
  | { kind: 'title'; value: SuggestedTitle }
  | { kind: 'publisher'; value: SuggestedPublisher }
  | { kind: 'all'; value: string }

/** Every word of the query, bold and underlined where it appears. */
export function highlight(text: string, query: string): ReactNode {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (words.length === 0) return text
  const pattern = new RegExp(`(${words.join('|')})`, 'ig')
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={index}
        className="bg-transparent font-bold text-foreground underline decoration-primary/70 decoration-2 underline-offset-4"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  )
}

/**
 * The header's search. Focused:
 * recent and popular searches. Typing: suggested searches, titles and
 * publishers (GET /search/suggest), and "See all results". ↑ ↓ move, Enter
 * picks (or searches), Esc closes. Desktop: a panel under the field over a
 * dimmed page; phones: full screen with a back button.
 */
export function SearchBar({
  className,
  initialQuery = '',
}: {
  className?: string
  /** the words of the search on screen (/search?q=) */
  initialQuery?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const id = useId()
  const listId = `${id}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const q = query.trim()
  const settled = useDebouncedValue(q)
  const typing = q.length >= MIN_SUGGEST_LENGTH
  const suggestions = useSearchSuggestions(settled)
  const popularQuery = usePopularSearches()
  const popular = popularQuery.data ?? []
  const recent = useRecentSearches((state) => state.queries)
  const addRecent = useRecentSearches((state) => state.add)
  const removeRecent = useRecentSearches((state) => state.remove)
  const clearRecent = useRecentSearches((state) => state.clear)

  // the answer for these words (not an older one kept on screen)
  const data =
    typing && settled === q && !suggestions.isPlaceholderData
      ? suggestions.data
      : undefined
  const loading = typing && !data

  const queries = (data?.queries ?? [])
    .filter((item) => item.toLocaleLowerCase() !== q.toLocaleLowerCase())
    .slice(0, LIMITS.queries)
  const titles = data?.titles.slice(0, LIMITS.titles) ?? []
  const publishers = data?.publishers.slice(0, LIMITS.publishers) ?? []
  const nothing =
    data !== undefined &&
    queries.length === 0 &&
    titles.length === 0 &&
    publishers.length === 0

  const options: Array<Option> = !q
    ? recent.map((value) => ({ kind: 'recent', value }))
    : [
        ...queries.map((value) => ({ kind: 'query' as const, value })),
        ...titles.map((value) => ({ kind: 'title' as const, value })),
        ...publishers.map((value) => ({ kind: 'publisher' as const, value })),
        { kind: 'all', value: q },
      ]
  const optionId = (index: number) => `${id}-option-${index}`

  // closed by a click anywhere else (desktop; phones close with the back button)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = () => {
    setOpen(false)
    setActive(-1)
  }

  const search = (words: string) => {
    const value = words.trim()
    if (!value) return
    addRecent(value)
    setQuery(value)
    close()
    inputRef.current?.blur()
    void navigate({ to: '/search', search: { q: value } })
  }

  const pick = (option: Option) => {
    switch (option.kind) {
      case 'recent':
      case 'query':
      case 'all':
        search(option.value)
        return
      case 'title':
        close()
        inputRef.current?.blur()
        void navigate({
          to: '/titles/$titleId',
          params: { titleId: option.value.id },
        })
        return
      case 'publisher':
        close()
        inputRef.current?.blur()
        void navigate({ to: '/titles', search: { publisher: option.value.id } })
    }
  }

  const move = (step: number) => {
    if (options.length === 0) return
    setActive((current) =>
      current < 0 && step < 0
        ? options.length - 1
        : (current + step + options.length) % options.length,
    )
  }

  // the rows keep focus in the field: a click picks without blurring first
  const rowProps = (index: number) => ({
    id: optionId(index),
    role: 'option' as const,
    'aria-selected': active === index,
    onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
    onClick: () => pick(options[index]),
    onMouseEnter: () => setActive(index),
  })
  const rowClass = (index: number) =>
    cn(
      'flex min-h-11 cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2',
      active === index && 'bg-accent shadow-[inset_2px_0_0_var(--primary)]',
    )

  let index = -1
  const next = () => ++index

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative',
        className,
        // phones: the search takes the whole screen while it is open
        open &&
          'max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:m-0 max-lg:flex max-lg:w-full max-lg:flex-col max-lg:bg-background',
      )}
    >
      {open && (
        <div
          aria-hidden
          onPointerDown={close}
          className="fixed inset-x-0 top-[var(--header-h,0px)] bottom-0 z-30 bg-black/55 backdrop-blur-[1px] max-lg:hidden"
        />
      )}
      <form
        role="search"
        className={cn(
          'relative z-40 flex items-center gap-2',
          open && 'max-lg:border-b max-lg:px-3 max-lg:py-2.5',
        )}
        onSubmit={(event) => {
          event.preventDefault()
          const option = open && active >= 0 ? options.at(active) : undefined
          if (option) pick(option)
          else search(query)
        }}
      >
        {open && (
          <button
            type="button"
            aria-label={t('header.search.close')}
            onClick={close}
            className="grid size-10 shrink-0 place-items-center rounded-[10px] lg:hidden"
          >
            <ArrowLeftIcon aria-hidden className="size-5" />
          </button>
        )}
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            role="combobox"
            aria-label={t('header.search.label')}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={
              open && active >= 0 ? optionId(active) : undefined
            }
            autoComplete="off"
            spellCheck={false}
            placeholder={t('header.search.placeholder')}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(-1)
              setOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (open) move(1)
                else setOpen(true)
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                move(-1)
              } else if (event.key === 'Escape') {
                close()
              }
            }}
            className={cn(
              'h-8 w-full min-w-0 rounded-lg border border-border bg-card pr-9 pl-8 text-sm outline-none placeholder:text-muted-foreground',
              'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/22',
              open && 'border-primary ring-[3px] ring-primary/22',
            )}
          />
          {query && (
            <button
              type="button"
              aria-label={t('header.search.clear')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery('')
                setActive(-1)
                setOpen(true)
                inputRef.current?.focus()
              }}
              className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-secondary"
            >
              <XIcon aria-hidden className="size-3.5" />
            </button>
          )}
        </div>
      </form>

      {open && (
        <div
          className={cn(
            'z-40 flex flex-col overflow-hidden bg-popover',
            'lg:absolute lg:inset-x-0 lg:top-[calc(100%+8px)] lg:rounded-[14px] lg:border lg:shadow-popover',
            'max-lg:min-h-0 max-lg:flex-1 max-lg:bg-background',
          )}
        >
          <div
            id={listId}
            role="listbox"
            aria-label={t('header.search.suggestions')}
            className="overflow-y-auto py-1.5 lg:max-h-[min(560px,calc(100vh-220px))]"
          >
            {!q ? (
              <>
                {recent.length > 0 && (
                  <Section
                    title={t('header.search.recent')}
                    action={
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={clearRecent}
                        className="text-xs font-normal tracking-normal normal-case hover:text-foreground"
                      >
                        {t('header.search.clearRecent')}
                      </button>
                    }
                  >
                    {recent.map((value) => {
                      const i = next()
                      return (
                        <div
                          key={value}
                          {...rowProps(i)}
                          className={rowClass(i)}
                        >
                          <RowIcon>
                            <ClockIcon />
                          </RowIcon>
                          <span className="min-w-0 flex-1 truncate text-[15px]">
                            {value}
                          </span>
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-label={t('header.search.removeRecent', {
                              q: value,
                            })}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event) => {
                              event.stopPropagation()
                              removeRecent(value)
                            }}
                            className="grid size-[30px] shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <XIcon aria-hidden className="size-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </Section>
                )}
                <PopularChips
                  terms={popular}
                  loading={popularQuery.isPending}
                  onSearch={search}
                />
              </>
            ) : loading ? (
              <div className="px-2 pt-2 pb-1">
                <LoadingStatus />
                <div aria-hidden>
                  {/* suggested searches, then titles, as the answer will be */}
                  <Skeleton className="mx-2.5 my-2.5 h-2.5 w-24" />
                  {[56, 40].map((width, row) => (
                    <div
                      key={row}
                      className="flex items-center gap-3 px-2.5 py-2"
                    >
                      <Skeleton className="size-5 shrink-0 rounded-full" />
                      <Skeleton
                        className="h-3.5"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  ))}
                  <Skeleton className="mx-2.5 mt-3 mb-2.5 h-2.5 w-16" />
                  {Array.from({ length: 3 }, (_, row) => (
                    <div
                      key={row}
                      className="flex items-center gap-3 px-2.5 py-2"
                    >
                      <Skeleton className="h-[46px] w-[34px] shrink-0" />
                      <span className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2.5 w-1/3" />
                      </span>
                      <Skeleton className="h-3.5 w-10 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ) : nothing ? (
              <>
                <div className="px-5 pt-5 pb-2">
                  <p className="text-[15px] font-bold">
                    {t('header.search.noMatch', { q })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('header.search.noMatchHint')}
                  </p>
                </div>
                <PopularChips terms={popular} onSearch={search} />
              </>
            ) : (
              <>
                {queries.length > 0 && (
                  <Section title={t('header.search.suggested')}>
                    {queries.map((value) => {
                      const i = next()
                      return (
                        <div
                          key={value}
                          {...rowProps(i)}
                          className={rowClass(i)}
                        >
                          <RowIcon>
                            <SearchIcon />
                          </RowIcon>
                          <span className="min-w-0 flex-1 truncate text-[15px]">
                            {highlight(value, q)}
                          </span>
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-label={t('header.search.fill', { q: value })}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event) => {
                              event.stopPropagation()
                              setQuery(value)
                              setActive(-1)
                            }}
                            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUpRightIcon aria-hidden className="size-4" />
                          </button>
                        </div>
                      )
                    })}
                  </Section>
                )}
                {titles.length > 0 && (
                  <Section title={t('header.search.titles')}>
                    {titles.map((title) => {
                      const i = next()
                      return (
                        <SuggestedTitleRow
                          key={title.id}
                          suggestion={title}
                          query={q}
                          {...rowProps(i)}
                          className={rowClass(i)}
                        />
                      )
                    })}
                  </Section>
                )}
                {publishers.length > 0 && (
                  <Section title={t('header.search.publishers')}>
                    {publishers.map((publisher) => {
                      const i = next()
                      return (
                        <div
                          key={publisher.id}
                          {...rowProps(i)}
                          className={rowClass(i)}
                        >
                          <PublisherLogo
                            name={publisher.name}
                            url={undefined}
                            className="size-[34px] rounded-full text-xs"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px]">
                              {highlight(publisher.name, q)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {t('header.search.publisher')}
                            </span>
                          </span>
                        </div>
                      )
                    })}
                  </Section>
                )}
              </>
            )}
          </div>

          {q && (
            <div
              {...rowProps(options.length - 1)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 border-t bg-black/20 px-[18px] py-3 text-[15px] hover:bg-accent',
                active === options.length - 1 && 'bg-accent',
              )}
            >
              <span className="min-w-0 truncate">
                <Trans
                  t={t}
                  i18nKey="header.search.seeAll"
                  values={{ q }}
                  components={{ q: <b /> }}
                />
              </span>
              <span className="flex shrink-0 items-center gap-1.5 font-bold text-primary-text">
                {t('header.search.keyEnter')}
                <ArrowRightIcon aria-hidden className="size-3.5" />
              </span>
            </div>
          )}
          <p className="flex gap-3.5 border-t px-[18px] py-2 text-xs text-muted-foreground max-lg:hidden">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> {t('header.search.hintMove')}
            </span>
            <span>
              <Kbd>{t('header.search.keyEnter')}</Kbd>{' '}
              {t('header.search.hintSearch')}
            </span>
            <span>
              <Kbd>{t('header.search.keyEsc')}</Kbd>{' '}
              {t('header.search.hintClose')}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="px-2 pt-2 pb-1">
      <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
        <span id={id}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center text-muted-foreground [&_svg]:size-[17px]"
    >
      {children}
    </span>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[5px] border border-b-2 bg-secondary px-1.5 py-px text-[11px] font-semibold text-foreground">
      {children}
    </kbd>
  )
}

/** Popular searches as chips: each runs that search. */
function PopularChips({
  terms,
  loading = false,
  onSearch,
}: {
  terms: Array<string>
  /** chip-shaped placeholders while GET /search/popular loads */
  loading?: boolean
  onSearch: (q: string) => void
}) {
  const { t } = useTranslation()
  if (loading)
    return (
      <Section title={t('header.search.popular')}>
        <div aria-hidden className="flex flex-wrap gap-2 px-2.5 pt-1 pb-2">
          {[88, 112, 72, 96, 120].map((width, index) => (
            <Skeleton
              key={index}
              className="h-[34px] rounded-full"
              style={{ width }}
            />
          ))}
        </div>
      </Section>
    )
  if (terms.length === 0) return null
  return (
    <Section title={t('header.search.popular')}>
      <div className="flex flex-wrap gap-2 px-2.5 pt-1 pb-2">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSearch(term)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border bg-secondary px-3 text-[13px] font-medium hover:border-foreground/35"
          >
            <TrendingUpIcon aria-hidden className="size-3.5" />
            {term}
          </button>
        ))}
      </div>
    </Section>
  )
}

/** A suggested title: cover, name, publisher and formats, price. */
function SuggestedTitleRow({
  suggestion: title,
  query,
  className,
  ...props
}: {
  suggestion: SuggestedTitle
  query: string
  className: string
} & React.HTMLAttributes<HTMLDivElement>) {
  const formatMoney = useFormatMoney()
  const facetLabel = useFacetLabel()
  const was =
    title.listPrice && title.listPrice.amount > title.price.amount
      ? title.listPrice
      : null

  return (
    <div {...props} className={className}>
      <span className="h-[46px] w-[34px] shrink-0 overflow-hidden rounded-[5px] border bg-card">
        {title.cover && (
          <img
            src={assetUrl(title.cover.url)}
            alt=""
            className="size-full object-cover"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {highlight(title.title, query)}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {[
            title.publisher.name,
            title.formats
              .map((format) => facetLabel('format', format))
              .join(', '),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm font-extrabold tabular-nums">
        {formatMoney(title.price)}
        {was && (
          <s className="block text-[11px] font-normal text-muted-foreground">
            {formatMoney(was)}
          </s>
        )}
      </span>
    </div>
  )
}
