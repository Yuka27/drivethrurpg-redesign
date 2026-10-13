import { Link } from '@tanstack/react-router'
import { ChevronDownIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AccountPage } from './account-page'
import { OptionSelect } from '@/components/site/option-select'
import { SearchField } from '@/components/site/search-field'
import { assetUrl } from '@/api/client'
import {
  useFollow,
  useFollowing,
  useNewTitleCounts,
  useSetFollowEmail,
  useUnfollow,
} from '@/api/following'
import type { FollowedPublisher } from '@/api/following'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { useFormatDate } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'

type Sort = 'recent' | 'name' | 'titles'

const SORTS: Record<
  Sort,
  (a: FollowedPublisher, b: FollowedPublisher) => number
> = {
  recent: (a, b) => b.followedAt.localeCompare(a.followedAt),
  name: (a, b) => a.publisher.name.localeCompare(b.publisher.name),
  titles: (a, b) => b.publisher.titleCount - a.publisher.titleCount,
}

/** Followed publishers: new-release emails per publisher, view, unfollow (with Undo). */
export function FollowingPage() {
  const { t } = useTranslation('account')
  const apiError = useApiError()
  const following = useFollowing()
  // here, not in the row: the row unmounts as soon as it leaves the list, and
  // React Query does not call a mutate() callback of an unmounted component
  const unfollow = useUnfollow()
  const follow = useFollow()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('recent')

  const sortLabels: Record<Sort, string> = {
    recent: t('following.sortRecent'),
    name: t('following.sortName'),
    titles: t('following.sortTitles'),
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return (following.data ?? [])
      .filter((item) =>
        item.publisher.name.toLocaleLowerCase().includes(needle),
      )
      .sort(SORTS[sort])
  }, [following.data, query, sort])

  const empty = following.data?.length === 0

  const unfollowWithUndo = ({ publisher }: FollowedPublisher) =>
    unfollow.mutate(publisher.id, {
      onSuccess: () =>
        toast.success(t('following.unfollowed', { name: publisher.name }), {
          action: {
            label: t('following.undo'),
            onClick: () => follow.mutate(publisher.id),
          },
        }),
      onError: (error) => toast.error(apiError(error)),
    })

  return (
    <AccountPage
      title={t('following.title')}
      subtitle={t('following.subtitle')}
    >
      <div className="flex flex-col gap-4">
        {!empty && (
          <div className="flex items-center gap-4">
            <SearchField
              label={t('following.search')}
              // short: it shares the row with the sort button on phones
              placeholder={t('following.searchPlaceholder')}
              value={query}
              onChange={setQuery}
            />
            <OptionSelect
              label={t('following.sort')}
              value={sort}
              options={(Object.keys(SORTS) as Array<Sort>).map((value) => ({
                value,
                label: sortLabels[value],
              }))}
              onValueChange={(value) => setSort(value as Sort)}
              display={t('following.sortDisplay', {
                option: sortLabels[sort],
              })}
              className="h-8 data-[size=default]:h-8"
            />
          </div>
        )}

        {following.isError && (
          <p className="text-sm text-destructive">{t('loadError')}</p>
        )}

        {empty ? (
          <div className="rounded-xl bg-card p-6 text-sm">
            <p>{t('following.empty')}</p>
            <p className="mt-1 text-muted-foreground">
              {t('following.emptyHint')}
            </p>
          </div>
        ) : (
          following.data && (
            <ul
              aria-label={t('following.title')}
              className="flex flex-col gap-3 rounded-xl bg-card p-6"
            >
              {visible.length === 0 && (
                <li className="py-2 text-sm text-muted-foreground">
                  {t('following.noMatches', { query: query.trim() })}
                </li>
              )}
              {visible.map((item, index) => (
                <FollowedRow
                  key={item.publisher.id}
                  item={item}
                  first={index === 0}
                  onUnfollow={() => unfollowWithUndo(item)}
                />
              ))}
            </ul>
          )
        )}
      </div>
    </AccountPage>
  )
}

/**
 * Desktop: logo, name and counts, then the email switch and the menu in one row.
 * Mobile (Figma): the switch moves under the counts and the menu goes full width
 * under the row, inset to the text.
 */
function FollowedRow({
  item,
  first,
  onUnfollow,
}: {
  item: FollowedPublisher
  first: boolean
  onUnfollow: () => void
}) {
  const { t } = useTranslation('account')
  const apiError = useApiError()
  const formatDate = useFormatDate({ month: 'short', year: 'numeric' })
  const { data: newCounts } = useNewTitleCounts()
  const setEmail = useSetFollowEmail()
  const { publisher } = item
  const newCount = newCounts?.get(publisher.id) ?? 0

  const emailSwitch = (
    <label className="flex items-center gap-3 text-xs text-muted-foreground">
      {t('following.email')}
      <Switch
        checked={item.emailNewReleases}
        aria-label={t('following.emailLabel', { name: publisher.name })}
        onCheckedChange={(email) =>
          setEmail.mutate(
            { id: publisher.id, email },
            { onError: (error) => toast.error(apiError(error)) },
          )
        }
        className="data-[state=unchecked]:bg-secondary-foreground"
      />
    </label>
  )

  return (
    // one grid, two layouts, every control rendered once:
    // mobile  [logo name+counts] [   email   ] [  menu (full width)  ]
    // desktop [logo name+counts ............ email  menu]
    <li
      className={cn(
        'grid grid-cols-[40px_minmax(0,1fr)] items-start gap-x-2 gap-y-1 py-2 lg:grid-cols-[40px_minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-3',
        !first && 'border-t border-muted',
      )}
    >
      <PublisherLogo
        name={publisher.name}
        url={publisher.logo?.url}
        className="row-span-2 lg:row-span-1"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2.5 text-sm">
          <span className="truncate">{publisher.name}</span>
          {newCount > 0 && (
            <Badge
              variant="outline"
              className="h-[22px] rounded-md border-primary px-2 text-primary"
              aria-label={t('following.newLabel', { count: newCount })}
            >
              {t('following.new', { count: newCount })}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('following.meta', {
            count: publisher.titleCount,
            date: formatDate(item.followedAt),
          })}
        </p>
      </div>
      <div className="col-start-2 lg:col-start-3 lg:row-start-1">
        {emailSwitch}
      </div>

      <div className="col-span-2 mt-1 px-10 lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:mt-0 lg:px-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label={t('following.menuLabel', { name: publisher.name })}
              className="h-9 justify-between gap-1 rounded-lg border-border bg-background px-2.5 shadow-none max-lg:w-full dark:bg-background"
            >
              {t('following.menu')}
              <ChevronDownIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                to="/publishers/$publisherId"
                params={{ publisherId: publisher.id }}
              >
                {t('following.viewPublisher')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onUnfollow}>
              {t('following.unfollow')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

/** 40px logo tile; the publisher's initials when there is no logo or it fails to load. */
function PublisherLogo({
  name,
  url,
  className,
}: {
  name: string
  url: string | undefined
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const tile = cn(
    'size-10 shrink-0 rounded-xl border border-muted bg-card',
    className,
  )

  if (!url || failed) {
    const initials = name
      .split(/\s+/)
      // words only: "Lantern & Ash Games" -> "LA"
      .filter((word) => /^\p{L}/u.test(word))
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
    return (
      <span
        aria-hidden
        className={cn(tile, 'grid place-items-center text-xs font-semibold')}
      >
        {initials}
      </span>
    )
  }

  return (
    <img
      src={assetUrl(url)}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(tile, 'object-cover')}
    />
  )
}
