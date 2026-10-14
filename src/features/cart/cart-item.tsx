import { Link } from '@tanstack/react-router'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useMoveSavedToCart,
  useRemoveLine,
  useSaveForLater,
  useSetLineQty,
  useUndoRemove,
} from '@/api/cart'
import type { CartLine } from '@/api/cart'
import { assetUrl } from '@/api/client'

import { useTitleName } from '@/api/titles'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormatMoney, useFormatNumber } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'
import { tagClass } from '@/components/title/tag-class'

/** A sensible ceiling for one line; the API sets none. */
const MAX_QTY = 99

/**
 * One cart line: cover, title, publisher, the format and how it arrives,
 * the quantity and Remove; the price on the right (desktop) or under the
 * title (phones), with the discount when on sale. A download needs no
 * quantity, so its stepper shows only once there is more than one (to take
 * extras off again). Removing offers Undo (POST /cart/undo); so does saving
 * for later (the saved line moves back).
 */
export function CartItem({ line }: { line: CartLine }) {
  const { t } = useTranslation('cart')
  const apiError = useApiError()
  const formatMoney = useFormatMoney()
  const formatPercent = useFormatNumber({
    style: 'percent',
    maximumFractionDigits: 0,
  })
  // the cart has no publisher: the title's (cached, as on order pages)
  const titleName = useTitleName(line.title.id)
  const publisher = titleName.data?.publisher.name
  const setQty = useSetLineQty()
  const remove = useRemoveLine()
  const undo = useUndoRemove()
  const save = useSaveForLater()
  const moveBack = useMoveSavedToCart()
  const busy = setQty.isPending || remove.isPending || save.isPending
  const name = line.title.name

  const list =
    line.listPrice && line.listPrice.amount > line.unitPrice.amount
      ? line.listPrice
      : null
  const discount = list
    ? (list.amount - line.unitPrice.amount) / list.amount
    : 0
  const showStepper = line.requiresShipping || line.qty > 1

  const changeQty = (qty: number) =>
    setQty.mutate(
      { lineId: line.lineId, qty },
      { onError: (error) => toast.error(apiError(error)) },
    )

  const onRemove = () =>
    remove.mutate(line.lineId, {
      onSuccess: (cart) => {
        const token = cart.undoToken
        toast.success(t('line.removed', { title: name }), {
          action: token
            ? {
                label: t('line.undo'),
                onClick: () =>
                  undo.mutate(token, {
                    onError: (error) => toast.error(apiError(error)),
                  }),
              }
            : undefined,
        })
      },
      onError: (error) => toast.error(apiError(error)),
    })

  const onSave = () =>
    save.mutate(line.lineId, {
      onSuccess: (cart) => {
        // the saved copy: same line id, or the same edition
        const saved =
          cart.savedForLater.find((item) => item.lineId === line.lineId) ??
          cart.savedForLater.find((item) => item.sku === line.sku)
        toast.success(t('line.saved', { title: name }), {
          action: saved
            ? {
                label: t('line.undo'),
                onClick: () =>
                  moveBack.mutate(saved.lineId, {
                    onError: (error) => toast.error(apiError(error)),
                  }),
              }
            : undefined,
        })
      },
      onError: (error) => toast.error(apiError(error)),
    })

  const discountBadge = discount > 0 && (
    <span className="inline-flex h-[22px] items-center rounded-sm bg-update px-2 text-xs font-medium text-update-foreground">
      <span className="sr-only">{t('line.discount')} </span>-
      {formatPercent(discount)}
    </span>
  )
  const was = list && (
    <s className="text-xs text-muted-foreground">
      <span className="sr-only">{t('line.was')} </span>
      {formatMoney({ ...list, amount: list.amount * line.qty })}
    </s>
  )
  const price = (
    <span className="text-lg leading-7 font-bold">
      {formatMoney({
        ...line.unitPrice,
        amount: line.unitPrice.amount * line.qty,
      })}
    </span>
  )

  return (
    <li className="flex flex-col gap-2 border-b border-muted pb-2 last:border-b-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 p-3 sm:gap-4">
        <div className="h-[102px] w-[81px] shrink-0 overflow-hidden rounded-xl border border-muted bg-muted">
          {line.title.cover && (
            <img
              src={assetUrl(line.title.cover.url)}
              alt=""
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 flex-col">
              <Link
                to="/titles/$titleId"
                params={{ titleId: line.title.id }}
                className="truncate text-sm font-bold hover:underline"
              >
                {name}
              </Link>
              {titleName.isPending ? (
                <Skeleton className="mt-1 h-3 w-24" />
              ) : (
                publisher && (
                  <span className="truncate text-xs text-muted-foreground">
                    {publisher}
                  </span>
                )
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={tagClass}>{line.formatLabel}</span>
              {line.requiresShipping ? (
                <span className="text-xs text-muted-foreground">
                  {t('line.ships')}
                </span>
              ) : (
                <span className="text-xs font-semibold text-success">
                  {t('line.instant')}
                </span>
              )}
            </div>
            {line.alreadyOwned && (
              <p className="text-xs text-warning">{t('line.owned')}</p>
            )}
          </div>
          {/* phones: the price under the title */}
          <p className="flex items-center gap-2 sm:hidden">
            {discountBadge}
            {was}
            {price}
          </p>
          <LineControls
            className="max-sm:hidden"
            name={name}
            qty={line.qty}
            showStepper={showStepper}
            busy={busy}
            onQty={changeQty}
            onRemove={onRemove}
            onSave={onSave}
          />
        </div>
      </div>
      {/* desktop: the price on the right */}
      <div className="flex shrink-0 flex-col items-end gap-2 pr-3 max-sm:hidden">
        {discountBadge}
        <p className="flex flex-col items-end">
          {price}
          {was}
        </p>
      </div>
      <LineControls
        className="px-3 sm:hidden"
        name={name}
        qty={line.qty}
        showStepper={showStepper}
        busy={busy}
        onQty={changeQty}
        onRemove={onRemove}
        onSave={onSave}
      />
    </li>
  )
}

/** − qty +, Save for later and Remove. Phones: the stepper left, the rest right. */
function LineControls({
  name,
  qty,
  showStepper,
  busy,
  onQty,
  onRemove,
  onSave,
  className,
}: {
  name: string
  qty: number
  showStepper: boolean
  busy: boolean
  onQty: (qty: number) => void
  onRemove: () => void
  onSave: () => void
  className?: string
}) {
  const { t } = useTranslation('cart')
  const formatNumber = useFormatNumber()

  return (
    <div
      className={cn(
        // phones: the whole card's width, the stepper left and the actions right
        'flex flex-wrap items-center gap-x-2 gap-y-1 max-sm:justify-between',
        !showStepper && 'max-sm:justify-end',
        className,
      )}
    >
      {showStepper && (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('line.decrease', { title: name })}
            disabled={busy || qty <= 1}
            onClick={() => onQty(qty - 1)}
            className="size-8 rounded-l-lg rounded-r-none"
          >
            <MinusIcon aria-hidden />
          </Button>
          <output
            aria-label={t('line.quantity', { title: name })}
            aria-live="polite"
            className="flex h-8 w-[35px] items-center border border-border bg-background px-2.5 text-sm text-muted-foreground tabular-nums"
          >
            {formatNumber(qty)}
          </output>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('line.increase', { title: name })}
            disabled={busy || qty >= MAX_QTY}
            onClick={() => onQty(qty + 1)}
            className="size-8 rounded-l-none rounded-r-lg"
          >
            <PlusIcon aria-hidden />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          aria-label={t('line.saveLabel', { title: name })}
          disabled={busy}
          onClick={onSave}
          className="h-8 px-0 font-medium hover:bg-transparent hover:underline"
        >
          {t('line.saveForLater')}
        </Button>
        <Button
          variant="ghost"
          aria-label={t('line.removeLabel', { title: name })}
          disabled={busy}
          onClick={onRemove}
          className="h-8 px-0 font-medium hover:bg-transparent hover:underline"
        >
          {t('line.remove')}
        </Button>
      </div>
    </div>
  )
}
