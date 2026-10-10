import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useComingSoon } from './coming-soon'
import { ConfirmDialog } from './confirm-dialog'
import {
  SettingsCard,
  SettingsRow,
  badgeClass,
  rowButtonClass,
} from './settings-card'
import { usePaymentMethods, useRemovePaymentMethod } from '@/api/account'
import type { PaymentMethod } from '@/api/account'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFormatDate } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'

// card network names are never translated
const BRANDS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
}
const brandName = (brand: string) =>
  BRANDS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1)

/** Saved cards: last 4 digits only. Cards are saved at checkout. */
export function PaymentMethodsCard() {
  const { t } = useTranslation('account')
  const apiError = useApiError()
  const comingSoon = useComingSoon()
  const formatExpiry = useFormatDate({ month: '2-digit', year: 'numeric' })
  const methods = usePaymentMethods()
  const remove = useRemovePaymentMethod()
  const [removing, setRemoving] = useState<PaymentMethod | null>(null)

  const cardName = (method: PaymentMethod) =>
    t('payment.card', { brand: brandName(method.brand), last4: method.last4 })

  const addButton = (className?: string) => (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      onClick={comingSoon}
    >
      {t('payment.add')}
    </Button>
  )

  const empty = methods.data?.length === 0

  return (
    <SettingsCard
      id="payment-methods"
      title={t('payment.title')}
      description={t('payment.subtitle')}
      action={!empty && methods.data && addButton('max-lg:hidden')}
    >
      {methods.isError && (
        <p className="border-t border-muted py-4 text-sm text-destructive">
          {t('loadError')}
        </p>
      )}
      {empty && (
        // Figma: the text and the button share a row on desktop; the button
        // goes full width under the text on mobile
        <div className="flex gap-4 border-t border-muted py-4 max-lg:flex-col lg:items-center">
          <p className="flex-1 text-sm text-muted-foreground">
            {t('payment.empty')}
            <br />
            <span className="max-lg:hidden">{t('payment.emptyHint')}</span>
          </p>
          {addButton('max-lg:w-full')}
        </div>
      )}
      {methods.data?.map((method) => (
        <SettingsRow
          key={method.id}
          className="py-4"
          label={
            <>
              {cardName(method)}
              {method.isDefault && (
                <Badge variant="outline" className={badgeClass}>
                  {t('payment.default')}
                </Badge>
              )}
            </>
          }
          hint={t('payment.expires', {
            date: formatExpiry(new Date(method.expYear, method.expMonth - 1)),
          })}
          actions={
            <Button
              variant="secondary"
              size="sm"
              className={rowButtonClass}
              aria-label={t('payment.removeLabel', { card: cardName(method) })}
              onClick={() => setRemoving(method)}
            >
              {t('payment.remove')}
            </Button>
          }
        />
      ))}
      {!empty && methods.data && addButton('w-full lg:hidden')}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('payment.removeTitle')}
        description={t('payment.removeBody', {
          card: removing ? cardName(removing) : '',
        })}
        confirmLabel={t('payment.remove')}
        pendingLabel={t('dialog.removing')}
        pending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast.success(t('payment.removed'))
              setRemoving(null)
            },
            onError: (error) => toast.error(apiError(error)),
          })
        }
      />
    </SettingsCard>
  )
}
