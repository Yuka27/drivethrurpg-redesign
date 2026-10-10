import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useAuthDialogStore } from '@/stores/auth-dialog'

type LoginButtonProps = {
  className?: string
  children: ReactNode
  /** runs before the modal opens, e.g. to close the mobile menu */
  onOpen?: () => void
  /** where focus returns when the modal closes; defaults to this button */
  returnFocusTo?: HTMLElement | null
}

/** Opens the login modal (LoginDialog, mounted in the root route). */
export function LoginButton({
  className,
  children,
  onOpen,
  returnFocusTo,
}: LoginButtonProps) {
  const openLogin = useAuthDialogStore((state) => state.openLogin)

  return (
    <Button
      size="sm"
      className={className}
      aria-haspopup="dialog"
      onClick={() => {
        onOpen?.()
        openLogin(returnFocusTo)
      }}
    >
      {children}
    </Button>
  )
}
