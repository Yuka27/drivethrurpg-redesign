import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { PreviewEdition } from '@/api/titles'
import { useFormatMoney } from '@/i18n/format'
import { cn } from '@/lib/utils'

/**
 * The editions as choices: a radio group (← → ↑ ↓ move the choice, Home and
 * End jump), each row its label, what the buyer gets, a low-stock note and
 * the price (the list price struck through on sale). A single edition is one
 * plain row, so the buyer still sees what they get.
 */
export function EditionPicker({
  editions,
  value,
  onChange,
}: {
  editions: Array<PreviewEdition>
  value: string
  onChange: (sku: string) => void
}) {
  const { t } = useTranslation('home')
  const rows = useRef<Array<HTMLButtonElement | null>>([])
  const only = editions.length === 1 ? editions[0] : undefined
  if (only)
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
        <EditionText edition={only} />
      </div>
    )

  const current = Math.max(
    editions.findIndex((edition) => edition.sku === value),
    0,
  )
  const onKeyDown = (event: KeyboardEvent) => {
    const step: Partial<Record<string, number>> = {
      ArrowDown: current + 1,
      ArrowRight: current + 1,
      ArrowUp: current - 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: editions.length - 1,
    }
    const target = step[event.key]
    if (target === undefined) return
    event.preventDefault()
    const next = (target + editions.length) % editions.length
    onChange(editions[next].sku)
    rows.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('preview.edition')}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-1.5"
    >
      {editions.map((edition, index) => {
        const checked = index === current
        return (
          <button
            key={edition.sku}
            ref={(element) => {
              rows.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            // one stop for Tab: the arrows move within the group
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(edition.sku)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              checked
                ? 'border-primary bg-secondary'
                : 'border-border hover:bg-accent',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'grid size-3.5 shrink-0 place-items-center rounded-full border-2',
                checked ? 'border-primary' : 'border-muted-foreground',
              )}
            >
              {checked && <span className="size-1.5 rounded-full bg-primary" />}
            </span>
            <EditionText edition={edition} />
          </button>
        )
      })}
    </div>
  )
}

/** Label, what the buyer gets, low stock; then the price. */
function EditionText({ edition }: { edition: PreviewEdition }) {
  const { t } = useTranslation('listing')
  const formatMoney = useFormatMoney()
  const struck = edition.onSale && edition.listPrice

  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{edition.label}</span>
        {edition.note && (
          <span className="text-muted-foreground">{edition.note}</span>
        )}
        {edition.stock === 'low_stock' && edition.stockNote && (
          <span className="text-warning">{edition.stockNote}</span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end tabular-nums">
        <span className="font-semibold">
          {edition.price.amount === 0
            ? t('price.free')
            : formatMoney(edition.price)}
        </span>
        {struck && (
          <s className="text-muted-foreground">{formatMoney(struck)}</s>
        )}
      </span>
    </>
  )
}
