import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/** Statuses with a translation; anything else the API sends is shown as it comes. */
const STATUS_KEYS = {
  paid: 'orders.statusPaid',
  shipped: 'orders.statusShipped',
  pending: 'orders.statusPending',
  refunded: 'orders.statusRefunded',
  cancelled: 'orders.statusCancelled',
} as const

/** "paid" -> "Paid" (or its translation). */
export function useStatusLabel() {
  const { t } = useTranslation('account')
  return useCallback(
    (status: string) =>
      status in STATUS_KEYS
        ? t(STATUS_KEYS[status as keyof typeof STATUS_KEYS])
        : status.charAt(0).toUpperCase() + status.slice(1),
    [t],
  )
}
