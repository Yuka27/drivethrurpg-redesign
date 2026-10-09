import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useLogin } from '@/api/auth'
import { Button } from '@/components/ui/button'

type LoginButtonProps = {
  className?: string
  children: ReactNode
  onLoggedIn?: () => void
}

/**
 * TEMPORARY: logs in straight away with demo credentials so the logged-in and
 * guest states can be switched. Replace with a link to /login once the form exists:
 *   <Link to="/login" search={{ redirect: location.href }}>Log In</Link>
 */
export function LoginButton({
  className,
  children,
  onLoggedIn,
}: LoginButtonProps) {
  const { t } = useTranslation()
  const login = useLogin()

  return (
    <Button
      size="sm"
      className={className}
      disabled={login.isPending}
      onClick={() => login.mutate(undefined, { onSuccess: onLoggedIn })}
    >
      {login.isPending ? t('header.loggingIn') : children}
    </Button>
  )
}
