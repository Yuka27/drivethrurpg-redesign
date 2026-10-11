import { SlidersHorizontalIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

/**
 * Mobile filters: a "Filters" button (with how many are on) that opens a bottom
 * sheet. Changes apply as they are made; "Show N results" just closes it.
 */
export function FilterSheet({
  activeCount,
  resultCount,
  onClearAll,
  open,
  onOpenChange,
  children,
}: {
  activeCount: number
  resultCount: number
  onClearAll: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the FilterGroups, with variant="sheet" */
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <SlidersHorizontalIcon aria-hidden />
          {t('filters.title')}
          {activeCount > 0 && (
            <span className="grid size-4 place-items-center rounded-full bg-primary text-[0.625rem] leading-none font-semibold text-primary-foreground">
              {activeCount}
              <span className="sr-only">{t('filters.active')}</span>
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] gap-0 rounded-t-xl border-0 bg-popover"
      >
        <SheetHeader className="flex-row items-center gap-2.5 border-b border-muted pr-12">
          <SheetTitle className="flex-1 text-base font-medium">
            {t('filters.title')}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t('filters.description')}
          </SheetDescription>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-1 text-xs text-primary hover:underline"
            >
              {t('filters.clearAll')}
            </button>
          )}
        </SheetHeader>
        <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain px-4 py-2">
          {children}
        </div>
        <SheetFooter className="p-5">
          <Button onClick={() => onOpenChange(false)}>
            {t('filters.showResults', { count: resultCount })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
