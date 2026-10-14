import type { ReactElement } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type IconTooltipProps = {
  /**
   * visible tooltip text: what the icon does ("Add to wishlist"); the
   * button's aria-label may say more ("Add to wishlist: Vaesen")
   */
  label: string
  /** where it opens; below by default (the header), above over a card */
  side?: 'top' | 'bottom'
  children: ReactElement
}

/** Hover/focus tooltip for an icon-only button: the words the icon stands for. */
export function IconTooltip({
  label,
  side = 'bottom',
  children,
}: IconTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
