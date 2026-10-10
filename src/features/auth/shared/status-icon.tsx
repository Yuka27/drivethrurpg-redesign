import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const TONES = {
  neutral: 'border-border bg-secondary text-foreground',
  success: 'border-success/50 bg-success/[0.18] text-success',
  warning: 'border-warning/50 bg-warning/[0.16] text-warning',
} as const

/** The round icon above an auth screen's title (key, envelope, check, clock). Decorative. */
export function StatusIcon({
  icon: Icon,
  tone = 'neutral',
  strokeWidth = 1.8,
  className,
}: {
  icon: LucideIcon
  tone?: keyof typeof TONES
  strokeWidth?: number
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'mb-4 grid size-14 place-items-center rounded-full border',
        TONES[tone],
        className,
      )}
    >
      <Icon className="size-[26px]" strokeWidth={strokeWidth} />
    </div>
  )
}
