import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import { useRecentlyViewed } from '@/stores/recently-viewed'

/**
 * Figma "Recently Viewed": covers with their titles, scrolling sideways. Nothing
 * until the user has opened a title (on this device). `exclude`: the title on
 * screen, on its own page.
 */
export function RecentlyViewed({ exclude }: { exclude?: string }) {
  const { t } = useTranslation('listing')
  const titles = useRecentlyViewed((state) => state.titles).filter(
    (title) => title.id !== exclude,
  )
  if (titles.length === 0) return null

  return (
    <section aria-labelledby="recently-viewed" className="flex flex-col gap-4">
      <h2
        id="recently-viewed"
        className="font-sans text-lg leading-7 font-semibold"
      >
        {t('recentlyViewed')}
      </h2>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {titles.map((title) => (
          <li key={title.id} className="w-[143px] shrink-0 snap-start">
            <Link
              to="/titles/$titleId"
              params={{ titleId: title.id }}
              className="group flex flex-col overflow-hidden rounded-xl border border-muted bg-card"
            >
              {/* Figma: 143×186 with the caption */}
              <span className="block h-[152px] bg-muted">
                {title.coverUrl && (
                  <img
                    src={assetUrl(title.coverUrl)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
              </span>
              <span className="truncate px-3 py-2 text-xs text-muted-foreground group-hover:text-foreground">
                {title.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
