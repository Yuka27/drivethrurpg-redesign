import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { PRICE_BANDS } from './listing-search'
import type { FilterPatch, FilterSearch, ListingFacet } from './listing-search'
import { usePriceLabel } from './use-price-label'
import { useLocales } from '@/api/meta'
import { CheckboxFacet } from '@/components/filters/checkbox-facet'
import type { FacetOption } from '@/components/filters/facet-option'
import { FilterGroup } from '@/components/filters/filter-group'
import { RadioFacet } from '@/components/filters/radio-facet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCurrencySymbol, useLanguageName } from '@/i18n/format'
import { joinList, splitList } from '@/lib/search-params'

const SEARCH_BOX = {
  system: {
    label: 'searchFacet.system',
    placeholder: 'searchFacet.systemPlaceholder',
  },
  publisher: {
    label: 'searchFacet.publisher',
    placeholder: 'searchFacet.publisherPlaceholder',
  },
} as const

/**
 * The listing's filters, for the desktop sidebar and the mobile sheet alike:
 * Promotions, Genre (when the API has genres), Rule System, Product Type,
 * Price, Format, Publisher, Language. A facet without options is left out;
 * the wishlist reuses it without Language (`languages={false}`).
 */
export function ListingFilterPanel({
  search,
  onSearchChange,
  facetOptions,
  variant,
  languages: showLanguages = true,
}: {
  search: FilterSearch
  onSearchChange: (patch: FilterPatch) => void
  facetOptions: (facet: ListingFacet) => Array<FacetOption>
  variant: 'sidebar' | 'sheet'
  /** false: no Language group (data without a text language) */
  languages?: boolean
}) {
  const { t } = useTranslation('listing')
  const locales = useLocales()
  const languageName = useLanguageName()

  const facetGroup = (facet: ListingFacet) => {
    const options = facetOptions(facet)
    if (options.length === 0) return null
    const selected = splitList(search[facet])
    const box =
      facet in SEARCH_BOX ? SEARCH_BOX[facet as keyof typeof SEARCH_BOX] : null
    return (
      <FilterGroup
        key={facet}
        title={t(`groups.${facet}`)}
        selectedCount={selected.length}
        variant={variant}
      >
        <CheckboxFacet
          options={options}
          selected={selected}
          onChange={(values) =>
            onSearchChange({ [facet]: joinList(values), page: 1 })
          }
          search={
            box
              ? { label: t(box.label), placeholder: t(box.placeholder) }
              : undefined
          }
        />
      </FilterGroup>
    )
  }

  const languages = (showLanguages ? (locales.data?.languages ?? []) : []).map(
    (language) => ({
      value: language.code,
      label: languageName(language.code),
    }),
  )
  const pickedLanguages = splitList(search.language)

  return (
    <div className="flex flex-col gap-2">
      <FilterGroup
        title={t('groups.promotions')}
        selectedCount={search.onSale ? 1 : 0}
        variant={variant}
        // Figma: the sheet opens on the first group
        defaultOpen
      >
        <CheckboxFacet
          options={[{ value: 'onSale', label: t('onSale') }]}
          selected={search.onSale ? ['onSale'] : []}
          onChange={(values) =>
            onSearchChange({ onSale: values.length > 0, page: 1 })
          }
        />
      </FilterGroup>

      {facetGroup('genre')}
      {facetGroup('system')}
      {facetGroup('type')}

      <FilterGroup
        title={t('groups.price')}
        selectedCount={search.priceMax === undefined ? 0 : 1}
        variant={variant}
      >
        <PriceFilter
          value={search.priceMax}
          onChange={(priceMax) => onSearchChange({ priceMax, page: 1 })}
        />
      </FilterGroup>

      {facetGroup('format')}
      {facetGroup('publisher')}

      {languages.length > 0 && (
        <FilterGroup
          title={t('groups.language')}
          selectedCount={pickedLanguages.length}
          variant={variant}
        >
          <CheckboxFacet
            options={languages}
            selected={pickedLanguages}
            onChange={(values) =>
              onSearchChange({ language: joinList(values), page: 1 })
            }
          />
        </FilterGroup>
      )}
    </div>
  )
}

/**
 * Figma: price bands as radios, then a custom range. The API filters by the
 * highest price only, so the custom part is one "up to" field.
 */
function PriceFilter({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (priceMax: number | undefined) => void
}) {
  const { t } = useTranslation('listing')
  const priceLabel = usePriceLabel()
  const symbol = useCurrencySymbol()
  const inputId = useId()
  const [draft, setDraft] = useState(
    value === undefined || PRICE_BANDS.includes(value as never)
      ? ''
      : String(value),
  )

  const isBand = value === undefined || PRICE_BANDS.includes(value as never)
  const options = [
    { value: 'any', label: t('price.any') },
    ...PRICE_BANDS.map((band) => ({
      value: String(band),
      label: priceLabel(band),
    })),
    ...(isBand ? [] : [{ value: 'custom', label: priceLabel(value) }]),
  ]

  const apply = (event: FormEvent) => {
    event.preventDefault()
    const max = Number(draft.replace(',', '.'))
    if (draft.trim() !== '' && Number.isFinite(max) && max >= 0) onChange(max)
  }

  return (
    <>
      <RadioFacet
        label={t('groups.price')}
        value={value === undefined ? 'any' : isBand ? String(value) : 'custom'}
        options={options}
        onChange={(picked) => {
          if (picked === 'any') onChange(undefined)
          else if (picked !== 'custom') onChange(Number(picked))
        }}
      />
      <form onSubmit={apply} className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t('price.upToLabel')}
        </label>
        <div className="relative min-w-0 flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {symbol}
          </span>
          <Input
            id={inputId}
            inputMode="decimal"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('price.upToPlaceholder')}
            className="h-8 rounded-lg border-border bg-card pl-7 shadow-none dark:bg-card"
          />
        </div>
        <Button type="submit" size="sm" className="h-8 rounded-lg px-2.5">
          {t('price.go')}
        </Button>
      </form>
    </>
  )
}
