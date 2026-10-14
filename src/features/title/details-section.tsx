import { useTranslation } from 'react-i18next'

import type { TitleDetail } from '@/api/titles'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { useFormatDate, useFormatNumber, useLanguageName } from '@/i18n/format'

/** Figma "Details": label-over-value pairs in two columns, rows split by lines. */
export function DetailsSection({ title }: { title: TitleDetail }) {
  const { t } = useTranslation('title')
  const facetLabel = useFacetLabel()
  const formatDate = useFormatDate()
  const formatNumber = useFormatNumber({ maximumFractionDigits: 1 })
  const languageName = useLanguageName()

  const details = [
    [
      t('details.authors'),
      title.authors.map((author) => author.name).join(', '),
    ],
    [t('details.publisher'), title.publisher?.name],
    [
      t('details.creation'),
      t(title.contentFlags.aiGenerated ? 'aiGenerated' : 'humanMade'),
    ],
    [
      t('details.categories'),
      [
        title.type && facetLabel('type', title.type),
        title.ruleSystem && facetLabel('system', title.ruleSystem),
      ]
        .filter(Boolean)
        .join(', '),
    ],
    [t('details.released'), title.releaseDate && formatDate(title.releaseDate)],
    [t('details.pages'), title.pageCount && formatNumber(title.pageCount)],
    [
      t('details.fileSize'),
      title.fileSizeMb &&
        t('details.megabytes', { size: formatNumber(title.fileSizeMb) }),
    ],
    [
      t('details.languages'),
      title.availableLanguages.map(languageName).join(', '),
    ],
    [t('details.isbn'), title.isbn],
  ].filter((detail): detail is [string, string] => Boolean(detail[1]))

  return (
    <section
      id="details"
      aria-labelledby="details-heading"
      className="flex scroll-mt-[calc(var(--header-h,0px)+var(--stick-h,0px)+12px)] flex-col gap-2"
    >
      <h2
        id="details-heading"
        className="font-sans text-base leading-6 font-bold"
      >
        {t('tabs.details')}
      </h2>
      <dl className="grid grid-cols-1 rounded-xl bg-card px-3 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div
            key={label}
            className="border-b border-muted px-1 py-2 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
