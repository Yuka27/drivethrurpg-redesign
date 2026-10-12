import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import { useHomeBanners } from '@/api/titles'
import { Button } from '@/components/ui/button'

/**
 * Figma: the promotion at the top of the home page and the listing. Its content is the API's (the first
 * GET /home banner), on its image with a dark gradient for the text: from the
 * left on desktop, from the bottom on phones. Nothing while it loads or fails.
 */
export function PromoBanner() {
  const { t } = useTranslation('listing')
  const banners = useHomeBanners()
  const router = useRouter()
  const banner = banners.data?.[0]
  if (!banner) return null

  return (
    <section
      aria-labelledby={`banner-${banner.id}`}
      className="relative isolate flex h-[336px] overflow-hidden rounded-xl border border-muted bg-card lg:h-[255px] lg:items-center lg:px-10"
    >
      {banner.image && (
        <img
          src={assetUrl(banner.image.url)}
          alt={banner.image.alt}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 from-35% to-transparent to-75% lg:bg-linear-to-r lg:from-black/80 lg:from-28% lg:to-transparent lg:to-48%"
      />
      <div className="mt-auto flex max-w-sm flex-col items-start gap-4 p-4 lg:mt-0 lg:p-0">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-primary uppercase">
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
          <a
            href={banner.link}
            onClick={(event) => {
              // an app link: go there without reloading the page
              if (banner.link.startsWith('/')) {
                event.preventDefault()
                router.history.push(banner.link)
              }
            }}
          >
            {banner.cta}
          </a>
        </Button>
      </div>
    </section>
  )
}
