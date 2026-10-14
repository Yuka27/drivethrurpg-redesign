import { useTranslation } from 'react-i18next'

import { AccountPage } from './account-page'
import { AddressesCard } from './addresses-card'
import { ConnectedAccountsCard } from './connected-accounts-card'
import { DeleteAccountCard } from './delete-account-card'
import { LibraryAppsCard } from './library-apps-card'
import { PaymentMethodsCard } from './payment-methods-card'
import { SignInCard } from './sign-in-card'
import { useMe } from '@/api/me'

/** The "Account" settings page: sign-in, connected accounts, addresses, payments, apps, deletion. */
export function AccountSettings({
  breadcrumb = false,
  className,
}: {
  breadcrumb?: boolean
  className?: string
}) {
  const { t } = useTranslation('account')
  const { data: me } = useMe()

  return (
    <AccountPage
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      breadcrumb={breadcrumb}
      className={className}
    >
      <div className="flex flex-col gap-4">
        {me && <SignInCard email={me.email} />}
        <ConnectedAccountsCard />
        <AddressesCard />
        <PaymentMethodsCard />
        <LibraryAppsCard />
        <DeleteAccountCard />
      </div>
    </AccountPage>
  )
}
