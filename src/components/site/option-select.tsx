import type { ReactNode } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string }

/**
 * Figma: 36px outline button with the value and a chevron; the list opens below
 * it (popper), never over it.
 */
export function OptionSelect({
  label,
  value,
  options,
  onValueChange,
  display,
  className,
}: {
  /** accessible name (the row's visible label) */
  label: string
  value: string | undefined
  options: Array<SelectOption>
  onValueChange: (value: string) => void
  /** what the closed select shows, when shorter than the option label ("$ USD") */
  display?: ReactNode
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          'h-9 gap-1 rounded-lg border-border bg-background px-2.5 font-medium text-foreground shadow-none data-[size=default]:h-9 dark:bg-background dark:hover:bg-accent [&_svg:not([class*=text-])]:text-foreground',
          className,
        )}
      >
        <SelectValue>{display}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
