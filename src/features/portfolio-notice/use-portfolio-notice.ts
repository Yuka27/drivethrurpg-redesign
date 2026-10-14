import { create } from 'zustand'

import {
  hiddenForever,
  rememberDismissal,
  shouldShowNotice,
} from './notice-storage'

type NoticeState = {
  open: boolean
  /** the "Don't show this again" checkbox */
  forever: boolean
  /** shown or dismissed during this page load: no automatic second time */
  handled: boolean
  /** where focus goes back to on close (the footer link, or nothing) */
  returnFocusTo: HTMLElement | null
  /** the first visit's check (the footer link uses `show` instead) */
  showIfFirstVisit: () => void
  /** "About this project": opens whatever was stored */
  show: (returnFocusTo?: HTMLElement | null) => void
  setForever: (forever: boolean) => void
  /** X, Esc, the overlay and "Enter the prototype" alike */
  dismiss: () => void
}

/** The portfolio notice: one open state for the app, the footer link included. */
export const usePortfolioNotice = create<NoticeState>()((set, get) => ({
  open: false,
  forever: false,
  handled: false,
  returnFocusTo: null,
  showIfFirstVisit: () => {
    if (get().handled || !shouldShowNotice()) return
    set({ open: true, handled: true, forever: false, returnFocusTo: null })
  },
  show: (returnFocusTo = null) =>
    set({ open: true, handled: true, forever: hiddenForever(), returnFocusTo }),
  setForever: (forever) => set({ forever }),
  dismiss: () => {
    rememberDismissal(get().forever)
    set({ open: false, handled: true })
  },
}))
