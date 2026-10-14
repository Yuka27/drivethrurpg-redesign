import { Link } from '@tanstack/react-router'
import { PackageIcon, UsersIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useFollow } from '@/api/following'
import { useLibrary } from '@/api/library'
import {
  EmptyActions,
  EmptyLabel,
  EmptyState,
} from '@/components/site/empty-state'
import { PublisherLogo } from '@/components/site/publisher-logo'
import { Button } from '@/components/ui/button'
import { useApiError } from '@/i18n/use-api-error'
import { useComingSoon } from '@/lib/use-coming-soon'

/**
 * Mockup "Orders: none yet": short and quiet. The store, and a word for those
 * who ordered as a guest.
 */
export function OrdersEmpty() {
  const { t } = useTranslation('account')
  const { t: tCommon } = useTranslation()
  const comingSoon = useComingSoon()
  return (
    <EmptyState
      icon={<PackageIcon />}
      title={t('orders.emptyTitle')}
      text={t('orders.emptyText')}
      className="rounded-xl bg-card"
    >
      <EmptyActions>
        <Button asChild className="rounded-lg">
          <Link to="/titles">{tCommon('emptyStates.browseStore')}</Link>
        </Button>
      </EmptyActions>
      {/* TODO(guest-orders): no flow yet to find a guest order by email */}
      <button
        type="button"
        onClick={comingSoon}
        className="mt-3.5 text-sm font-semibold text-primary hover:underline"
      >
        {t('orders.guestOrder')}
      </button>
    </EmptyState>
  )
}

/** Mockup: three publishers to follow first. */
const SUGGESTED = 3

/**
 * Mockup "Following: no publishers": following only helps after a first
 * follow, so the empty state offers the publishers with the most titles in the
 * user's library, each one tap to follow.
 */
export function FollowingEmpty() {
  const { t } = useTranslation('account')
  const apiError = useApiError()
  const follow = useFollow()
  const library = useLibrary().data ?? []

  const counts = new Map<string, { name: string; count: number }>()
  for (const item of library) {
    if (!item.publisher) continue
    const entry = counts.get(item.publisher.id) ?? {
      name: item.publisher.name,
      count: 0,
    }
    entry.count += 1
    counts.set(item.publisher.id, entry)
  }
  const suggested = [...counts]
    .sort(([, a], [, b]) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, SUGGESTED)

  return (
    <EmptyState
      icon={<UsersIcon />}
      title={t('following.emptyTitle')}
      text={t('following.emptyText')}
      className="rounded-xl bg-card"
    >
      {suggested.length > 0 && (
        <>
          <EmptyLabel id="suggested-publishers">
            {t('following.fromLibrary')}
          </EmptyLabel>
          <ul
            aria-labelledby="suggested-publishers"
            className="grid w-full max-w-[400px] gap-2 text-left"
          >
            {suggested.map(([id, { name, count }]) => (
              <li
                key={id}
                className="flex items-center gap-3 rounded-[10px] border bg-background px-3 py-2.5"
              >
                <PublisherLogo
                  name={name}
                  url={undefined}
                  className="size-[38px] rounded-[10px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('following.inLibrary', { count })}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={follow.isPending}
                  aria-label={t('following.followLabel', { name })}
                  onClick={() =>
                    follow.mutate(id, {
                      onError: (error) => toast.error(apiError(error)),
                    })
                  }
                  className="border"
                >
                  {t('following.follow')}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </EmptyState>
  )
}
