import { useTranslation } from 'react-i18next'

import { CatalogBanner } from './catalog-banner'
import { FeaturedForYou } from './featured-for-you'
import { HeroCarousel } from './hero-carousel'
import { PromoTiles } from './promo-tiles'
import { PublisherStrip } from './publisher-strip'
import { TitleTabs, TitleTabsSkeleton } from './title-tabs'
import { useHomeSections } from '@/api/titles'
import { RecentlyViewed } from '@/components/title/recently-viewed'

/**
 * The home page. The hero, promos, publishers and lists come from GET /home;
 * "Featured" and the catalogue numbers from the catalogue itself (GET
 * /titles, /titles/facets); "Recently Viewed" from this device.
 */
export function HomePage() {
  const { t } = useTranslation('home')
  const home = useHomeSections()
  const sections = home.data

  // the hero 8px under the header and over the promos; the other sections
  // 20px apart on phones, 32px on desktop
  return (
    <div className="container flex flex-col gap-5 pt-2 pb-8 lg:gap-8">
      <h1 className="sr-only">{t('heading')}</h1>
      <div className="flex flex-col gap-2">
        <HeroCarousel />
        <PromoTiles />
      </div>
      {home.isPending ? (
        <TitleTabsSkeleton />
      ) : (
        sections && <TitleTabs sections={sections} />
      )}
      <FeaturedForYou />
      <CatalogBanner />
      <PublisherStrip />
      <RecentlyViewed />
    </div>
  )
}
