import { useRouter } from '@tanstack/react-router'
import type { ComponentProps } from 'react'

/**
 * A link whose address comes from the API ("/titles?onSale=true", or another
 * site): an app address opens without reloading the page, like a router
 * `<Link>`, while a modified click (new tab, …) stays the browser's.
 */
export function AppAnchor({
  href,
  onClick,
  ...props
}: ComponentProps<'a'> & { href: string }) {
  const router = useRouter()
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event)
        const modified =
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
        if (
          !event.defaultPrevented &&
          !modified &&
          event.button === 0 &&
          href.startsWith('/') &&
          !href.startsWith('//')
        ) {
          event.preventDefault()
          router.history.push(href)
        }
      }}
      {...props}
    />
  )
}
