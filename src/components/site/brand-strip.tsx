import { useTranslation } from 'react-i18next'

import type { BrandLink } from '@/config/footer'

type BrandStripProps = {
  links: Array<BrandLink>
}

/** Sister-site logos; wraps and centres until there is room for one row. */
export function BrandStrip({ links }: BrandStripProps) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('footer.otherSites')}
      className="border-y border-muted bg-card"
    >
      <ul className="container flex flex-wrap items-center justify-center gap-4 py-4 xl:h-12 xl:flex-nowrap xl:justify-between xl:py-0">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <img
                src={link.logo}
                alt={`${link.label} ${t('actions.opensInNewTab')}`}
                width={link.width}
                height={link.height}
                className="h-5 w-auto xl:h-6"
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
