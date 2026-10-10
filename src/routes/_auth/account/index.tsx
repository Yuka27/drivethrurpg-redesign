import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AccountHubNav } from '@/features/account/account-nav'
import { AccountSettings } from '@/features/account/account-settings'
import { BalanceCard } from '@/features/account/balance-card'

export const Route = createFileRoute('/_auth/account/')({
  component: AccountIndex,
})

/** Mobile: the "My account" hub. Desktop: the sidebar is the hub, so show the Account settings. */
function AccountIndex() {
  const { t } = useTranslation('account')

  return (
    <>
      <div className="flex flex-col gap-4 lg:hidden">
        <h1 className="font-sans text-2xl leading-8 font-bold tracking-normal">
          {t('myAccount')}
        </h1>
        <BalanceCard variant="hub" />
        <AccountHubNav />
      </div>
      <AccountSettings className="max-lg:hidden" />
    </>
  )
}
