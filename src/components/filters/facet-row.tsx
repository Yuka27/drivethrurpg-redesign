import type { ReactNode } from 'react'

import { useFormatNumber } from '@/i18n/format'

/** One option: the control, its label, and the count on the right. */
export function FacetRow({
  id,
  control,
  label,
  count,
}: {
  id: string
  control: ReactNode
  label: string
  count: number
}) {
  const formatNumber = useFormatNumber()

  return (
    <div className="flex items-center gap-2">
      {control}
      <label
        htmlFor={id}
        className="min-w-0 flex-1 cursor-pointer text-sm leading-5 font-medium [overflow-wrap:anywhere]"
      >
        {label}
      </label>
      <span className="w-8 shrink-0 text-right text-sm font-medium text-muted-foreground">
        {formatNumber(count)}
      </span>
    </div>
  )
}
