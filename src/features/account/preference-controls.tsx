import { useId } from 'react'
import type { ReactNode } from 'react'

import { SettingsRow } from './settings-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/**
 * A setting that is on or off, saved as soon as it changes. The label and hint
 * name and describe the switch. Figma: off is a light track with a dark thumb.
 */
export function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string
  hint?: string
  /** undefined while the saved value loads (the switch is not shown yet) */
  checked: boolean | undefined
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  const id = useId()

  return (
    <SettingsRow
      label={<label htmlFor={id}>{label}</label>}
      hint={hint && <span id={`${id}-hint`}>{hint}</span>}
      actions={
        checked !== undefined && (
          <Switch
            id={id}
            checked={checked}
            disabled={disabled}
            onCheckedChange={onCheckedChange}
            aria-describedby={hint ? `${id}-hint` : undefined}
            className="data-[state=unchecked]:bg-secondary-foreground"
          />
        )
      }
    />
  )
}

export type SelectOption = { value: string; label: string }

/**
 * Figma: 36px outline button with the value and a chevron; the list opens below
 * it (popper), never over it.
 */
export function PreferenceSelect({
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
