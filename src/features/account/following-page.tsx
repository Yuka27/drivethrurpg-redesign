import { Link } from '@tanstack/react-router'
import { ChevronDownIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { FollowingEmpty } from './account-empty'
import { AccountPage } from './account-page'
import { ErrorState } from '@/components/site/empty-state'
import { OptionSelect } from '@/components/site/option-select'
import { LoadingStatus } from '@/components/site/loading-status'
import { SearchField } from '@/components/site/search-field'
import { FOLLOW_KINDS } from '@/api/follow-kind'
import type { FollowKind } from '@/api/follow-kind'
import {
  useFollow,
  useFollowing,
  useNewTitleCounts,
  useSetFollowEmail,
  useUnfollow,
} from '@/api/following'
import type { Followed } from '@/api/following'
import { PublisherLogo } from '@/components/site/publisher-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useFormatDate } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'

type Sort = 'recent' | 'name' | 'titles'

const SORTS: Record<Sort, (a: Followed, b: Followed) => number> = {
  recent: (a, b) => b.followedAt.localeCompare(a.followedAt),
  name: (a, b) => a.name.localeCompare(b.name),
  // only publishers have a count; the rest keep their names' order
  titles: (a, b) =>
    (b.titleCount ?? 0) - (a.titleCount ?? 0) || a.name.localeCompare(b.name),
}

/** The listing filtered by what a row follows; series and imprints have no filter. */
const VIEW_SEARCH: Partial<
  Record<
    FollowKind,
    (
      id: string,
    ) => { publisher: string } | { system: string } | { genre: string }
  >
> = {
  publisher: (id) => ({ publisher: id }),
  rule_system: (id) => ({ system: id }),
  genre: (id) => ({ genre: id }),
}

/**
 * Everything the user follows, a group per kind (publishers, series,
 * imprints, game systems, genres): new-release emails per row, view,
 * unfollow (with Undo).
 */
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

  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    const visible = (following.data ?? [])
      .filter((item) => item.name.toLocaleLowerCase().includes(needle))
      .sort(SORTS[sort])
    return FOLLOW_KINDS.map((kind) => ({
      kind,
      items: visible.filter((item) => item.kind === kind),
    })).filter((group) => group.items.length > 0)
  }, [following.data, query, sort])

  const empty = following.data?.length === 0

  const unfollowWithUndo = (item: Followed) =>
    unfollow.mutate(item, {
      onSuccess: () =>
        toast.success(t('following.unfollowed', { name: item.name }), {
          action: {
            label: t('following.undo'),
            onClick: () => follow.mutate(item),
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

        {following.isError ? (
          <ErrorState
            title={t('following.loadErrorTitle')}
            onRetry={() => void following.refetch()}
            className="rounded-xl bg-card"
          />
        ) : following.isPending ? (
          <div>
            <LoadingStatus />
            <ul
              aria-hidden
              className="flex flex-col gap-3 rounded-xl bg-card p-6"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <li
                  key={index}
                  className="flex items-center gap-4 border-muted not-first:border-t not-first:pt-3"
                >
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-32 rounded-lg max-lg:hidden" />
                </li>
              ))}
            </ul>
          </div>
        ) : empty ? (
          <FollowingEmpty />
        ) : groups.length === 0 ? (
          <p className="rounded-xl bg-card p-6 text-sm text-muted-foreground">
            {t('following.noMatches', { query: query.trim() })}
          </p>
        ) : (
          groups.map(({ kind, items }) => (
            <section
              key={kind}
              aria-labelledby={`following-${kind}`}
              className="flex flex-col gap-3 rounded-xl bg-card p-6"
            >
              <h2
                id={`following-${kind}`}
                className="font-sans text-base leading-6 font-bold"
              >
                {t(`following.groups.${kind}`)}
              </h2>
              <ul className="flex flex-col">
                {items.map((item, index) => (
                  <FollowedRow
                    key={item.id}
                    item={item}
                    first={index === 0}
                    onUnfollow={() => unfollowWithUndo(item)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </AccountPage>
  )
}

/**
 * Desktop: logo, name and counts, then the email switch and the menu in one row.
 * Mobile: the switch moves under the counts and the menu goes full width
 * under the row, inset to the text.
 */
function FollowedRow({
  item,
  first,
  onUnfollow,
}: {
  item: Followed
  first: boolean
  onUnfollow: () => void
}) {
  const { t } = useTranslation('account')
  const apiError = useApiError()
  const formatDate = useFormatDate({ month: 'short', year: 'numeric' })
  const { data: newCounts } = useNewTitleCounts()
  const setEmail = useSetFollowEmail()
  // the feed counts publishers' titles only
  const newCount =
    item.kind === 'publisher' ? (newCounts?.get(item.id) ?? 0) : 0
  const viewSearch = VIEW_SEARCH[item.kind]

  const emailSwitch = (
    <label className="flex items-center gap-3 text-xs text-muted-foreground">
      {t('following.email')}
      <Switch
        checked={item.emailNewReleases}
        aria-label={t('following.emailLabel', { name: item.name })}
        onCheckedChange={(email) =>
          setEmail.mutate(
            { kind: item.kind, id: item.id, email },
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
        name={item.name}
        url={item.logo?.url}
        className="row-span-2 lg:row-span-1"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2.5 text-sm">
          <span className="truncate">{item.name}</span>
          {newCount > 0 && (
            <Badge
              variant="outline"
              className="h-[22px] rounded-md border-primary px-2 text-primary-text"
              aria-label={t('following.newLabel', { count: newCount })}
            >
              {t('following.new', { count: newCount })}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.titleCount === null
            ? t('following.since', { date: formatDate(item.followedAt) })
            : t('following.meta', {
                count: item.titleCount,
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
              aria-label={t('following.menuLabel', { name: item.name })}
              className="h-9 justify-between gap-1 rounded-lg border-border bg-background px-2.5 shadow-none max-lg:w-full dark:bg-background"
            >
              {t('following.menu')}
              <ChevronDownIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {viewSearch && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/titles" search={viewSearch(item.id)}>
                    {t(
                      item.kind === 'publisher'
                        ? 'following.viewPublisher'
                        : 'following.viewTitles',
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onSelect={onUnfollow}>
              {t('following.unfollow')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}
