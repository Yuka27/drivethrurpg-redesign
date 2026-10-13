import { useId } from 'react'

import { SettingsRow } from './settings-card'
import { Switch } from '@/components/ui/switch'

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
