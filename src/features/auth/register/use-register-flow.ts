import { useCallback, useState } from 'react'

import { useMergeGuestData } from '@/api/auth'
import { cartItemCount, useCart } from '@/api/cart'

type Registered = { email: string; cartItems: number }

/**
 * After a successful sign-up: remember what to show on the success screen and
 * bring the guest cart and wishlist into the new account (once; never blocking).
 * Shared by the register modal and the /register page.
 */
export function useRegisterFlow() {
  const { data: cart } = useCart()
  const merge = useMergeGuestData()
  const [registered, setRegistered] = useState<Registered | null>(null)
  const [mergedCartItems, setMergedCartItems] = useState<number | null>(null)

  const onRegistered = (email: string) => {
    // read before the cart refetches as the new account's cart
    const cartItems = cartItemCount(cart)
    setRegistered({ email, cartItems })
    if (cartItems > 0) {
      merge.mutate(undefined, {
        onSuccess: () => setMergedCartItems(cartItems),
      })
    }
  }

  const reset = useCallback(() => {
    setRegistered(null)
    setMergedCartItems(null)
  }, [])

  return { registered, mergedCartItems, onRegistered, reset }
}
