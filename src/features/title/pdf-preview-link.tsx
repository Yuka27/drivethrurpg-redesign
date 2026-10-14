import { ArrowUpRightIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import type { SampleFile } from '@/api/titles'
import { useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

/**
 * "Preview PDF ↗ · First 12 pages · PDF · 10.6 MB": the title's sample PDF,
 * in a new tab. A quiet outlined link (the red is for buying), the details
 * after the label, wrapping under it when there is no room.
 */
export function PdfPreviewLink({
  file,
  className,
}: {
  file: SampleFile
  className?: string
}) {
  const { t } = useTranslation('title')
  const formatSize = useFormatNumber({ maximumFractionDigits: 1 })
  const formatNumber = useFormatNumber()
  const metaId = useId()

  return (
    <a
      // the file lives on the API's origin, not under /api/v1
      href={assetUrl(file.url)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('previewPdf.label')}
      aria-describedby={metaId}
      className={cn(
        'inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-foreground transition-colors outline-none hover:border-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none lg:justify-start',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 font-medium">
        {t('previewPdf.action')}
        <ArrowUpRightIcon aria-hidden className="size-4" />
      </span>
      <span id={metaId} className="text-muted-foreground">
        {t('previewPdf.meta', {
          count: file.pageCount,
          pages: formatNumber(file.pageCount),
          size: formatSize(file.sizeMb),
        })}
      </span>
    </a>
  )
}
