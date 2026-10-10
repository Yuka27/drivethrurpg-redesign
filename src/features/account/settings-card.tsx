import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Figma: secondary 32px button on desktop; 28px, 12px text and 6px radius in mobile rows. */
export const rowButtonClass =
  'max-lg:h-7 max-lg:rounded-md max-lg:px-2.5 max-lg:text-xs'

/** Outline badge with the design's 8px radius ("Default", "Not connected"). */
export const badgeClass = 'h-[22px] rounded-md px-2'

/**
 * A settings section: title, description, an optional header action ("Add New
 * Address" on desktop) and its rows. Figma: card background, 14px radius, 24px
 * padding, 12px between header and rows.
 */
export function SettingsCard({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  /** heading id; also the anchor (#addresses) */
  id: string
  title: string
  description: string
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'flex flex-col gap-3 rounded-xl bg-card p-6 text-card-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 lg:min-h-12">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            id={id}
            className="font-sans text-lg leading-7 font-bold tracking-normal"
          >
            {title}
          </h2>
          <p className="text-xs text-muted-foreground lg:text-sm">
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * One row under a divider: label and hint on the left, value and actions on the
 * right. Below lg (Figma mobile) the value moves under the hint and the icon
 * sits inline with the label.
 */
export function SettingsRow({
  icon,
  label,
  hint,
  value,
  actions,
  align = 'center',
  className,
}: {
  icon?: ReactNode
  label: ReactNode
  hint?: ReactNode
  /** muted value shown next to the actions on desktop and under the hint on mobile */
  value?: ReactNode
  actions?: ReactNode
  align?: 'center' | 'start'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex gap-4 border-t border-muted py-2',
        align === 'start' ? 'items-start' : 'items-center',
        className,
      )}
    >
      {icon && <div className="shrink-0 max-lg:hidden">{icon}</div>}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2.5 text-sm">
          {icon && <span className="shrink-0 lg:hidden">{icon}</span>}
          {label}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        {value && (
          <div className="text-sm break-all text-muted-foreground lg:hidden">
            {value}
          </div>
        )}
      </div>
      {(value || actions) && (
        <div className="flex shrink-0 items-center gap-3">
          {value && (
            <span className="text-sm text-muted-foreground max-lg:hidden">
              {value}
            </span>
          )}
          {actions}
        </div>
      )}
    </div>
  )
}
