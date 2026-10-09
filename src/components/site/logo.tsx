import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import logo from '@/assets/logos/drivethrurpg.png'

export function Logo() {
  const { t } = useTranslation()
  return (
    <Link to="/" className="shrink-0">
      <img src={logo} alt={t('brand.homeLink')} width={141} height={24} />
    </Link>
  )
}
