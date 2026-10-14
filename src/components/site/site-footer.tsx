import { useTranslation } from 'react-i18next'

import { BrandStrip } from './brand-strip'
import { FooterLink } from './footer-link'
import { NewsletterForm } from './newsletter-form'
import { SystemGroups } from './system-groups'
import { TestingLinks } from './testing-links'
import { AboutProjectLink } from '@/features/portfolio-notice/about-project-link'
import {
  brandLinks,
  copyrightKey,
  legalLinks,
  linkGroups,
  socialLinks,
} from '@/config/footer'

export function SiteFooter() {
  const { t } = useTranslation()
  return (
    <footer>
      <BrandStrip links={brandLinks} />
      <div className="container flex flex-col gap-4 pb-4">
        <div className="flex flex-col-reverse gap-3 border-b border-muted py-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label={t('footer.legalNav')}>
            <ul className="flex flex-wrap gap-1 lg:gap-3">
              {legalLinks.map((link) => (
                <li key={link.label ?? link.labelKey}>
                  <FooterLink link={link} />
                </li>
              ))}
              <li>
                <AboutProjectLink />
              </li>
            </ul>
          </nav>
          <NewsletterForm />
        </div>

        <div className="border-b border-muted pb-1">
          <SystemGroups groups={linkGroups} />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:py-2">
          <p className="px-2 text-xs font-medium text-muted-foreground">
            {t(copyrightKey)}
          </p>
          <nav aria-label={t('footer.socialNav')}>
            <ul className="flex flex-wrap gap-1 pt-2 lg:pt-0">
              {socialLinks.map((link) => (
                <li key={link.label ?? link.labelKey}>
                  <FooterLink link={link} />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <TestingLinks />
      </div>
    </footer>
  )
}
