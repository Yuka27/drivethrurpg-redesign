import { XIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export type AppliedFilter = {
  /** unique per chip, e.g. "publisher:pub_free_league" */
  key: string
  /** "Publisher: Free League Publishing" */
  label: string
  onRemove: () => void
}

/**
 * The filters that are on, as removable chips, then "+ N more" and "Clear all".
 * Figma: the desktop row shows about two lines' worth, the mobile row one chip;
 * `shown` sets how many before "+ N more".
 */
export function AppliedFilters({
  filters,
  onClearAll,
  shown,
  className,
}: {
  filters: Array<AppliedFilter>
  onClearAll: () => void
  shown: number
  className?: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if (filters.length === 0) return null

  const visible = expanded ? filters : filters.slice(0, shown)
  const hidden = filters.length - visible.length

  return (
    <div
      role="group"
      aria-label={t('filters.applied')}
      className={cn('flex flex-wrap items-center gap-1', className)}
    >
      {visible.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={filter.onRemove}
          aria-label={t('filters.remove', { filter: filter.label })}
          className="inline-flex h-[22px] max-w-full items-center gap-1 rounded-sm bg-background/70 px-2 text-xs font-medium hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-muted"
        >
          <span className="truncate">{filter.label}</span>
          <XIcon aria-hidden className="size-3 shrink-0" />
        </button>
      ))}
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="px-1 text-xs text-primary hover:underline"
        >
          {expanded
            ? t('filters.showLess')
            : t('filters.more', { count: hidden })}
        </button>
      )}
      <button
        type="button"
        onClick={onClearAll}
        className="px-1 text-xs text-primary hover:underline"
      >
        {t('filters.clearAll')}
      </button>
    </div>
  )
}
