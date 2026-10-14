import { create } from 'zustand'

export type CheckoutResult = {
  /** the order number the confirmation page opens with */
  number: string
  /** where the receipt went */
  email: string
  /** titles that ship (the order's lines do not always say) */
  shippedTitleIds: Array<string>
}

/**
 * What the checkout knew when the order was placed, for the confirmation page
 * right after it. In memory only: after a reload the page does without it.
 */
export const useCheckoutResult = create<{
  result: CheckoutResult | null
  set: (result: CheckoutResult) => void
}>()((set) => ({
  result: null,
  set: (result) => set({ result }),
}))
