import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export type QuickFilter = {
  key: string
  label: string
  active: boolean
  onToggle: () => void
}

/** Figma: "QUICK FILTERS" then outline chips; an active one turns red. */
export function QuickFilters({
  filters,
  className,
}: {
  filters: Array<QuickFilter>
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <div
      role="group"
      aria-label={t('filters.quick')}
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      <span
        aria-hidden
        className="px-1 text-xs text-muted-foreground uppercase"
      >
        {t('filters.quick')}
      </span>
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          aria-pressed={filter.active}
          onClick={filter.onToggle}
          className={cn(
            'inline-flex h-[22px] items-center rounded-md border px-2 text-xs font-medium focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
            filter.active
              ? 'border-primary text-primary-text'
              : 'border-border hover:bg-accent',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
