import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  SettingsCard,
  SettingsRow,
  badgeClass,
  rowButtonClass,
} from './settings-card'
import { useConnectedAccounts, useDisconnectAccount } from '@/api/account'
import type { SocialProvider } from '@/api/auth'
import facebookIcon from '@/assets/social/facebook.png'
import googleIcon from '@/assets/social/google.png'
import roll20Icon from '@/assets/social/roll20.png'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'
import { useComingSoon } from '@/lib/use-coming-soon'

// Figma order; brand names are never translated
const PROVIDERS: Array<{ id: SocialProvider; name: string; icon: string }> = [
  { id: 'roll20', name: 'Roll20', icon: roll20Icon },
  { id: 'google', name: 'Google', icon: googleIcon },
  { id: 'facebook', name: 'Facebook', icon: facebookIcon },
]

/** Social providers linked to the account, and merging a second account. */
export function ConnectedAccountsCard() {
  const { t } = useTranslation('account')
  const apiError = useApiError()
  const comingSoon = useComingSoon()
  const connected = useConnectedAccounts()
  const disconnect = useDisconnectAccount()

  return (
    <SettingsCard
      id="connected-accounts"
      title={t('connected.title')}
      description={t('connected.subtitle')}
    >
      {connected.isError && (
        <p className="border-t border-muted py-2 text-sm text-destructive">
          {t('loadError')}
        </p>
      )}
      {PROVIDERS.map(({ id, name, icon }) => {
        const isConnected = connected.data?.some((a) => a.provider === id)
        const busy = disconnect.isPending && disconnect.variables === id
        return (
          <SettingsRow
            key={id}
            icon={
              // Figma: Roll20's logo sits on a white tile
              <img
                src={icon}
                alt=""
                width={24}
                height={24}
                className={cn(
                  'size-4 rounded-xs lg:size-6',
                  id === 'roll20' && 'bg-white p-px',
                )}
              />
            }
            label={name}
            hint={t(`connected.${id}`)}
            actions={
              connected.isPending ? (
                <Skeleton className="h-8 w-40 max-lg:h-12 max-lg:w-24" />
              ) : (
                connected.data && (
                  <div className="flex items-center gap-3 max-lg:flex-col max-lg:items-stretch max-lg:gap-1">
                    <Badge variant="outline" className={badgeClass}>
                      {isConnected
                        ? t('connected.connected')
                        : t('connected.notConnected')}
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      className={rowButtonClass}
                      disabled={busy}
                      aria-label={t(
                        isConnected
                          ? 'connected.disconnectLabel'
                          : 'connected.connectLabel',
                        { provider: name },
                      )}
                      onClick={() =>
                        isConnected
                          ? disconnect.mutate(id, {
                              onSuccess: () =>
                                toast.success(
                                  t('connected.disconnected', {
                                    provider: name,
                                  }),
                                ),
                              onError: (error) => toast.error(apiError(error)),
                            })
                          : comingSoon()
                      }
                    >
                      {isConnected
                        ? t('connected.disconnect')
                        : t('connected.connect')}
                    </Button>
                  </div>
                )
              )
            }
          />
        )
      })}
      <SettingsRow
        className="py-4"
        label={
          <span className="max-lg:text-xs max-lg:font-semibold">
            {t('connected.mergeTitle')}
          </span>
        }
        hint={t('connected.mergeHint')}
        actions={
          <Button
            variant="secondary"
            size="sm"
            className={rowButtonClass}
            onClick={comingSoon}
          >
            {t('connected.merge')}
          </Button>
        }
      />
    </SettingsCard>
  )
}
