import { Badge } from '@/components/ui/badge'
import { useFormatNumber } from '@/i18n/format'

/**
 * The red count on a header icon (cart, wishlist, notifications): nothing at
 * 0, "99+" past 99. Hidden from assistive tech: the button's name says it.
 */
export function CountBadge({ count }: { count: number }) {
  const formatNumber = useFormatNumber()
  if (count <= 0) return null
  return (
    <Badge
      aria-hidden
      className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 py-0 text-[10px] leading-none tabular-nums"
    >
      {count > 99 ? `${formatNumber(99)}+` : formatNumber(count)}
    </Badge>
  )
}
