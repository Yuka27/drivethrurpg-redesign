import { Link, useNavigate } from '@tanstack/react-router'
import { HeartIcon, LibraryBigIcon, ShoppingCartIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useMe } from '@/api/me'
import { useAddTitleToCart, useToggleWishlist } from '@/api/titles'
import type { TitleCard } from '@/api/titles'
import { Button } from '@/components/ui/button'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'
import { useAuthDialogStore } from '@/stores/auth-dialog'

/** The heart: adds to or removes from the wishlist. Guests are asked to log in first. */
export function WishlistButton({
  title,
  className,
}: {
  title: TitleCard
  className?: string
}) {
  const { t } = useTranslation('listing')
  const apiError = useApiError()
  const { data: me } = useMe()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const toggle = useToggleWishlist()
  const on = title.inWishlist

  return (
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
            onSuccess: () =>
              toast.success(
                t(on ? 'card.wishlistRemoved' : 'card.wishlistAdded', {
                  title: title.title,
                }),
              ),
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
  className,
}: {
  title: TitleCard
  labelClassName?: string
  className?: string
}) {
  const { t } = useTranslation('listing')
  const apiError = useApiError()
  const add = useAddTitleToCart()
  const navigate = useNavigate()
  const label = labelClassName !== undefined

  if (title.owned)
    return (
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
      </Button>
    )

  return (
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
      <ShoppingCartIcon aria-hidden />
      {label && (
        <span className={labelClassName}>{t('card.addToCartShort')}</span>
      )}
    </Button>
  )
}
