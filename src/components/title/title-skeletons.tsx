import { LoadingStatus } from '@/components/site/loading-status'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** `TitleCard` while loading: cover, publisher, title, stars, price. */
export function TitleCardSkeleton() {
  return (
    <li aria-hidden className="flex min-w-0 flex-col">
      <Skeleton className="h-[235px] rounded-xl lg:h-[306px]" />
      <div className="flex flex-col gap-2 px-3 py-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="size-7 lg:size-6" />
        </div>
      </div>
    </li>
  )
}

/** `TitleRow` while loading: same grid, grey blocks. */
export function TitleRowSkeleton() {
  return (
    <li
      aria-hidden
      className={cn(
        'grid grid-cols-[83px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-xl bg-card p-3 lg:grid-cols-[69px_minmax(0,1fr)_auto]',
        "[grid-template-areas:'cover_info'_'cover_buy'] lg:[grid-template-areas:'cover_info_buy']",
      )}
    >
      <Skeleton className="h-[114px] rounded-xl [grid-area:cover] lg:h-[94px]" />
      <div className="flex flex-col gap-2 self-end [grid-area:info] lg:self-center">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-[22px] w-40" />
      </div>
      <div className="flex items-center justify-between gap-2 self-start [grid-area:buy] lg:flex-col lg:items-end lg:self-center">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-[72px] lg:w-32" />
      </div>
    </li>
  )
}

/**
 * The listing's results while they load, in the view the user chose: cards in
 * the listing's grid or rows in its list.
 */
export function TitleResultsSkeleton({
  view = 'grid',
  count = 8,
  label,
}: {
  view?: 'grid' | 'list'
  count?: number
  /** the list's name, as the loaded list will have it */
  label?: string
}) {
  const Item = view === 'list' ? TitleRowSkeleton : TitleCardSkeleton
  return (
    <div>
      <LoadingStatus />
      <ul
        aria-busy
        aria-label={label}
        className={
          view === 'list'
            ? 'flex flex-col gap-3'
            : 'grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 lg:gap-3'
        }
      >
        {Array.from({ length: count }, (_, index) => (
          <Item key={index} />
        ))}
      </ul>
    </div>
  )
}

/** `ShelfCard` while loading (200px cover, title, price). */
export function ShelfCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-muted bg-card',
        className,
      )}
    >
      <Skeleton className="h-[200px] rounded-none" />
      <div className="flex flex-col gap-2 px-3 py-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}

/** A sideways shelf of `ShelfCard`s while it loads: its heading and cards. */
export function ShelfSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-4', className)}>
      <Skeleton className="h-7 w-48" />
      <div className="-mx-1 flex gap-3 overflow-hidden px-1 pb-1">
        {Array.from({ length: 5 }, (_, index) => (
          <ShelfCardSkeleton key={index} className="w-[200px] shrink-0" />
        ))}
      </div>
    </div>
  )
}
