import type { ReactNode } from 'react'

/** A home section's title, and an optional action on the right ("View more"). */
export function SectionHeading({
  id,
  children,
  action,
}: {
  id: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="font-sans text-lg leading-7 font-semibold">
        {children}
      </h2>
      {action}
    </div>
  )
}
