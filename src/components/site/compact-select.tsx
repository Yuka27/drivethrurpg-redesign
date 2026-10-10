import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type CompactSelectOption = {
  value: string
  /** text shown in the trigger, e.g. "PLN" or "Eng" */
  short: string
  /** text shown in the list, e.g. "Polski" or "PLN · Polish złoty (zł)" */
  label: string
}

type CompactSelectProps = {
  label: string
  value: string
  options: Array<CompactSelectOption>
  onValueChange: (value: string) => void
  className?: string
}

/** Borderless pill select used for currency and language ("PLN ▾", "Eng ▾"). */
export function CompactSelect({
  label,
  value,
  options,
  onValueChange,
  className,
}: CompactSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-6 gap-1 rounded-full border-0 bg-transparent px-2 text-xs font-medium shadow-none hover:bg-accent data-[size=default]:h-6 dark:bg-transparent dark:hover:bg-accent [&_svg]:size-3 [&_svg]:opacity-100 [&_svg:not([class*='text-'])]:text-foreground",
          className,
        )}
      >
        <SelectValue>
          {options.find((option) => option.value === value)?.short}
        </SelectValue>
      </SelectTrigger>
      {/* popper: open below the pill. The default "item-aligned" puts the selected
          option over the 24px trigger, which near the top of the page scrolls the
          options above it out of view behind a scroll-up arrow */}
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
