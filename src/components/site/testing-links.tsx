import { FlaskConicalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuthDialogStore } from '@/stores/auth-dialog'

/**
 * TESTING ONLY: stands in for links the app would otherwise only get by email,
 * since this project sends no real emails. Remove once those flows exist.
 * - "Set new password": the link in the password-reset email (any token works
 *   with the mock API)
 * - "(expired link)": a link without a usable token
 */
export function TestingLinks() {
  const { t } = useTranslation()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const linkClass =
    'rounded-md px-2 py-1 text-xs font-medium text-foreground underline underline-offset-2 hover:text-primary'

  return (
    <section
      aria-labelledby="testing-links-title"
      className="flex flex-col gap-2 rounded-lg border border-dashed border-warning/50 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-4"
    >
      <h2
        id="testing-links-title"
        className="flex items-center gap-1.5 px-2 font-sans text-xs font-bold text-warning"
      >
        <FlaskConicalIcon aria-hidden className="size-3.5" />
        {t('footer.testing.title')}
      </h2>
      <ul className="flex flex-wrap gap-1">
        <li>
          <button
            type="button"
            className={linkClass}
            onClick={(event) =>
              openAuth('reset', {
                token: 'test-reset-token',
                returnFocusTo: event.currentTarget,
              })
            }
          >
            {t('footer.testing.resetPassword')}
          </button>
        </li>
        <li>
          <button
            type="button"
            className={linkClass}
            onClick={(event) =>
              openAuth('reset', { returnFocusTo: event.currentTarget })
            }
          >
            {t('footer.testing.resetPasswordExpired')}
          </button>
        </li>
      </ul>
      <p className="px-2 text-xs text-muted-foreground lg:ml-auto">
        {t('footer.testing.note')}
      </p>
    </section>
  )
}
