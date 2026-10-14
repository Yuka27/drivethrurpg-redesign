import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useMoveSavedToCart } from '@/api/cart'
import type { CartLine } from '@/api/cart'
import { assetUrl } from '@/api/client'
import { Button } from '@/components/ui/button'
import { useFormatMoney } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'

/**
 * Lines set aside with "Save for later", each with "Move to cart". Shown under
 * the cart's lines, and in the empty cart. There is no API to delete a saved
 * line, so there is no Remove here.
 */
export function SavedForLaterList({
  saved,
  labelledBy,
  className,
}: {
  saved: Array<CartLine>
  /** the id of the heading above the list */
  labelledBy: string
  className?: string
}) {
  const { t } = useTranslation('cart')
  const apiError = useApiError()
  const formatMoney = useFormatMoney()
  const move = useMoveSavedToCart()

  return (
    <ul
      aria-labelledby={labelledBy}
      // minmax(0, 1fr): long titles truncate instead of widening the list
      className={cn('grid grid-cols-[minmax(0,1fr)] gap-2', className)}
    >
      {saved.map((line) => (
        <li
          key={line.lineId}
          className="flex items-center gap-3 rounded-[10px] border bg-background p-2.5"
        >
          <span className="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
            {line.title.cover && (
              <img
                src={assetUrl(line.title.cover.url)}
                alt=""
                className="size-full object-cover"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {line.title.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {line.formatLabel} · {formatMoney(line.unitPrice)}
            </span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={move.isPending}
            aria-label={t('saved.moveLabel', { title: line.title.name })}
            onClick={() =>
              move.mutate(line.lineId, {
                onSuccess: () =>
                  toast.success(t('saved.moved', { title: line.title.name })),
                onError: (error) => toast.error(apiError(error)),
              })
            }
            className="border"
          >
            {t('saved.moveToCart')}
          </Button>
        </li>
      ))}
    </ul>
  )
}
