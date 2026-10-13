import { FunnelIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { toTitleFilters } from './listing-search'
import type { FilterPatch, ListingSearch } from './listing-search'
import { useTitleCounts } from '@/api/titles'
import {
  EmptyActions,
  EmptyLabel,
  EmptyState,
} from '@/components/site/empty-state'
import { Button } from '@/components/ui/button'
import { useFormatNumber } from '@/i18n/format'

/** Enough ways out without a wall of rows. */
const SHOWN = 3

/**
 * Mockup "Listing: filters too narrow": clear them all, or remove one at a
 * time, each with the number of titles it would bring back (one cheap
 * GET /titles each).
 */
export function ListingEmpty({
  search,
  removals,
  onSearchChange,
  onClearAll,
}: {
  search: ListingSearch
  removals: Array<{ key: string; label: string; patch: FilterPatch }>
  onSearchChange: (patch: FilterPatch) => void
  onClearAll: () => void
}) {
  const { t } = useTranslation('listing')
  const formatNumber = useFormatNumber()
  const shown = removals.slice(0, SHOWN)
  const counts = useTitleCounts(
    shown.map(({ patch }) => toTitleFilters({ ...search, ...patch })),
  )

  return (
    <EmptyState
      icon={<FunnelIcon />}
      title={t('emptyState.title')}
      text={t('emptyState.text')}
      className="rounded-xl bg-card"
    >
      <EmptyActions>
        <Button onClick={onClearAll} className="rounded-lg">
          {t('emptyState.clearAll')}
        </Button>
      </EmptyActions>
      {shown.length > 1 && (
        <>
          <EmptyLabel id="loosen-one">{t('emptyState.loosen')}</EmptyLabel>
          <ul
            aria-labelledby="loosen-one"
            className="grid w-full max-w-[400px] gap-2 text-left"
          >
            {shown.map(({ key, label, patch }, index) => {
              const count = counts[index]?.data
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onSearchChange({ ...patch, page: 1 })}
                    className="flex w-full items-center justify-between gap-3 rounded-[10px] border bg-background px-3.5 py-3 text-sm hover:bg-secondary"
                  >
                    <span>{t('emptyState.remove', { filter: label })}</span>
                    {count !== undefined && (
                      <span className="shrink-0 font-semibold text-success">
                        {t('emptyState.count', {
                          count,
                          formatted: formatNumber(count),
                        })}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </EmptyState>
  )
}
