import { ChevronDownIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

/**
 * A collapsible filter section. Figma: the sidebar shows how many values are
 * picked as a muted "(2)" after the title and starts open; the mobile sheet shows
 * a red "2 selected" and starts closed.
 */
export function FilterGroup({
  title,
  selectedCount = 0,
  variant = 'sidebar',
  defaultOpen = variant === 'sidebar',
  children,
}: {
  title: string
  selectedCount?: number
  variant?: 'sidebar' | 'sheet'
  defaultOpen?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/filter border-b border-muted data-[state=open]:pb-3"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <span className="flex-1">
          {title}
          {variant === 'sidebar' && selectedCount > 0 && (
            <span className="font-normal text-muted-foreground">
              {' '}
              ({selectedCount})
            </span>
          )}
        </span>
        {variant === 'sheet' && selectedCount > 0 && (
          <span className="px-1 text-xs font-normal text-primary">
            {t('filters.selected', { count: selectedCount })}
          </span>
        )}
        <ChevronDownIcon
          aria-hidden
          className="size-4 transition-transform group-data-[state=open]/filter:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn('flex flex-col gap-2 pt-1')}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
