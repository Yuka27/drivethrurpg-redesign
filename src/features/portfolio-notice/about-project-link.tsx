import { useTranslation } from 'react-i18next'

import { usePortfolioNotice } from './use-portfolio-notice'

/** The footer's "About this project": the portfolio notice again, whatever was chosen. */
export function AboutProjectLink() {
  const { t } = useTranslation('portfolioNotice')
  const show = usePortfolioNotice((state) => state.show)

  return (
    <button
      type="button"
      // focus comes back here when the notice closes
      onClick={(event) => show(event.currentTarget)}
      className="inline-flex min-h-6 items-center rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {t('footerLink')}
    </button>
  )
}
