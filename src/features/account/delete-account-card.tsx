import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from './confirm-dialog'
import { useDeleteAccount } from '@/api/account'
import { Button } from '@/components/ui/button'
import { useApiError } from '@/i18n/use-api-error'

/** Figma: outlined, no fill, so it stands apart from the other settings. */
export function DeleteAccountCard() {
  const { t } = useTranslation('account')
  const apiError = useApiError()
  const router = useRouter()
  const remove = useDeleteAccount()
  const [confirming, setConfirming] = useState(false)

  return (
    <section
      aria-labelledby="delete-account"
      className="flex gap-2.5 rounded-xl border border-muted p-6 max-lg:flex-col lg:items-center"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2
          id="delete-account"
          className="font-sans text-lg leading-7 font-bold tracking-normal"
        >
          {t('delete.title')}
        </h2>
        <p className="text-xs text-muted-foreground lg:text-sm">
          {t('delete.subtitle')}
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="max-lg:mt-2.5 max-lg:w-full"
        onClick={() => setConfirming(true)}
      >
        {t('delete.button')}
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('delete.confirmTitle')}
        description={t('delete.confirmBody')}
        confirmLabel={t('delete.confirm')}
        pendingLabel={t('delete.deleting')}
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            // signed out now (useDeleteAccount): leave the account pages
            onSuccess: () => {
              setConfirming(false)
              toast.success(t('delete.done'))
              router.history.push('/')
            },
            onError: (error) => toast.error(apiError(error)),
          })
        }
      />
    </section>
  )
}
