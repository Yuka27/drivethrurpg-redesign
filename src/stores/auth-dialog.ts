import { create } from 'zustand'

export type AuthView = 'login' | 'register'

type OpenOptions = {
  /** where focus returns when the modal closes; defaults to the element that opened it */
  returnFocusTo?: HTMLElement | null
  /** prefilled email (e.g. register's "Log in instead") */
  email?: string
}

type AuthDialogState = {
  open: boolean
  view: AuthView
  email: string
  /** where focus goes when the modal closes (Radix only does this for a DialogTrigger) */
  returnFocusTo: HTMLElement | null
  /** open the modal on a view; focus returns to the opener when it closes */
  openAuth: (view: AuthView, options?: OpenOptions) => void
  /** switch view inside the open modal ("Register here", "Log in instead"…) */
  showView: (view: AuthView, options?: Pick<OpenOptions, 'email'>) => void
  setOpen: (open: boolean) => void
}

/** The login/register modal is opened from several places (header, mobile menu, later: any "log in to continue"). */
export const useAuthDialogStore = create<AuthDialogState>()((set) => ({
  open: false,
  view: 'login',
  email: '',
  returnFocusTo: null,
  openAuth: (view, { returnFocusTo, email = '' } = {}) =>
    set({
      open: true,
      view,
      email,
      returnFocusTo:
        returnFocusTo ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null),
    }),
  showView: (view, { email = '' } = {}) => set({ view, email }),
  setOpen: (open) => set({ open }),
}))
