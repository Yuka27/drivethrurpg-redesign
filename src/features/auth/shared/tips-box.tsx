import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Muted box with a bold title and a bullet list ("Nothing in your inbox?"). */
export function TipsBox({
  title,
  children,
  className,
}: {
  title: string
  /** the <li> items */
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mt-[18px] rounded-[10px] border border-border bg-background px-4 py-3.5 text-[0.84rem] text-muted-foreground',
        className,
      )}
    >
      <b className="mb-1 block text-[0.86rem] text-foreground">{title}</b>
      <ul className="grid list-disc gap-1 pl-[18px]">{children}</ul>
    </div>
  )
}
