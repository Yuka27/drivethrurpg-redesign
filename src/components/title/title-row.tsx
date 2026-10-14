import { useTranslation } from 'react-i18next'

import { RatingStars } from './rating-stars'
import { CartButton, WishlistButton } from './title-actions'
import { TitleCover, TitleHeading } from './title-card'
import { TitlePrice } from './title-price'
import { useFacetLabel } from './use-facet-label'
import type { TitleSummary as Title } from '@/api/titles'
import { cn } from '@/lib/utils'

/**
 * A title in the listing's list view, rendered once for both layouts:
 * desktop  [cover][info][price + heart + "Add to Cart"]
 * mobile   [cover][info                      ]
 *          [cover][price        heart + cart]
 */
export function TitleRow({ title }: { title: Title }) {
  const { t } = useTranslation('listing')
  const facetLabel = useFacetLabel()
  const tags = [
    title.type && facetLabel('type', title.type),
    title.ruleSystem && facetLabel('system', title.ruleSystem),
  ].filter(Boolean)

  return (
    <li
      className={cn(
        'grid grid-cols-[83px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-xl bg-card p-3 lg:grid-cols-[69px_minmax(0,1fr)_auto]',
        "[grid-template-areas:'cover_info'_'cover_buy'] lg:[grid-template-areas:'cover_info_buy']",
      )}
    >
      <TitleCover
        title={title}
        className="h-[114px] [grid-area:cover] lg:h-[94px]"
      />
      <div className="flex min-w-0 flex-col gap-1 self-end [grid-area:info] lg:self-center">
        <TitleHeading title={title} />
        {tags.length > 0 && (
          <ul aria-label={t('card.tags')} className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <li
                key={tag}
                className="inline-flex h-[22px] items-center rounded-md border border-border px-2 text-xs font-medium"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        {title.rating && (
          <RatingStars
            average={title.rating.average}
            count={title.rating.count}
            long
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 self-start [grid-area:buy] lg:flex-col lg:items-end lg:gap-1 lg:self-center">
        <TitlePrice title={title} className="text-lg leading-7" />
        <div className="flex gap-1">
          <WishlistButton title={title} className="size-8" />
          <CartButton
            title={title}
            labelClassName="max-lg:sr-only"
            className="size-8 lg:w-auto lg:px-2.5"
          />
        </div>
      </div>
    </li>
  )
}
