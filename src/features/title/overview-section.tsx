import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import { useTitleSamples } from '@/api/titles'
import type { TitleDetail } from '@/api/titles'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const sectionHeading = 'font-sans text-base leading-6 font-bold'

/** The description, then the sample pages (Figma "Sample pages"), each opening larger. */
export function OverviewSection({ title }: { title: TitleDetail }) {
  const { t } = useTranslation('title')
  const samples = useTitleSamples(title.id).data
  const [open, setOpen] = useState<number | null>(null)
  const pages = samples?.previewPages ?? []
  const paragraphs = title.description.split(/\n\s*\n/).filter(Boolean)

  return (
    <section
      id="overview"
      aria-labelledby="overview-heading"
      className="flex scroll-mt-20 flex-col gap-6"
    >
      <h2 id="overview-heading" className="sr-only">
        {t('tabs.overview')}
      </h2>
      {paragraphs.length > 0 && (
        <div className="flex flex-col gap-4 text-sm leading-5">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}

      {pages.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className={sectionHeading}>{t('samples.heading')}</h3>
            {samples?.sampleFileUrl && (
              <a
                href={assetUrl(samples.sampleFileUrl)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <DownloadIcon aria-hidden className="size-4" />
                {t('samples.download')}
              </a>
            )}
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pages.map((page, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => setOpen(index)}
                  className="flex w-full flex-col overflow-hidden rounded-xl border border-muted bg-card text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <img
                    src={assetUrl(page.url)}
                    alt=""
                    loading="lazy"
                    className="h-[226px] w-full object-cover"
                  />
                  <span className="px-3 py-2 text-xs text-muted-foreground">
                    {t('samples.caption', {
                      name: page.alt || t('samples.page'),
                      index: index + 1,
                      total: pages.length,
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog
        open={open !== null}
        onOpenChange={(next) => !next && setOpen(null)}
      >
        <DialogContent className="max-w-3xl p-2 sm:max-w-3xl">
          {open !== null && pages[open] && (
            <>
              <DialogTitle className="px-2 pt-1 text-sm font-medium">
                {t('samples.caption', {
                  name: pages[open].alt || t('samples.page'),
                  index: open + 1,
                  total: pages.length,
                })}
              </DialogTitle>
              <img
                src={assetUrl(pages[open].url)}
                alt={pages[open].alt}
                className="max-h-[80dvh] w-full rounded-lg object-contain"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
