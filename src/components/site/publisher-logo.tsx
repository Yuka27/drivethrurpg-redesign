import { useState } from 'react'

import { assetUrl } from '@/api/client'
import { cn } from '@/lib/utils'

/** 40px logo tile; the publisher's initials when there is no logo or it fails to load. */
export function PublisherLogo({
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
      // words only: "Lans Macabre Publishing" -> "LM"
      .filter((word) => /^\p{L}/u.test(word))
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
    return (
      <span
        aria-hidden
        // the caller's classes last: a bigger tile can ask for bigger initials
        className={cn(
          'size-10 shrink-0 rounded-xl border border-muted bg-card',
          'grid place-items-center text-xs font-semibold',
          className,
        )}
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
