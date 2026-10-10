import { ShoppingCartIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

import { cartItemCount, useCart } from '@/api/cart'
import { cn } from '@/lib/utils'

type CartContextNoteProps = {
  /** login: "will be kept when you log in"; register: "will be saved to your new account" */
  context: 'login' | 'register'
  className?: string
}

/**
 * "Your cart (N items) will be …" — reassures a guest that signing in or up keeps
 * their cart. Reads the count itself; renders nothing when the cart is empty.
 */
export function CartContextNote({ context, className }: CartContextNoteProps) {
  const { t } = useTranslation('auth')
  const { data: cart } = useCart()
  const count = cartItemCount(cart)
  if (count === 0) return null

  return (
    <p
      className={cn(
        'flex items-start gap-2.5 rounded-[10px] border border-primary/35 bg-primary/[0.09] px-3 py-2.5 text-[0.82rem]',
        className,
      )}
    >
      <ShoppingCartIcon
        aria-hidden
        className="mt-px size-4 shrink-0 text-primary"
      />
      <span>
        <Trans
          t={t}
          i18nKey={context === 'login' ? 'login.cartNote' : 'register.cartNote'}
          count={count}
          components={{ strong: <b className="font-bold" /> }}
        />
      </span>
    </p>
  )
}
