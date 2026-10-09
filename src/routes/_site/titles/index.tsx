import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { languageFilter } from '@/lib/search-params'

// filters, sort and page join this schema as the listing page is built
const TitlesSearchSchema = z.object({
  language: languageFilter,
})

export const Route = createFileRoute('/_site/titles/')({
  validateSearch: TitlesSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation('listing')
  return (
    <div className="container py-8">
      <h1 className="text-2xl">{t('heading')}</h1>
    </div>
  )
}
