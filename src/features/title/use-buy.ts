import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAddEditionToCart } from '@/api/titles'
import type { Edition, TitleDetail } from '@/api/titles'
import { useApiError } from '@/i18n/use-api-error'

/** The edition chosen when the page opens: the first one in stock. */
export const defaultSku = (title: TitleDetail) =>
  (
    title.editions.find((edition) => edition.stock !== 'out_of_stock') ??
    title.editions.at(0)
  )?.sku

/**
 * What the buy box and the sticky bar both show for the chosen edition: the
 * edition, and whether it is already owned (a digital edition of a title the
 * user owns is in their library).
 */
export function chosenEdition(title: TitleDetail, sku: string | undefined) {
  const edition = title.editions.find((item) => item.sku === sku)
  const owned =
    title.owned && edition !== undefined && edition.shipsFrom === null
  return { edition, owned }
}

/**
 * POST /cart/items with the chosen edition (and PUT /cart/gift for a gift),
 * then a toast with "View cart". Shared by the buy box and the sticky bar.
 */
export function useAddToCart(title: TitleDetail) {
  const { t } = useTranslation('title')
  const apiError = useApiError()
  const navigate = useNavigate()
  const add = useAddEditionToCart()

  const addToCart = (
    edition: Edition,
    {
      gift = false,
      onSuccess,
    }: { gift?: boolean; onSuccess?: () => void } = {},
  ) =>
    add.mutate(
      { sku: edition.sku, gift },
      {
        onSuccess: () => {
          onSuccess?.()
          toast.success(
            t(gift ? 'buy.addedGift' : 'buy.added', { title: title.title }),
            {
              action: {
                label: t('buy.viewCart'),
                onClick: () => void navigate({ to: '/cart' }),
              },
            },
          )
        },
        onError: (error) => toast.error(apiError(error)),
      },
    )

  return { addToCart, isPending: add.isPending }
}
