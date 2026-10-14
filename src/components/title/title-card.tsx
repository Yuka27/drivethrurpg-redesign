import { Link } from '@tanstack/react-router'
import { LanguagesIcon } from 'lucide-react'

import {
  ContentLanguageTooltip,
  useIsOtherLanguage,
} from './content-language-note'
import { RatingStars } from './rating-stars'
import { CartButton, WishlistButton } from './title-actions'
import { TitlePrice } from './title-price'
import { assetUrl } from '@/api/client'
import type { TitleSummary as Title } from '@/api/titles'
import { useLanguageName } from '@/i18n/format'
import { cn } from '@/lib/utils'

/** Cover, with the title's page behind it (the title text is the link people read). */
export function TitleCover({
  title,
  className,
}: {
  title: Title
  className?: string
}) {
  return (
    <Link
      to="/titles/$titleId"
      params={{ titleId: title.id }}
      // the title link right next to it says the same
      tabIndex={-1}
      aria-hidden
      className={cn(
        'block overflow-hidden rounded-xl border border-muted bg-card',
        className,
      )}
    >
      {title.cover && (
        <img
          src={assetUrl(title.cover.url)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      )}
    </Link>
  )
}

/** Publisher (with a hint when the text is in another language) and title. */
export function TitleHeading({
  title,
  className,
}: {
  title: Title
  className?: string
}) {
  const otherLanguage = useIsOtherLanguage(title.textLanguage)
  const languageName = useLanguageName()

  return (
    <div className={cn('min-w-0', className)}>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="truncate">{title.publisher?.name}</span>
        {otherLanguage && (
          <ContentLanguageTooltip textLanguage={title.textLanguage}>
            <span
              tabIndex={0}
              className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <LanguagesIcon aria-hidden className="size-3" />
              {/* the name ("Spanish"), never the code */}
              <span className="sr-only">
                {languageName(title.textLanguage)}
              </span>
            </span>
          </ContentLanguageTooltip>
        )}
      </p>
      <h2 className="text-sm leading-5 font-bold">
        <Link
          to="/titles/$titleId"
          params={{ titleId: title.id }}
          className="line-clamp-2 hover:underline lg:line-clamp-1"
        >
          {title.title}
        </Link>
      </h2>
    </div>
  )
}

/**
 * A title in the listing's card view: cover (235px on phones, 306px on
 * desktop) with the heart on it, then publisher, title, stars, price and cart.
 */
export function TitleCard({ title }: { title: Title }) {
  return (
    <li className="flex min-w-0 flex-col">
      <div className="relative">
        <TitleCover title={title} className="h-[235px] lg:h-[306px]" />
        <WishlistButton
          title={title}
          className="absolute top-2 right-2 size-7 rounded-md lg:size-8 lg:rounded-lg"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 py-2">
        <TitleHeading title={title} />
        {title.rating && (
          <RatingStars
            average={title.rating.average}
            count={title.rating.count}
          />
        )}
        <div className="mt-auto flex items-center justify-between gap-2">
          <TitlePrice title={title} className="text-base leading-6" />
          <CartButton
            title={title}
            className="size-7 rounded-md lg:size-6 [&_svg]:size-4 lg:[&_svg]:size-3"
          />
        </div>
      </div>
    </li>
  )
}
