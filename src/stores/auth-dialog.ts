import { create } from 'zustand'

type AuthDialogState = {
  open: boolean
  /** where focus goes when the modal closes (Radix only does this for a DialogTrigger) */
  returnFocusTo: HTMLElement | null
  /**
   * Open the login modal. Focus returns to the element that opened it, or to
   * `returnFocusTo` when that element disappears (e.g. a button inside the mobile menu).
   */
  openLogin: (returnFocusTo?: HTMLElement | null) => void
  setOpen: (open: boolean) => void
}

/** The login modal is opened from several places (header, mobile menu, later: any "log in to continue"). */
export const useAuthDialogStore = create<AuthDialogState>()((set) => ({
  open: false,
  returnFocusTo: null,
  openLogin: (returnFocusTo) =>
    set({
      open: true,
      returnFocusTo:
        returnFocusTo ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null),
    }),
  setOpen: (open) => set({ open }),
}))
