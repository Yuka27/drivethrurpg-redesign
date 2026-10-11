import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { FacetOption } from './facet-option'
import { FacetRow } from './facet-row'
import { SearchField } from '@/components/site/search-field'
import { Checkbox } from '@/components/ui/checkbox'

/** Figma: five values, then "+ 36 more". */
const SHOWN = 5

/**
 * A multi-select facet. Long ones (publishers, systems) get a search box; the
 * rest of the values sit behind "+ N more". Picked values always stay visible.
 */
export function CheckboxFacet({
  options,
  selected,
  onChange,
  search,
}: {
  options: Array<FacetOption>
  selected: Array<string>
  onChange: (selected: Array<string>) => void
  /** a search box above the values: its accessible name and placeholder */
  search?: { label: string; placeholder: string }
}) {
  const { t } = useTranslation()
  const id = useId()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const q = query.trim().toLocaleLowerCase()
  const matching = q
    ? options.filter((option) => option.label.toLocaleLowerCase().includes(q))
    : options
  const visible =
    expanded || q
      ? matching
      : matching.filter(
          (option, index) => index < SHOWN || selected.includes(option.value),
        )
  const hidden = matching.length - visible.length

  const toggle = (value: string, on: boolean) =>
    onChange(
      on ? [...selected, value] : selected.filter((picked) => picked !== value),
    )

  return (
    <>
      {search && options.length > SHOWN && (
        <SearchField
          label={search.label}
          placeholder={search.placeholder}
          value={query}
          onChange={setQuery}
        />
      )}
      <div className="flex flex-col gap-1.5">
        {visible.map((option) => {
          const optionId = `${id}-${option.value}`
          return (
            <FacetRow
              key={option.value}
              id={optionId}
              label={option.label}
              count={option.count}
              control={
                <Checkbox
                  id={optionId}
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) =>
                    toggle(option.value, checked === true)
                  }
                />
              }
            />
          )
        })}
        {q && matching.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t('filters.noMatches')}
          </p>
        )}
      </div>
      {!q && (hidden > 0 || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="self-start px-6 text-xs text-primary hover:underline"
        >
          {expanded
            ? t('filters.showLess')
            : t('filters.more', { count: hidden })}
        </button>
      )}
    </>
  )
}
