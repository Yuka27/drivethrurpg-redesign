import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A spinning loader. Decorative: in a button the label says what is happening
 * ("Claiming…"), so the spinner is hidden from assistive technology.
 */
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      aria-hidden
      className={cn(
        'size-4 animate-spin motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
}

export { Spinner }
