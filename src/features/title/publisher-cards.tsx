import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, MailIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useMe } from '@/api/me'
import { usePublisher, useTogglePublisherFollow } from '@/api/publishers'
import { PublisherLogo } from '@/components/site/publisher-logo'
import { Switch } from '@/components/ui/switch'
import { useFormatNumber } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { useAuthDialogStore } from '@/stores/auth-dialog'

/** Figma "publisher card": logo, name, how many titles, to the publisher's page. */
export function PublisherCard({
  publisherId,
  name,
}: {
  publisherId: string
  name: string
}) {
  const { t } = useTranslation('title')
  const formatNumber = useFormatNumber()
  const publisher = usePublisher(publisherId).data

  return (
    <Link
      to="/titles"
      search={{ publisher: publisherId }}
      className="group flex items-center gap-2 rounded-xl bg-card px-4 py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <PublisherLogo
        name={name}
        url={publisher?.logo?.url}
        className="size-20 rounded-xl"
      />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="max-w-full truncate text-lg leading-7 font-bold group-hover:underline">
          {name}
        </span>
        {publisher && publisher.titleCount > 0 && (
          <span className="inline-flex h-[22px] items-center rounded-sm border border-primary px-2 text-xs font-medium text-primary">
            {t('publisher.titles', {
              count: publisher.titleCount,
              formatted: formatNumber(publisher.titleCount),
            })}
          </span>
        )}
      </span>
      <ArrowRightIcon aria-hidden className="size-6 shrink-0" />
    </Link>
  )
}

/**
 * Figma "Follow card": follow the publisher for a weekly email of new releases.
 * (The design also lists the imprint and the rule system; the API follows
 * publishers only.) Guests are asked to log in.
 */
export function FollowCard({
  publisherId,
  name,
}: {
  publisherId: string
  name: string
}) {
  const { t } = useTranslation('title')
  const apiError = useApiError()
  const switchId = useId()
  const { data: me } = useMe()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const publisher = usePublisher(publisherId).data
  const toggle = useTogglePublisherFollow()
  const following = Boolean(me) && Boolean(publisher?.following)

  return (
    <section
      aria-label={t('follow.label')}
      className="flex flex-col gap-2 rounded-xl bg-card p-4"
    >
      <p className="flex gap-2 text-xs text-muted-foreground">
        <MailIcon aria-hidden className="size-4 shrink-0" />
        {t('follow.hint')}
      </p>
      <div className="flex items-center justify-between gap-2 pr-4 pl-6">
        <label htmlFor={switchId} className="min-w-0 truncate text-sm">
          {t('follow.publisher')} <b>{name}</b>
        </label>
        <Switch
          id={switchId}
          checked={following}
          disabled={me !== null && !publisher}
          onCheckedChange={(on) => {
            if (!me) {
              openAuth('login')
              return
            }
            toggle.mutate(
              { publisherId, on },
              {
                onSuccess: () =>
                  toast.success(
                    t(on ? 'follow.followed' : 'follow.unfollowed', { name }),
                  ),
                onError: (error) => toast.error(apiError(error)),
              },
            )
          }}
        />
      </div>
    </section>
  )
}
