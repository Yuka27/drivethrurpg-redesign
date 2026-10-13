import { SearchIcon } from 'lucide-react'
import { useId } from 'react'

import { Input } from '@/components/ui/input'

/** The compact search box above account lists (Following, Orders). */
export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()

  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-8 rounded-lg border-border bg-card pl-8 shadow-none dark:bg-card"
      />
    </div>
  )
}
