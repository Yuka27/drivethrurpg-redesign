import { TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Red alert box at the top of an auth form (error summary, server down, rate limit). */
export function FormAlert({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'mb-4 flex gap-2.5 rounded-[10px] border border-destructive/55 bg-destructive/[0.12] px-3.5 py-3 text-[0.86rem]',
        className,
      )}
    >
      <TriangleAlertIcon
        aria-hidden
        className="mt-px size-4 shrink-0 text-destructive"
      />
      <div>{children}</div>
    </div>
  )
}
