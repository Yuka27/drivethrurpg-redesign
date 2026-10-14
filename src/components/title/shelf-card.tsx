import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { TitlePrice } from './title-price'
import { assetUrl } from '@/api/client'
import type { TitleSummary } from '@/api/titles'
import { cn } from '@/lib/utils'

/**
 * A 200px cover card for sideways shelves (the cart's "Customers also
 * bought"): the cover, the title, the price and an optional
 * action ("Add") beside it. The whole card opens the title (a stretched link),
 * the action stays its own button on top.
 */
export function ShelfCard({
  title,
  action,
  className,
}: {
  title: TitleSummary
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-muted bg-card focus-within:ring-[3px] focus-within:ring-ring/50',
        className,
      )}
    >
      <span className="block h-[200px] bg-muted">
        {title.cover && (
          <img
            src={assetUrl(title.cover.url)}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </span>
      <span className="flex flex-col gap-1 px-3 py-2">
        <Link
          to="/titles/$titleId"
          params={{ titleId: title.id }}
          className="truncate text-sm outline-none group-hover:underline after:absolute after:inset-0"
        >
          {title.title}
        </Link>
        <span className="flex min-h-6 items-center justify-between gap-2">
          <TitlePrice
            title={title}
            className="flex-row-reverse justify-end text-xs"
          />
          {action && <span className="relative">{action}</span>}
        </span>
      </span>
    </div>
  )
}
