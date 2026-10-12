import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useComingSoon } from './coming-soon'
import { ConfirmDialog } from './confirm-dialog'
import { SettingsCard, SettingsRow, badgeClass } from './settings-card'
import { useAddresses, useRemoveAddress } from '@/api/account'
import type { Address } from '@/api/account'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRegionName } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'

/** Billing addresses (invoices and tax); digital titles are never shipped. */
export function AddressesCard() {
  const { t } = useTranslation('account')
  const apiError = useApiError()
  const comingSoon = useComingSoon()
  const regionName = useRegionName()
  const addresses = useAddresses()
  const remove = useRemoveAddress()
  const [removing, setRemoving] = useState<Address | null>(null)

  const addButton = (className?: string) => (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      onClick={comingSoon}
    >
      <PlusIcon aria-hidden />
      {t('addresses.add')}
    </Button>
  )

  return (
    <SettingsCard
      id="addresses"
      title={t('addresses.title')}
      description={t('addresses.subtitle')}
      // Figma: in the header on desktop, a full-width button under the list on mobile
      action={addButton('max-lg:hidden')}
    >
      {addresses.isError && (
        <p className="border-t border-muted py-4 text-sm text-destructive">
          {t('loadError')}
        </p>
      )}
      {addresses.data?.length === 0 && (
        <p className="border-t border-muted py-4 text-sm text-muted-foreground">
          {t('addresses.empty')}
        </p>
      )}
      {addresses.data?.map((address) => (
        <SettingsRow
          key={address.id}
          align="start"
          className="py-4"
          label={
            <>
              {address.fullName}
              {address.isDefault && (
                <Badge variant="outline" className={badgeClass}>
                  {t('addresses.default')}
                </Badge>
              )}
            </>
          }
          hint={
            <address className="not-italic">
              {address.line1}
              <br />
              {address.line2 && (
                <>
                  {address.line2}
                  <br />
                </>
              )}
              {address.postalCode} {address.city}
              <br />
              {regionName(address.country)}
            </address>
          }
          actions={
            <Button
              variant="secondary"
              size="sm"
              aria-label={t('addresses.removeLabel', {
                name: address.fullName,
                line: address.line1,
              })}
              onClick={() => setRemoving(address)}
            >
              {t('addresses.remove')}
            </Button>
          }
        />
      ))}
      {addButton('w-full lg:hidden')}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('addresses.removeTitle')}
        description={t('addresses.removeBody', {
          name: removing?.fullName,
          line: removing?.line1,
        })}
        confirmLabel={t('addresses.remove')}
        pendingLabel={t('dialog.removing')}
        pending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast.success(t('addresses.removed'))
              setRemoving(null)
            },
            onError: (error) => toast.error(apiError(error)),
          })
        }
      />
    </SettingsCard>
  )
}
