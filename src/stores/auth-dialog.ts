import { create } from 'zustand'

export type AuthView = 'login' | 'register' | 'forgot' | 'reset'

type OpenOptions = {
  /** where focus returns when the modal closes; defaults to the element that opened it */
  returnFocusTo?: HTMLElement | null
  /** prefilled email (e.g. register's "Log in instead") */
  email?: string
  /** the token from a password-reset email link (view "reset"); empty means an unusable link */
  token?: string
  /** where to go after signing in, e.g. the protected page that sent the user here */
  redirectTo?: string
}

type AuthDialogState = {
  open: boolean
  view: AuthView
  email: string
  resetToken: string
  redirectTo: string | null
  /** where focus goes when the modal closes (Radix only does this for a DialogTrigger) */
  returnFocusTo: HTMLElement | null
  /** open the modal on a view; focus returns to the opener when it closes */
  openAuth: (view: AuthView, options?: OpenOptions) => void
  /** switch view inside the open modal ("Register here", "Log in instead"…) */
  showView: (view: AuthView, options?: Pick<OpenOptions, 'email'>) => void
  setOpen: (open: boolean) => void
}

/** The login/register modal, opened from anywhere: header, mobile menu, the login-required pages. */
export const useAuthDialogStore = create<AuthDialogState>()((set) => ({
  open: false,
  view: 'login',
  email: '',
  resetToken: '',
  redirectTo: null,
  returnFocusTo: null,
  openAuth: (
    view,
    { returnFocusTo, email = '', token = '', redirectTo } = {},
  ) =>
    set({
      open: true,
      view,
      email,
      resetToken: token,
      redirectTo: redirectTo ?? null,
      returnFocusTo:
        returnFocusTo ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null),
    }),
  showView: (view, { email = '' } = {}) => set({ view, email }),
  setOpen: (open) => set({ open }),
}))
