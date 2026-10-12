import { useTranslation } from 'react-i18next'

import { useCartRecommendations } from '@/api/cart'
import { ShelfCard } from '@/components/title/shelf-card'
import { CartButton } from '@/components/title/title-actions'

/**
 * Figma "Customers also bought": GET /cart/recommendations as 200px cards
 * sliding sideways, each with "Add" (the card's first edition, as on the
 * listing; an owned title links to the library instead).
 */
export function CartRecommendations() {
  const { t } = useTranslation('cart')
  const titles = useCartRecommendations().data
  if (!titles?.length) return null

  return (
    <section aria-labelledby="also-bought" className="flex flex-col gap-4">
      <h2
        id="also-bought"
        className="font-sans text-lg leading-7 font-semibold"
      >
        {t('alsoBought')}
      </h2>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {titles.map((title) => (
          <li key={title.id} className="w-[200px] shrink-0 snap-start">
            <ShelfCard
              title={title}
              action={
                <CartButton
                  title={title}
                  labelClassName=""
                  text={t('add')}
                  className="h-6 rounded-sm border border-border bg-background px-2 text-xs font-medium text-foreground shadow-none hover:bg-accent [&_svg]:size-3.5"
                />
              }
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
