import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Up to 7 slots: every page when they fit, otherwise first, last and the pages around the current one. */
function pageSlots(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const from = Math.max(2, Math.min(page - 1, pageCount - 4))
  const to = Math.min(pageCount - 1, Math.max(page + 1, 5))
  return [
    1,
    ...(from > 2 ? (['gap'] as const) : []),
    ...Array.from({ length: to - from + 1 }, (_, i) => from + i),
    ...(to < pageCount - 1 ? (['gap'] as const) : []),
    pageCount,
  ]
}

const buttonClass =
  'h-8 rounded-lg border-border bg-background shadow-none dark:bg-background'

/** "← Prev · 1 2 3 4 · Next →", 32px buttons, the current page filled with the primary colour. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  /** 1-based */
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}) {
  const { t } = useTranslation()
  if (pageCount <= 1) return null

  return (
    <nav
      aria-label={t('pagination.label')}
      className={cn('flex items-center justify-center gap-1', className)}
    >
      <Button
        variant="outline"
        className={cn(buttonClass, 'gap-1 px-2.5')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ArrowLeftIcon aria-hidden />
        {t('pagination.prev')}
      </Button>
      <ul className="flex items-center gap-0.5">
        {pageSlots(page, pageCount).map((slot, index) =>
          slot === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden className="w-6 text-center">
              …
            </li>
          ) : (
            <li key={slot}>
              <Button
                variant="outline"
                aria-label={t('pagination.page', { page: slot })}
                aria-current={slot === page ? 'page' : undefined}
                onClick={() => onPageChange(slot)}
                className={cn(
                  buttonClass,
                  'size-8 p-0',
                  slot === page &&
                    'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:bg-primary',
                )}
              >
                {slot}
              </Button>
            </li>
          ),
        )}
      </ul>
      <Button
        variant="outline"
        className={cn(buttonClass, 'gap-1 px-2.5')}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        {t('pagination.next')}
        <ArrowRightIcon aria-hidden />
      </Button>
    </nav>
  )
}
