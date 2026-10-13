import { Link } from '@tanstack/react-router'
import {
  ChevronDownIcon,
  DownloadIcon,
  EllipsisIcon,
  GiftIcon,
} from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import type { LibraryFile, LibraryItem } from '@/api/library'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFormatDate, useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

const iconButtonClass =
  'size-8 rounded-lg border-border bg-background shadow-none dark:bg-background'

/**
 * One owned title. Rendered once for both layouts, arranged by grid areas:
 * desktop  [check][cover][info ][actions]   mobile  [check][cover][info  info   ]
 *          [check][cover][files][actions]           [files files files][actions]
 * "N files" opens the file list underneath, each file with its own download.
 */
export function LibraryCard({
  item,
  selected,
  onSelectedChange,
  onDownload,
  onDownloadFile,
  onMarkSeen,
  downloading,
}: {
  item: LibraryItem
  selected: boolean
  onSelectedChange: (selected: boolean) => void
  onDownload: () => void
  onDownloadFile: (file: LibraryFile) => void
  onMarkSeen: () => void
  downloading: boolean
}) {
  const { t } = useTranslation('library')
  const formatDate = useFormatDate({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const formatSize = useFormatNumber({ maximumFractionDigits: 1 })
  const [open, setOpen] = useState(false)
  const filesId = useId()
  const title = item.title.name
  const totalMb = item.files.reduce((sum, file) => sum + file.sizeMb, 0)

  return (
    <li className="rounded-md bg-card px-4 py-3">
      <div
        className={cn(
          'grid grid-cols-[auto_80px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2',
          "[grid-template-areas:'check_cover_info_info'_'files_files_files_actions']",
          "lg:[grid-template-areas:'check_cover_info_actions'_'check_cover_files_actions']",
          open && 'border-b border-muted pb-3',
        )}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectedChange(checked === true)}
          aria-label={t('card.select', { title })}
          className="[grid-area:check] max-lg:self-start"
        />
        <div className="h-[104px] overflow-hidden rounded-md bg-muted [grid-area:cover]">
          {item.cover && (
            <img
              src={assetUrl(item.cover.url)}
              // the title is right next to it
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-0.5 self-end [grid-area:info] max-lg:self-center lg:gap-0">
          {/* badges above the title on mobile, after it on desktop */}
          <div className="flex flex-col-reverse items-start gap-x-2.5 gap-y-1 lg:flex-row lg:items-center">
            <h2 className="text-base leading-6 font-semibold [overflow-wrap:anywhere]">
              <Link
                to="/titles/$titleId"
                params={{ titleId: item.title.id }}
                className="hover:underline"
              >
                {title}
              </Link>
            </h2>
            {(item.hasUpdate || item.giftFrom) && (
              <div className="flex flex-wrap gap-1.5">
                {item.hasUpdate && (
                  <Badge className="h-[22px] rounded-sm bg-update px-2 text-update-foreground">
                    {t('card.updated')}
                  </Badge>
                )}
                {item.giftFrom && (
                  <Badge
                    variant="outline"
                    className="h-5 rounded-md border-primary px-2 text-primary"
                  >
                    <GiftIcon aria-hidden />
                    {t('card.giftFrom', { name: item.giftFrom.displayName })}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <p className="flex flex-col text-sm text-muted-foreground lg:flex-row lg:gap-3">
            {item.publisher && <span>{item.publisher.name}</span>}
            {item.purchasedAt && (
              <span>
                {t('card.purchased', { date: formatDate(item.purchasedAt) })}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={filesId}
          onClick={() => setOpen(!open)}
          className="flex items-center gap-0.5 self-start justify-self-start text-sm text-muted-foreground underline underline-offset-2 [grid-area:files] hover:text-foreground max-lg:self-center"
        >
          {t('card.files', {
            count: item.files.length,
            size: formatSize(totalMb),
          })}
          <ChevronDownIcon
            aria-hidden
            className={cn('size-3 transition-transform', open && 'rotate-180')}
          />
        </button>

        <div className="flex items-center gap-2 [grid-area:actions]">
          <Button
            onClick={onDownload}
            disabled={downloading || item.files.length === 0}
            aria-label={t('card.downloadLabel', { title })}
            className="h-8 gap-1 rounded-lg px-2.5"
          >
            <DownloadIcon aria-hidden />
            {t('card.download')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={t('card.more', { title })}
                className={iconButtonClass}
              >
                <EllipsisIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/titles/$titleId" params={{ titleId: item.title.id }}>
                  {t('card.viewProduct')}
                </Link>
              </DropdownMenuItem>
              {item.publisher && (
                <DropdownMenuItem asChild>
                  <Link
                    to="/publishers/$publisherId"
                    params={{ publisherId: item.publisher.id }}
                  >
                    {t('card.viewPublisher')}
                  </Link>
                </DropdownMenuItem>
              )}
              {item.hasUpdate && (
                <DropdownMenuItem onSelect={onMarkSeen}>
                  {t('card.markSeen')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {open && (
        <ul id={filesId} className="flex flex-col">
          {item.files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 border-b border-muted py-1 last:border-b-0 lg:pl-32"
            >
              {file.format && (
                <span className="inline-flex h-[22px] shrink-0 items-center rounded-sm bg-background/70 px-2 text-xs font-medium uppercase">
                  {file.format.replace('_', ' ')}
                </span>
              )}
              <span className="min-w-0 flex-1 text-sm [overflow-wrap:anywhere]">
                {file.name}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onDownloadFile(file)}
                aria-label={t('card.downloadFile', { name: file.name })}
                className={iconButtonClass}
              >
                <DownloadIcon aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
