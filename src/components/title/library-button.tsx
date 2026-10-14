import { Link } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useFileDownload } from '@/api/library'
import type { LibraryItem } from '@/api/library'
import { Button } from '@/components/ui/button'
import { openInNewTab } from '@/lib/open-in-new-tab'

/**
 * New or updated files waiting: "Download" (one file: straight away; several:
 * on the library page, where each can be picked). Nothing new: "In library ✓".
 */
export function LibraryButton({
  item,
  title,
}: {
  item: LibraryItem
  title: string
}) {
  const { t } = useTranslation('account')
  const download = useFileDownload()
  const waiting = item.hasUpdate || item.files.some((file) => file.isNew)
  const buttonClass = 'border border-border'

  if (waiting && item.files.length === 1) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className={buttonClass}
        aria-label={t('orderDetail.downloadLabel', { title })}
        disabled={download.isPending}
        onClick={() =>
          void openInNewTab(() => download.mutateAsync(item.files[0].id)).catch(
            () => toast.error(t('orderDetail.downloadFailed')),
          )
        }
      >
        {t('orderDetail.download')}
      </Button>
    )
  }

  return (
    <Button asChild variant="secondary" size="sm" className={buttonClass}>
      <Link
        to="/library"
        aria-label={t(
          waiting ? 'orderDetail.downloadLabel' : 'orderDetail.inLibraryLabel',
          { title },
        )}
      >
        {waiting ? (
          t('orderDetail.download')
        ) : (
          <>
            {t('orderDetail.inLibrary')}
            <CheckIcon aria-hidden />
          </>
        )}
      </Link>
    </Button>
  )
}
