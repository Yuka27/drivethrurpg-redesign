import { Link } from '@tanstack/react-router'
import { DownloadIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { LibraryCard, LibraryCardSkeleton } from './library-card'
import { LibraryEmpty, LibraryNoMatch } from './library-empty'
import { LibraryFilterPanel } from './library-filter-panel'
import {
  activeFilterCount,
  filterLibrary,
  sortLibrary,
} from './library-filters'
import { LIBRARY_SEARCH_DEFAULTS, LIBRARY_SORTS } from './library-search'
import type { LibrarySearch, LibrarySort } from './library-search'
import {
  useDownloadBundle,
  useFileDownload,
  useLibrary,
  useMarkUpdatesSeen,
} from '@/api/library'
import type { LibraryFile, LibraryItem } from '@/api/library'
import { pageTitleClass } from '@/features/account/account-page'
import { FilterPanelSkeleton } from '@/components/filters/filter-panel-skeleton'
import { FilterSheet } from '@/components/filters/filter-sheet'
import { ErrorState } from '@/components/site/empty-state'
import { LoadingStatus } from '@/components/site/loading-status'
import { OptionSelect } from '@/components/site/option-select'
import { Pagination } from '@/components/site/pagination'
import { SearchField } from '@/components/site/search-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { openInNewTab } from '@/lib/open-in-new-tab'

/** Figma: twelve cards a page. */
const PAGE_SIZE = 12

/** Everything but the filters themselves: sort and search stay as they are. */
const CLEARED_FILTERS = {
  status: LIBRARY_SEARCH_DEFAULTS.status,
  system: '',
  type: '',
  format: '',
  publisher: '',
  page: 1,
} satisfies Partial<LibrarySearch>

/**
 * /library: what the user owns. Desktop: the filters in a sidebar; mobile: a
 * "Filters" button opening them in a bottom sheet. The whole library is loaded
 * once and filtered, sorted and paged here (see useLibrary); the filters live in
 * the URL (`search`, from the route).
 */
export function LibraryPage({
  search,
  onSearchChange,
}: {
  search: LibrarySearch
  onSearchChange: (patch: Partial<LibrarySearch>) => void
}) {
  const { t } = useTranslation(['library', 'common'])
  const library = useLibrary()
  const fileDownload = useFileDownload()
  const bundle = useDownloadBundle()
  const markSeen = useMarkUpdatesSeen()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [sheetOpen, setSheetOpen] = useState(false)

  const all = library.data
  const results = useMemo(
    () => (all ? sortLibrary(filterLibrary(all, search), search.sort) : []),
    [all, search],
  )
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const page = Math.min(search.page, pageCount)
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // selection covers what is on screen: a filter or page change leaves it behind
  const picked = pageItems.filter((item) => selected.has(item.id))
  const allPicked = pageItems.length > 0 && picked.length === pageItems.length
  const setPicked = (ids: Iterable<string>, on: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })

  const failed = () => toast.error(t('downloadFailed'))
  const downloadFile = (file: LibraryFile) =>
    openInNewTab(() => fileDownload.mutateAsync(file.id)).catch(failed)
  const downloadBundle = (items: Array<LibraryItem>) =>
    openInNewTab(() => bundle.mutateAsync(items.map((item) => item.id))).then(
      () =>
        setPicked(
          items.map((item) => item.id),
          false,
        ),
      failed,
    )
  // one file: that file; several: the title's files zipped. Either way the
  // "Updated" badge has done its job.
  const download = (item: LibraryItem) => {
    const done =
      item.files.length === 1
        ? openInNewTab(() => fileDownload.mutateAsync(item.files[0].id))
        : openInNewTab(() => bundle.mutateAsync([item.id]))
    done.then(() => item.hasUpdate && markSeen.mutate(item.id), failed)
  }

  const sortLabels = Object.fromEntries(
    LIBRARY_SORTS.map((sort) => [sort, t(`sorts.${sort}`)]),
  ) as Record<LibrarySort, string>
  const activeCount = activeFilterCount(search)
  const clearFilters = () => onSearchChange(CLEARED_FILTERS)

  const panelProps = { items: all ?? [], search, onSearchChange }

  return (
    <div className="container flex gap-8 pt-4 pb-8 lg:pt-8">
      <aside
        aria-label={t('common:filters.title')}
        className="w-[276px] shrink-0 max-lg:hidden"
      >
        {library.isPending ? (
          <FilterPanelSkeleton variant="sidebar" />
        ) : (
          <LibraryFilterPanel {...panelProps} variant="sidebar" />
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-center justify-between gap-4">
          <h1 className={pageTitleClass}>{t('title')}</h1>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1">
            <Link to="/account/settings" hash="library-apps">
              <DownloadIcon aria-hidden />
              {t('getApp')}
            </Link>
          </Button>
        </div>

        {library.isError ? (
          <ErrorState
            title={t('emptyState.loadError')}
            onRetry={() => void library.refetch()}
            className="rounded-md bg-card"
          />
        ) : all?.length === 0 ? (
          <LibraryEmpty />
        ) : (
          <div className="flex flex-col gap-4">
            <SearchField
              label={t('search')}
              placeholder={t('searchPlaceholder')}
              value={search.q}
              onChange={(q) => onSearchChange({ q, page: 1 })}
            />

            {/* phones: the bulk download button wraps onto a row of its own */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 lg:flex-nowrap lg:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2 max-lg:contents">
                <Checkbox
                  id="library-select-all"
                  checked={
                    allPicked
                      ? true
                      : picked.length > 0
                        ? 'indeterminate'
                        : false
                  }
                  disabled={pageItems.length === 0}
                  onCheckedChange={() =>
                    setPicked(
                      pageItems.map((item) => item.id),
                      !allPicked,
                    )
                  }
                />
                <label
                  htmlFor="library-select-all"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {t('selectAll')}
                </label>
                {picked.length > 0 ? (
                  <Button
                    size="sm"
                    className="order-last h-7 gap-1 px-2 max-lg:w-full lg:ml-2"
                    disabled={bundle.isPending}
                    onClick={() => downloadBundle(picked)}
                  >
                    <DownloadIcon aria-hidden />
                    {t('downloadSelected', { count: picked.length })}
                  </Button>
                ) : (
                  results.length > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground max-lg:hidden">
                      {t('showing', {
                        from: (page - 1) * PAGE_SIZE + 1,
                        to: (page - 1) * PAGE_SIZE + pageItems.length,
                        total: results.length,
                      })}
                    </span>
                  )
                )}
              </div>
              <div className="ml-auto flex items-center gap-1.5 lg:gap-2">
                <div className="lg:hidden">
                  <FilterSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    activeCount={activeCount}
                    resultCount={results.length}
                    onClearAll={clearFilters}
                  >
                    <LibraryFilterPanel {...panelProps} variant="sheet" />
                  </FilterSheet>
                </div>
                <OptionSelect
                  label={t('sort')}
                  value={search.sort}
                  options={LIBRARY_SORTS.map((sort) => ({
                    value: sort,
                    label: sortLabels[sort],
                  }))}
                  onValueChange={(sort) =>
                    onSearchChange({ sort: sort as LibrarySort, page: 1 })
                  }
                  // phones: no "Sort:" prefix, or the row does not fit
                  display={
                    <>
                      <span className="max-lg:hidden">
                        {t('sortDisplay', { option: sortLabels[search.sort] })}
                      </span>
                      <span className="lg:hidden">
                        {sortLabels[search.sort]}
                      </span>
                    </>
                  }
                  className="h-7 text-xs data-[size=default]:h-7"
                />
              </div>
            </div>

            {library.isPending ? (
              <div>
                <LoadingStatus />
                <ul aria-busy className="flex flex-col gap-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <LibraryCardSkeleton key={index} />
                  ))}
                </ul>
              </div>
            ) : results.length === 0 ? (
              <LibraryNoMatch
                query={search.q}
                owned={all?.length ?? 0}
                // a search clears first; then the filters
                onClear={() =>
                  search.q.trim()
                    ? onSearchChange({ q: '', page: 1 })
                    : clearFilters()
                }
              />
            ) : (
              <ul aria-label={t('title')} className="flex flex-col gap-2">
                {pageItems.map((item) => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onSelectedChange={(on) => setPicked([item.id], on)}
                    onDownload={() => download(item)}
                    onDownloadFile={downloadFile}
                    onMarkSeen={() => markSeen.mutate(item.id)}
                    downloading={fileDownload.isPending || bundle.isPending}
                  />
                ))}
              </ul>
            )}

            {pageCount > 1 && (
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={(next) => onSearchChange({ page: next })}
                className="self-center"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
