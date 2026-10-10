import { useTranslation } from 'react-i18next'

import { AccountBreadcrumb } from './account-breadcrumb'
import { AddressesCard } from './addresses-card'
import { ConnectedAccountsCard } from './connected-accounts-card'
import { DeleteAccountCard } from './delete-account-card'
import { LibraryAppsCard } from './library-apps-card'
import { PaymentMethodsCard } from './payment-methods-card'
import { SignInCard } from './sign-in-card'
import { useMe } from '@/api/me'
import { cn } from '@/lib/utils'

/** The "Account" settings page: sign-in, connected accounts, addresses, payments, apps, deletion. */
export function AccountSettings({
  breadcrumb = false,
  className,
}: {
  /** mobile only: "My account › Account" back to the hub */
  breadcrumb?: boolean
  className?: string
}) {
  const { t } = useTranslation('account')
  const { data: me } = useMe()

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {breadcrumb && <AccountBreadcrumb current={t('settings.title')} />}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-2xl leading-8 font-bold tracking-normal">
            {t('settings.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('settings.subtitle')}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {me && <SignInCard email={me.email} />}
          <ConnectedAccountsCard />
          <AddressesCard />
          <PaymentMethodsCard />
          <LibraryAppsCard />
          <DeleteAccountCard />
        </div>
      </div>
    </div>
  )
}
