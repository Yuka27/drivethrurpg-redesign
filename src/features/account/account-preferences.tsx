import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AccountPage } from './account-page'
import { SwitchRow } from './preference-controls'
import { OptionSelect } from '@/components/site/option-select'
import { SettingsCard, SettingsRow, rowButtonClass } from './settings-card'
import { useLocales } from '@/api/meta'
import {
  useAccountPreferences,
  useUpdateAccountPreferences,
} from '@/api/preferences'
import type { AccountPreferences } from '@/api/preferences'
import { ThemeSegmented } from '@/components/site/theme-toggle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePreferencesStore } from '@/stores/preferences'

/** Daily deals, review reminders and price drops stop while marketing is paused. */
const MARKETING = [
  'dailyDeals',
  'reviewReminders',
  'wishlistPriceDrops',
] as const

/**
 * The "Preferences" page. Every change saves at once ("Changes save
 * automatically"). Language, currency and AI content are the same settings as
 * the header's: they go through the preferences store, which saves them to the
 * account and updates the whole app.
 */
export function AccountPreferencesPage({
  breadcrumb = false,
}: {
  /** mobile only: "My account › Preferences" back to the hub */
  breadcrumb?: boolean
}) {
  const { t } = useTranslation('account')
  const { data: saved, isError } = useAccountPreferences()
  const update = useUpdateAccountPreferences()
  const email = saved?.email
  const paused = email?.pauseMarketing === true

  const setEmail = (key: keyof AccountPreferences['email'], value: boolean) =>
    update.mutate({ email: { [key]: value } })

  return (
    <AccountPage
      title={t('preferencesPage.title')}
      subtitle={t('preferencesPage.subtitle')}
      breadcrumb={breadcrumb}
    >
      {isError && <p className="text-sm text-destructive">{t('loadError')}</p>}

      <div className="flex flex-col gap-4">
        <SettingsCard
          id="email-notifications"
          title={t('preferencesPage.email.title')}
          description={t('preferencesPage.email.subtitle')}
        >
          <SwitchRow
            label={t('preferencesPage.email.pauseMarketing')}
            hint={t('preferencesPage.email.pauseMarketingHint')}
            checked={email?.pauseMarketing}
            onCheckedChange={(on) => setEmail('pauseMarketing', on)}
          />
          {MARKETING.map((key) => (
            <SwitchRow
              key={key}
              label={t(`preferencesPage.email.${key}`)}
              hint={
                paused
                  ? t('preferencesPage.email.paused')
                  : t(`preferencesPage.email.${key}Hint`)
              }
              checked={email?.[key]}
              disabled={paused}
              onCheckedChange={(on) => setEmail(key, on)}
            />
          ))}
          <SwitchRow
            label={t('preferencesPage.email.libraryFileUpdates')}
            hint={t('preferencesPage.email.libraryFileUpdatesHint')}
            checked={email?.libraryFileUpdates}
            onCheckedChange={(on) => setEmail('libraryFileUpdates', on)}
          />
          <SettingsRow
            label={
              <span className="max-lg:text-xs">
                {t('preferencesPage.email.followed')}
              </span>
            }
            hint={t('preferencesPage.email.followedHint')}
            actions={
              <Button
                asChild
                variant="secondary"
                size="sm"
                className={rowButtonClass}
              >
                <Link
                  to="/following"
                  aria-label={t('preferencesPage.email.manageLabel')}
                >
                  {t('preferencesPage.email.manage')}
                  <ArrowRightIcon aria-hidden />
                </Link>
              </Button>
            }
          />
        </SettingsCard>

        <SettingsCard
          id="publisher-contact"
          title={t('preferencesPage.publishers.title')}
          description={t('preferencesPage.publishers.subtitle')}
        >
          <SwitchRow
            label={t('preferencesPage.publishers.notifications')}
            hint={t('preferencesPage.publishers.notificationsHint')}
            checked={saved?.notifications.publisherUpdates}
            onCheckedChange={(on) =>
              update.mutate({ notifications: { publisherUpdates: on } })
            }
          />
          <SwitchRow
            label={t('preferencesPage.publishers.shareEmail')}
            hint={t('preferencesPage.publishers.shareEmailHint')}
            checked={email?.publisherContact}
            onCheckedChange={(on) => setEmail('publisherContact', on)}
          />
        </SettingsCard>

        <DownloadsCard
          saveTo={saved?.downloads.saveTo}
          onChange={(saveTo) => update.mutate({ downloads: { saveTo } })}
        />

        <ContentCard
          showAdult={saved?.content.showAdult}
          onShowAdultChange={(on) =>
            update.mutate({ content: { showAdult: on } })
          }
        />
      </div>
    </AccountPage>
  )
}

function DownloadsCard({
  saveTo,
  onChange,
}: {
  saveTo: AccountPreferences['downloads']['saveTo'] | undefined
  onChange: (saveTo: AccountPreferences['downloads']['saveTo']) => void
}) {
  const { t } = useTranslation('account')
  const options = [
    { value: 'device', label: t('preferencesPage.downloads.device') },
    { value: 'ask', label: t('preferencesPage.downloads.ask') },
  ] as const

  return (
    <SettingsCard
      id="downloads"
      title={t('preferencesPage.downloads.title')}
      description={t('preferencesPage.downloads.subtitle')}
    >
      {/* Figma: the select sits right on desktop and goes full width under the text on mobile */}
      <div className="flex gap-4 border-t border-muted py-4 max-lg:flex-col lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span>{t('preferencesPage.downloads.saveTo')}</span>
          <span className="text-muted-foreground">
            {t('preferencesPage.downloads.saveToHint')}
          </span>
        </div>
        {saveTo && (
          <OptionSelect
            label={t('preferencesPage.downloads.saveTo')}
            value={saveTo}
            options={[...options]}
            onValueChange={(value) =>
              onChange(value as AccountPreferences['downloads']['saveTo'])
            }
            className="justify-between lg:w-[184px] max-lg:w-full"
          />
        )}
      </div>
    </SettingsCard>
  )
}

function ContentCard({
  showAdult,
  onShowAdultChange,
}: {
  showAdult: boolean | undefined
  onShowAdultChange: (on: boolean) => void
}) {
  const { t } = useTranslation('account')
  const { data: locales } = useLocales()
  const aiContent = usePreferencesStore((state) => state.aiContent)
  const setAiContent = usePreferencesStore((state) => state.setAiContent)
  const language = usePreferencesStore((state) => state.language)
  const setLanguage = usePreferencesStore((state) => state.setLanguage)
  const currency = usePreferencesStore((state) => state.currency)
  const setCurrency = usePreferencesStore((state) => state.setCurrency)

  const currencies = locales?.currencies ?? []
  const current = currencies.find((c) => c.code === currency)

  return (
    <SettingsCard
      id="content-display"
      title={t('preferencesPage.content.title')}
      description={t('preferencesPage.content.subtitle')}
    >
      <SwitchRow
        label={t('preferencesPage.content.adult')}
        hint={t('preferencesPage.content.adultHint')}
        checked={showAdult}
        onCheckedChange={onShowAdultChange}
      />
      <SwitchRow
        label={t('preferencesPage.content.ai')}
        hint={t('preferencesPage.content.aiHint')}
        checked={aiContent}
        onCheckedChange={setAiContent}
      />
      {/* the mobile menu's Light/Dark control; saved to the account by usePreferencesSync */}
      <SettingsRow
        label={t('preferencesPage.content.theme')}
        actions={<ThemeSegmented />}
      />
      <SettingsRow
        label={t('preferencesPage.content.language')}
        actions={
          !locales ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <OptionSelect
              label={t('preferencesPage.content.language')}
              value={language}
              options={locales.languages.map((l) => ({
                value: l.code,
                label: l.label,
              }))}
              onValueChange={(code) => void setLanguage(code)}
            />
          )
        }
      />
      <SettingsRow
        label={t('preferencesPage.content.currency')}
        actions={
          !locales ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <OptionSelect
              label={t('preferencesPage.content.currency')}
              value={currency}
              options={currencies.map((c) => ({
                value: c.code,
                label: `${c.code} · ${c.label} (${c.symbol})`,
              }))}
              onValueChange={setCurrency}
              // Figma: "$ USD" when closed; the list shows the full names
              display={current && `${current.symbol} ${current.code}`}
            />
          )
        }
      />
    </SettingsCard>
  )
}
