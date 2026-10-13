import { LoadingStatus } from './loading-status'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * A page's outline while its route is still getting ready (the login check
 * of account pages, a page's code arriving): a title and a few cards. Pages
 * show their own, closer skeleton once they render.
 */
export function PageSkeleton() {
  return (
    <div className="container flex flex-col gap-6 pt-6 pb-8 lg:pt-8">
      <LoadingStatus />
      <div aria-hidden className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl bg-card" />
        ))}
      </div>
    </div>
  )
}
