import { Link, useNavigate } from '@tanstack/react-router'
import { HeartIcon, LibraryBigIcon, ShoppingCartIcon } from 'lucide-react'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useMe } from '@/api/me'
import {
  useAddTitleToCart,
  useToggleWishlist,
  useUndoWishlistRemove,
} from '@/api/titles'
import type { TitleSummary } from '@/api/titles'
import { IconTooltip } from '@/components/site/icon-tooltip'
import { Button } from '@/components/ui/button'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'
import { useAuthDialogStore } from '@/stores/auth-dialog'

/** The heart: adds to or removes from the wishlist. Guests are asked to log in first. */
export function WishlistButton({
  title,
  className,
}: {
  /** a card's title, or anything else with these (the home preview) */
  title: Pick<TitleSummary, 'id' | 'title' | 'inWishlist'>
  className?: string
}) {
  const { t } = useTranslation('listing')
  const apiError = useApiError()
  const { data: me } = useMe()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const toggle = useToggleWishlist()
  const undo = useUndoWishlistRemove()
  const on = title.inWishlist

  return (
    <IconTooltip
      label={t(on ? 'card.wishlistRemove' : 'card.wishlistAdd')}
      side="top"
    >
      <Button
        variant="outline"
        size="icon"
        aria-pressed={on}
        aria-label={t('card.wishlist', { title: title.title })}
        onClick={(event) => {
          if (!me) {
            openAuth('login', { returnFocusTo: event.currentTarget })
            return
          }
          toggle.mutate(
            { titleId: title.id, on: !on },
            {
              onSuccess: (result) => {
                // taken off: offer it back
                const token = result?.undoToken
                toast.success(
                  t(on ? 'card.wishlistRemoved' : 'card.wishlistAdded', {
                    title: title.title,
                  }),
                  token
                    ? {
                        action: {
                          label: t('card.undo'),
                          onClick: () =>
                            undo.mutate(token, {
                              onError: (error) => toast.error(apiError(error)),
                            }),
                        },
                      }
                    : undefined,
                )
              },
              onError: (error) => toast.error(apiError(error)),
            },
          )
        }}
        className={cn(
          'rounded-lg border-border bg-background shadow-none dark:bg-background',
          className,
        )}
      >
        <HeartIcon
          aria-hidden
          className={cn(on && 'fill-primary text-primary')}
        />
      </Button>
    </IconTooltip>
  )
}

/**
 * Add to cart, or, for a title the user already owns, a link to the library.
 * `labelClassName`: show the words ("Add to Cart") too, styled by it, e.g.
 * hidden on phones. The accessible name always includes the title, so a list
 * of them stays tellable apart.
 */
export function CartButton({
  title,
  labelClassName,
  text,
  className,
}: {
  title: TitleSummary
  labelClassName?: string
  /** Replaces the "Add" label (and its icon), e.g. "Add to Cart - $2.47". */
  text?: string
  className?: string
}) {
  const { t } = useTranslation('listing')
  const apiError = useApiError()
  const add = useAddTitleToCart()
  const navigate = useNavigate()
  const label = labelClassName !== undefined

  // icon only: the words in a tooltip
  const tooltip = (button: ReactElement, words: string) =>
    label ? (
      button
    ) : (
      <IconTooltip label={words} side="top">
        {button}
      </IconTooltip>
    )

  if (title.owned)
    return tooltip(
      <Button
        asChild
        variant="outline"
        size={label ? 'sm' : 'icon'}
        className={cn(
          'rounded-lg border-success text-success shadow-none hover:text-success',
          className,
        )}
      >
        <Link
          to="/library"
          aria-label={t('card.owned', { title: title.title })}
        >
          <LibraryBigIcon aria-hidden />
          {label && (
            <span className={labelClassName}>{t('card.inLibrary')}</span>
          )}
        </Link>
      </Button>,
      t('card.inLibrary'),
    )

  return tooltip(
    <Button
      size={label ? 'sm' : 'icon'}
      disabled={add.isPending}
      aria-label={t('card.addToCart', { title: title.title })}
      onClick={() =>
        add.mutate(title.id, {
          onSuccess: () =>
            toast.success(t('card.added', { title: title.title }), {
              action: {
                label: t('card.viewCart'),
                onClick: () => void navigate({ to: '/cart' }),
              },
            }),
          onError: (error) => toast.error(apiError(error)),
        })
      }
      className={cn('rounded-lg', className)}
    >
      {text === undefined && <ShoppingCartIcon aria-hidden />}
      {label && (
        <span className={labelClassName}>
          {text ?? t('card.addToCartShort')}
        </span>
      )}
    </Button>,
    t('card.addToCartShort'),
  )
}
