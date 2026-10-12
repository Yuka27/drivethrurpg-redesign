import type { ReactNode } from 'react'

import { AccountBreadcrumb } from './account-breadcrumb'
import { cn } from '@/lib/utils'

export const pageTitleClass =
  'font-sans text-2xl leading-8 font-bold tracking-normal'

/** An account-area page: the mobile breadcrumb, the title and subtitle, then the content. */
export function AccountPage({
  title,
  subtitle,
  breadcrumb = true,
  className,
  children,
}: {
  title: string
  subtitle: string
  /** mobile only: "My account › {title}" back to the hub */
  breadcrumb?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {breadcrumb && <AccountBreadcrumb current={title} />}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className={pageTitleClass}>{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
