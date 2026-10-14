import { useTranslation } from 'react-i18next'

import { AppAnchor } from './app-anchor'
import { assetUrl } from '@/api/client'
import { useHomeBanners } from '@/api/titles'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * The promotion at the top of the home page and the listing. Its content is the API's (the first
 * GET /home banner), on its image with a dark gradient for the text: from its
 * `contentSide` on desktop, from the bottom on phones. Its outline while it loads,
 * nothing when it fails.
 */
export function PromoBanner() {
  const { t } = useTranslation('listing')
  const banners = useHomeBanners()
  const banner = banners.data?.[0]
  if (banners.isPending)
    return <Skeleton className="h-[336px] rounded-xl lg:h-[255px]" />
  if (!banner) return null
  const right = banner.contentSide === 'right'

  return (
    <section
      aria-labelledby={`banner-${banner.id}`}
      className={cn(
        'relative isolate flex h-[336px] overflow-hidden rounded-xl border border-muted bg-card lg:h-[255px] lg:items-center lg:px-10',
        right && 'lg:justify-end',
      )}
    >
      {banner.image && (
        <img
          src={assetUrl(banner.image.url)}
          alt={banner.image.alt || banner.title}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      )}
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 -z-10 bg-linear-to-t from-black/90 from-35% to-transparent to-75% lg:from-black/80 lg:from-28% lg:to-transparent lg:to-48%',
          right ? 'lg:bg-linear-to-l' : 'lg:bg-linear-to-r',
        )}
      />
      {/* always over a dark image: the dark theme's text colours, in both themes */}
      <div
        className={cn(
          'dark mt-auto flex max-w-sm flex-col items-start gap-4 p-4 lg:mt-0 lg:p-0',
          right && 'lg:items-end lg:text-right',
        )}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-primary-text uppercase">
            {t('banner.featured')}
          </p>
          <h2
            id={`banner-${banner.id}`}
            className="font-sans text-2xl leading-8 font-bold text-white lg:text-3xl lg:leading-9"
          >
            {banner.title}
          </h2>
        </div>
        {banner.subtitle && (
          <p className="text-base text-white/90">{banner.subtitle}</p>
        )}
        <Button asChild className="h-8 rounded-lg px-2.5">
          <AppAnchor href={banner.link}>{banner.cta}</AppAnchor>
        </Button>
      </div>
    </section>
  )
}
