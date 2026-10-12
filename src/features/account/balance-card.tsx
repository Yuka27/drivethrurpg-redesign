import { GiftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useComingSoon } from './coming-soon'
import { useMe } from '@/api/me'
import { Button } from '@/components/ui/button'
import { useFormatMoney } from '@/i18n/format'
import { cn } from '@/lib/utils'

/**
 * Store credit and "Redeem gift card".
 * sidebar (desktop): centred, 36px amount, full-width button with a gift icon.
 * hub (mobile "My account"): amount left, button right.
 */
export function BalanceCard({ variant }: { variant: 'sidebar' | 'hub' }) {
  const { t } = useTranslation('account')
  const comingSoon = useComingSoon()
  const formatMoney = useFormatMoney()
  const { data: me } = useMe()
  const sidebar = variant === 'sidebar'

  return (
    <section
      aria-label={t('balance.label')}
      className={cn(
        'flex rounded-xl border border-muted bg-card p-4',
        sidebar
          ? 'flex-col items-center gap-3'
          : 'items-center justify-between gap-3',
      )}
    >
      <div
        className={cn(
          'flex min-w-0 flex-col gap-1',
          sidebar ? 'items-center' : 'items-start',
        )}
      >
        <p
          className={cn(
            'text-muted-foreground uppercase',
            sidebar ? 'text-sm' : 'text-xs',
          )}
        >
          {t('balance.label')}
        </p>
        <p
          className={cn(
            'truncate font-bold',
            sidebar ? 'text-4xl leading-10' : 'text-2xl leading-8',
          )}
        >
          {me ? formatMoney(me.balance) : ' '}
        </p>
      </div>
      {/* TODO: redeem flow (POST /account/gift-certificates/redeem) */}
      <Button
        variant="outline"
        size="sm"
        className={cn('border-border', sidebar && 'w-full')}
        onClick={comingSoon}
      >
        {sidebar && <GiftIcon aria-hidden />}
        {t('balance.redeem')}
      </Button>
    </section>
  )
}
