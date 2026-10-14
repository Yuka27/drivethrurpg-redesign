import { cn } from '@/lib/utils'

/** A grey block in the shape of content still loading (hidden from AT). */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        'animate-pulse rounded-md bg-muted motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
