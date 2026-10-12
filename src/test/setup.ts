// Runs before every test file (vite.config.ts → test.setupFiles).
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vite-plus/test'

import { i18n, initI18n } from '@/i18n'
import { clearAuthToken } from '@/lib/auth-token'

// jsdom has no layout APIs; Radix (Checkbox measures itself), the router's
// scroll restoration and our hooks need them
window.scrollTo = () => {}
// Radix Select uses pointer capture and scrolls the selected option into view
Element.prototype.hasPointerCapture = () => false
Element.prototype.releasePointerCapture = () => {}
Element.prototype.scrollIntoView = () => {}
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// the product page's sticky bar; tests that need it stub their own
globalThis.IntersectionObserver = class {
  readonly root = null
  readonly rootMargin = ''
  readonly scrollMargin = ''
  readonly thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) satisfies MediaQueryList

beforeAll(async () => {
  if (!i18n.isInitialized) await initI18n('en')
})

afterEach(() => {
  cleanup()
  clearAuthToken()
  localStorage.clear()
  sessionStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
