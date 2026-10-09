import { useNavigate } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SearchBarProps = {
  className?: string
}

// Suggestions dropdown comes in a later step; for now Enter goes to /search?q=
export function SearchBar({ className }: SearchBarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(event) => {
        event.preventDefault()
        const q = query.trim()
        if (q) void navigate({ to: '/search', search: { q } })
      }}
    >
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={t('header.search.label')}
        placeholder={t('header.search.placeholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-8 rounded-lg border-border bg-card pl-8 shadow-none dark:bg-card"
      />
    </form>
  )
}
