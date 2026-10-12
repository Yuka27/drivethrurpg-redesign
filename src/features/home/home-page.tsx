import { useTranslation } from 'react-i18next'

import { CatalogBanner } from './catalog-banner'
import { FeaturedSystems } from './featured-systems'
import { PromoTiles } from './promo-tiles'
import { PublisherStrip } from './publisher-strip'
import { TitleTabs } from './title-tabs'
import { UnderPrice } from './under-price'
import { useHomeSections } from '@/api/titles'
import { PromoBanner } from '@/components/site/promo-banner'
import { RecentlyViewed } from '@/components/title/recently-viewed'

/**
 * The home page. Its lists come from GET /home (sale, new, bestselling, free);
 * "Featured", the catalogue numbers and the publishers from the catalogue
 * itself (GET /titles, /titles/facets); "Recently Viewed" from this device.
 */
export function HomePage() {
  const { t } = useTranslation('home')
  const sections = useHomeSections().data

  // Figma: sections 20px apart on phones, 32px on desktop
  return (
    <div className="container flex flex-col gap-5 pt-5 pb-8 lg:gap-8 lg:pt-8">
      <h1 className="sr-only">{t('heading')}</h1>
      <PromoBanner />
      {sections && (
        <>
          <PromoTiles titles={sections.get('sale')?.titles ?? []} />
          <TitleTabs sections={sections} />
        </>
      )}
      <FeaturedSystems />
      <CatalogBanner />
      <PublisherStrip />
      {/* Figma: on phones only */}
      <UnderPrice className="lg:hidden" />
      <RecentlyViewed />
    </div>
  )
}
