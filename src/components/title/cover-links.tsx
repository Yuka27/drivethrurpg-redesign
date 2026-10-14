import { Link } from '@tanstack/react-router'

import { assetUrl } from '@/api/client'
import { cn } from '@/lib/utils'

/**
 * A short row of covers, each opening its title (the empty wishlist's
 * popular picks, a withdrawn title's similar ones). Named by `labelledBy`.
 */
export function CoverLinks({
  titles,
  labelledBy,
  className = 'w-16',
}: {
  titles: Array<{
    id: string
    title: string
    cover: { url: string } | null
  }>
  /** the id of the heading above the row */
  labelledBy: string
  /** the covers' width */
  className?: string
}) {
  return (
    <ul aria-labelledby={labelledBy} className="flex justify-center gap-3">
      {titles.map((title) => (
        <li key={title.id}>
          <Link
            to="/titles/$titleId"
            params={{ titleId: title.id }}
            aria-label={title.title}
            title={title.title}
            className={cn(
              'block aspect-[3/4] overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              className,
            )}
          >
            {title.cover && (
              <img
                src={assetUrl(title.cover.url)}
                alt=""
                className="size-full object-cover"
              />
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
