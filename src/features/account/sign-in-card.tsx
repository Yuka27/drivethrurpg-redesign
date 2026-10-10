import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ChangeEmailDialog } from './change-email-dialog'
import { ChangePasswordDialog } from './change-password-dialog'
import { SettingsCard, SettingsRow, rowButtonClass } from './settings-card'
import { Button } from '@/components/ui/button'

/** Email and password: the two ways to change how the user logs in. */
export function SignInCard({ email }: { email: string }) {
  const { t } = useTranslation('account')
  const [dialog, setDialog] = useState<'email' | 'password' | null>(null)

  return (
    <SettingsCard
      id="sign-in"
      title={t('signIn.title')}
      description={t('signIn.subtitle')}
    >
      <SettingsRow
        label={t('signIn.email')}
        hint={t('signIn.emailHint')}
        value={email}
        actions={
          <Button
            variant="secondary"
            size="sm"
            className={rowButtonClass}
            // two "Change" buttons: say which (the visible word stays in the name)
            aria-label={t('changeEmail.title')}
            onClick={() => setDialog('email')}
          >
            {t('signIn.change')}
          </Button>
        }
      />
      <SettingsRow
        label={t('signIn.password')}
        hint={t('signIn.passwordHint')}
        actions={
          <>
            {/* Figma desktop: a masked placeholder, never the real password */}
            <span
              role="img"
              aria-label={t('signIn.passwordSet')}
              className="text-sm text-muted-foreground max-lg:hidden"
            >
              ***********
            </span>
            <Button
              variant="secondary"
              size="sm"
              className={rowButtonClass}
              aria-label={t('signIn.changePassword')}
              onClick={() => setDialog('password')}
            >
              {/* mobile has room for "Change" only */}
              <span className="lg:hidden">{t('signIn.change')}</span>
              <span className="max-lg:hidden">
                {t('signIn.changePassword')}
              </span>
            </Button>
          </>
        }
      />

      <ChangeEmailDialog
        open={dialog === 'email'}
        onOpenChange={(open) => setDialog(open ? 'email' : null)}
      />
      <ChangePasswordDialog
        open={dialog === 'password'}
        onOpenChange={(open) => setDialog(open ? 'password' : null)}
        email={email}
      />
    </SettingsCard>
  )
}
