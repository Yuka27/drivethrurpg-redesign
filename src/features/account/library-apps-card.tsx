import { useTranslation } from 'react-i18next'

import { SettingsCard, SettingsRow, rowButtonClass } from './settings-card'
import { Button } from '@/components/ui/button'
import { useComingSoon } from '@/lib/use-coming-soon'

/**
 * Keys for apps that read the library.
 * TODO(api): there is no endpoint for app keys yet, so the count is always 0.
 */
export function LibraryAppsCard() {
  const { t } = useTranslation('account')
  const comingSoon = useComingSoon()

  return (
    <SettingsCard
      id="library-apps"
      title={t('apps.title')}
      description={t('apps.subtitle')}
    >
      <SettingsRow
        className="py-4"
        label={t('apps.keys')}
        hint={
          <span className="text-sm">{t('apps.activeKeys', { count: 0 })}</span>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            className={rowButtonClass}
            onClick={comingSoon}
          >
            {t('apps.manage')}
          </Button>
        }
      />
    </SettingsCard>
  )
}
