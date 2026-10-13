import { Link, useRouter } from '@tanstack/react-router'
import {
  BellIcon,
  GiftIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  TagIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { EmptyState } from './empty-state'
import { CountBadge } from './count-badge'
import { LoadingStatus } from './loading-status'
import { IconTooltip } from './icon-tooltip'
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/api/notifications'
import type { Notification } from '@/api/notifications'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLocale } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'

/** Figma: a bag for orders, a gift for gifts and publisher news. */
const ICONS: Record<string, LucideIcon> = {
  order: ShoppingBagIcon,
  gift: GiftIcon,
  publisher: GiftIcon,
  wishlist: TagIcon,
  library: RefreshCwIcon,
}

/**
 * The API's links, as the app's routes: the library's "updated" view is its
 * status filter here.
 */
export const appLink = (link: string) =>
  link.replace(/^\/library\?view=updated\b/, '/library?status=updated')

/** "Today", "Yesterday", then "2 Oct". */
function useDayLabel() {
  const locale = useLocale()
  return useMemo(() => {
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    const date = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
    })
    return (value: string) => {
      const then = new Date(value)
      const start = (day: Date) =>
        new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
      const days = Math.round((start(new Date()) - start(then)) / 86_400_000)
      const label =
        days >= 0 && days < 2
          ? relative.format(-days, 'day')
          : date.format(then)
      return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1)
    }
  }, [locale])
}

/**
 * Figma "Notifications": the bell in the header (with the unread count) opens
 * the latest notifications. Opening one marks it read and goes to its page;
 * "Mark all as read" and the settings sit at the top and the bottom. Phones:
 * the panel spans the screen under the header.
 */
export function NotificationsPopover({
  unread,
  label,
  countLabel,
}: {
  unread: number
  /** "Notifications" */
  label: string
  /** "Notifications, 4 unread" */
  countLabel: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconTooltip label={label}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={unread > 0 ? countLabel : label}
            className="relative"
          >
            <BellIcon aria-hidden />
            <CountBadge count={unread} />
          </Button>
        </PopoverTrigger>
      </IconTooltip>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        aria-label={t('notifications.title')}
        className="flex w-[448px] max-w-[calc(100vw-32px)] flex-col gap-4 overflow-hidden rounded-[14px] p-0"
      >
        <NotificationsPanel onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const apiError = useApiError()
  const router = useRouter()
  const query = useNotifications()
  const markAll = useMarkAllRead()
  const markOne = useMarkNotificationRead()
  const items = query.data?.items ?? []
  const anyUnread = items.some((item) => !item.read)

  const open = (notification: Notification) => {
    if (!notification.read) markOne.mutate(notification.id)
    onClose()
    if (notification.link) router.history.push(appLink(notification.link))
  }

  return (
    <>
      <div className="flex items-start gap-4 px-4 pt-4">
        <h2 className="flex-1 font-sans text-base font-medium">
          {t('notifications.title')}
        </h2>
        {anyUnread && (
          <button
            type="button"
            disabled={markAll.isPending}
            onClick={() =>
              markAll.mutate(undefined, {
                onError: (error) => toast.error(apiError(error)),
              })
            }
            className="text-base font-medium text-primary hover:underline disabled:opacity-60"
          >
            {t('notifications.markAll')}
          </button>
        )}
      </div>

      <div className="max-h-[min(400px,60vh)] min-h-0 overflow-y-auto px-4">
        {query.isError ? (
          <div className="flex flex-col items-start gap-2 py-4">
            <p className="text-sm text-muted-foreground">
              {t('notifications.loadError')}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="border"
              onClick={() => void query.refetch()}
            >
              {t('actions.tryAgain')}
            </Button>
          </div>
        ) : !query.data ? (
          <div>
            <LoadingStatus />
            <ul aria-hidden>
              {Array.from({ length: 4 }, (_, index) => (
                <li
                  key={index}
                  className="flex gap-2.5 border-b border-muted py-2 last:border-b-0"
                >
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <span className="flex flex-1 flex-col gap-1.5 pt-0.5">
                    <Skeleton className="h-3.5 w-11/12" />
                    <Skeleton className="h-3.5 w-3/5" />
                    <Skeleton className="mt-0.5 h-3 w-16" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BellIcon />}
            title={t('notifications.emptyTitle')}
            text={t('notifications.emptyText')}
            className="py-6"
          />
        ) : (
          <ul aria-label={t('notifications.title')}>
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                onOpen={() => open(item)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end border-t bg-muted/50 px-4 pt-4 pb-[17px]">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 rounded-lg bg-background"
        >
          <Link
            to="/account/preferences"
            hash="email-notifications"
            onClick={onClose}
          >
            {t('notifications.settings')}
          </Link>
        </Button>
      </div>
    </>
  )
}

/**
 * One notification: the type's icon (outlined red while unread), the title in
 * bold, the rest, and the day. The whole row opens it.
 */
function NotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const dayLabel = useDayLabel()
  const Icon = ICONS[notification.type] ?? BellIcon
  const unread = !notification.read

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg border bg-background',
          unread && 'border-primary',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm leading-5">
          {unread && (
            <span className="sr-only">{t('notifications.unread')}: </span>
          )}
          <span className="font-semibold">{notification.title}</span>{' '}
          <span className={cn(!unread && 'text-muted-foreground')}>
            {notification.body}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {dayLabel(notification.createdAt)}
        </span>
      </span>
    </>
  )
  const rowClass =
    'flex w-full gap-2.5 rounded-md py-2 text-left outline-none hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50'

  return (
    <li className="border-b border-muted last:border-b-0">
      {notification.link ? (
        <a
          href={appLink(notification.link)}
          onClick={(event) => {
            // a plain click stays in the app; a new tab still works
            if (event.metaKey || event.ctrlKey || event.shiftKey) return
            event.preventDefault()
            onOpen()
          }}
          className={rowClass}
        >
          {body}
        </a>
      ) : (
        <button type="button" onClick={onOpen} className={rowClass}>
          {body}
        </button>
      )}
    </li>
  )
}
