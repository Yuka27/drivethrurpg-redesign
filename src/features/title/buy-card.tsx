import { Link, useNavigate } from '@tanstack/react-router'
import { GiftIcon, LibraryBigIcon } from 'lucide-react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useAddEditionToCart } from '@/api/titles'
import type { Edition, TitleDetail } from '@/api/titles'
import { WishlistButton } from '@/components/title/title-actions'
import { useFacetLabel } from '@/components/title/use-facet-label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  useFormatMoney,
  useFormatNumber,
  useLanguageName,
  useRegionName,
} from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'

/**
 * Figma "Buy card": the editions to choose from (PDF, print, bundle), a few
 * facts, then "Add to Cart - $19.99", the heart and "Buy as a gift".
 */
export function BuyCard({ title }: { title: TitleDetail }) {
  const { t } = useTranslation('title')
  const apiError = useApiError()
  const navigate = useNavigate()
  const formatMoney = useFormatMoney()
  const formatNumber = useFormatNumber()
  const facetLabel = useFacetLabel()
  const languageName = useLanguageName()
  const regionName = useRegionName()
  const giftId = useId()
  const add = useAddEditionToCart()

  const buyable = title.editions.filter(
    (edition) => edition.stock !== 'out_of_stock',
  )
  const [sku, setSku] = useState(buyable[0]?.sku ?? title.editions[0]?.sku)
  const [gift, setGift] = useState(false)
  const edition = title.editions.find((item) => item.sku === sku)
  // a digital edition of a title the user owns is already in their library
  const owned =
    title.owned && edition !== undefined && edition.shipsFrom === null

  const subtitle = (item: Edition) =>
    item.stock === 'out_of_stock'
      ? t('buy.outOfStock')
      : item.shipsFrom
        ? t('buy.shipsFrom', { place: regionName(item.shipsFrom) })
        : t('buy.instant')

  const facts = [
    title.ruleSystem && [
      t('facts.system'),
      facetLabel('system', title.ruleSystem),
    ],
    edition && [t('facts.format'), edition.label],
    title.pageCount && [t('facts.pages'), formatNumber(title.pageCount)],
    title.language && [t('facts.language'), languageName(title.language)],
  ].filter((fact): fact is [string, string] => Boolean(fact))

  const addToCart = () => {
    if (!edition) return
    add.mutate(
      { sku: edition.sku, gift },
      {
        onSuccess: () =>
          toast.success(
            t(gift ? 'buy.addedGift' : 'buy.added', { title: title.title }),
            {
              action: {
                label: t('buy.viewCart'),
                onClick: () => void navigate({ to: '/cart' }),
              },
            },
          ),
        onError: (error) => toast.error(apiError(error)),
      },
    )
  }

  return (
    <section
      aria-label={t('buy.label')}
      className="flex flex-col gap-4 rounded-xl bg-card p-4"
    >
      {title.editions.length > 0 && (
        <RadioGroupPrimitive.Root
          aria-label={t('buy.editions')}
          value={sku}
          onValueChange={setSku}
          className="flex flex-col gap-1"
        >
          {title.editions.map((item) => (
            <RadioGroupPrimitive.Item
              key={item.sku}
              value={item.sku}
              disabled={item.stock === 'out_of_stock' || !title.available}
              className={cn(
                'flex items-center justify-between gap-4 rounded-xl border bg-background p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50',
                'border-muted data-[state=checked]:border-2 data-[state=checked]:border-primary data-[state=checked]:p-[11px]',
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {subtitle(item)}
                </span>
              </span>
              <span className="shrink-0 text-base font-bold">
                {formatMoney(item.price)}
              </span>
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
      )}

      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-muted px-4 py-2">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-base font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {!title.available ? (
            <Button disabled className="h-8 flex-1 rounded-lg">
              {t('buy.unavailable')}
            </Button>
          ) : owned ? (
            <Button
              asChild
              variant="outline"
              className="h-8 flex-1 rounded-lg border-success text-success hover:text-success"
            >
              <Link to="/library">
                <LibraryBigIcon aria-hidden />
                {t('buy.inLibrary')}
              </Link>
            </Button>
          ) : (
            <Button
              onClick={addToCart}
              disabled={!edition || add.isPending}
              className="h-8 flex-1 rounded-lg"
            >
              {edition
                ? t('buy.addToCart', { price: formatMoney(edition.price) })
                : t('buy.unavailable')}
            </Button>
          )}
          <WishlistButton title={title} className="size-8" />
        </div>
        {title.available && !owned && (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <GiftIcon aria-hidden className="size-4" />
            <label htmlFor={giftId}>{t('buy.gift')}</label>
            <Switch
              id={giftId}
              checked={gift}
              onCheckedChange={setGift}
              className="ml-1"
            />
          </div>
        )}
      </div>
    </section>
  )
}
