import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const linkClass =
  'inline-flex items-center gap-2 font-semibold text-foreground hover:underline'

/** "← Back to log in" under the forgot-password screens: switches the modal to login. */
export function BackToLogin({ onBackToLogin }: { onBackToLogin: () => void }) {
  const { t } = useTranslation('auth')

  return (
    <p className="mt-[18px] border-t border-border pt-[18px] text-center text-[0.88rem]">
      <button type="button" onClick={onBackToLogin} className={linkClass}>
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t('login.backToLogin')}
      </button>
    </p>
  )
}
