import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, MailIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { FollowTarget } from '@/api/follow-kind'
import { useToggleFollow } from '@/api/following'
import { useMe } from '@/api/me'
import { usePublisher } from '@/api/publishers'
import type { TitleDetail } from '@/api/titles'
import { PublisherLogo } from '@/components/site/publisher-logo'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useFormatNumber } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { useAuthDialogStore } from '@/stores/auth-dialog'

/** Logo, name, how many titles, to the listing of their titles. */
export function PublisherCard({
  publisherId,
  name,
}: {
  publisherId: string
  name: string
}) {
  const { t } = useTranslation('title')
  const formatNumber = useFormatNumber()
  const query = usePublisher(publisherId)
  const publisher = query.data

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
        {query.isPending && <Skeleton className="h-[22px] w-20" />}
        {publisher && publisher.titleCount > 0 && (
          <span className="inline-flex h-[22px] items-center rounded-sm border border-primary px-2 text-xs font-medium text-primary-text">
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
 * "Follow your favorite publishers and categories…": one switch per thing the
 * title belongs to (publisher, series, imprint, game system, genres), in the
 * API's order, each for a weekly email of its new releases. Guests are asked
 * to log in instead.
 */
export function FollowCard({ title }: { title: TitleDetail }) {
  const { t } = useTranslation('title')
  const headingId = useId()
  // older data without follow targets: the publisher alone, its state unknown
  const targets: Array<FollowTarget> =
    title.followTargets.length > 0
      ? title.followTargets
      : title.publisher
        ? [{ type: 'publisher', ...title.publisher, following: false }]
        : []
  if (targets.length === 0) return null

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-xl bg-card p-4"
    >
      <h2
        id={headingId}
        className="flex gap-2 font-sans text-xs leading-4 font-normal text-muted-foreground"
      >
        <MailIcon aria-hidden className="size-4 shrink-0" />
        {t('follow.hint')}
      </h2>
      <ul className="flex flex-col gap-2 pl-6">
        {targets.map((target) => (
          <FollowRow key={`${target.type}:${target.id}`} target={target} />
        ))}
      </ul>
    </section>
  )
}

function FollowRow({ target }: { target: FollowTarget }) {
  const { t } = useTranslation('title')
  const apiError = useApiError()
  const switchId = useId()
  const { data: me } = useMe()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const toggle = useToggleFollow()
  // a guest follows nothing, whatever the data says
  const following = Boolean(me) && target.following

  return (
    <li className="flex items-center justify-between gap-3">
      <label htmlFor={switchId} className="flex min-w-0 flex-col text-sm">
        <span className="truncate">
          {t('follow.follow')} <b>{target.name}</b>
        </span>
        <span className="text-xs text-muted-foreground">
          {t(`follow.kind.${target.type}`)}
        </span>
      </label>
      <Switch
        id={switchId}
        checked={following}
        // until GET /me answers, a user is neither guest nor signed in
        disabled={me === undefined}
        // the kind in words: "Follow game system Year Zero Engine"
        aria-label={t(`follow.target.${target.type}`, { name: target.name })}
        onCheckedChange={(on) => {
          if (!me) {
            openAuth('login')
            return
          }
          toggle.mutate(
            { kind: target.type, id: target.id, on },
            {
              onSuccess: () =>
                toast.success(
                  t(on ? 'follow.followed' : 'follow.unfollowed', {
                    name: target.name,
                  }),
                ),
              onError: (error) => toast.error(apiError(error)),
            },
          )
        }}
      />
    </li>
  )
}
