import type { QueryKey } from '@tanstack/react-query'

import type { Preferences } from '@/stores/preferences'

/** The language a key was built for (from its preferences segment), if any. */
export function keyLanguage(queryKey: QueryKey) {
  for (const part of queryKey) {
    if (part && typeof part === 'object' && 'language' in part) {
      return String(part.language)
    }
  }
  return undefined
}

/**
 * Every query key ends with the request preferences (currency, language, AI content):
 * they are sent as headers and change the response, so a change must refetch.
 * Build keys only through these helpers so the preferences cannot be forgotten.
 * The first segment of each key is stable, for invalidating a whole group: ['titles'].
 */
export const queryKeys = {
  me: {
    all: ['me'] as const,
    current: (prefs: Preferences) => ['me', prefs] as const,
  },
  meta: {
    locales: (prefs: Preferences) => ['meta', 'locales', prefs] as const,
  },
  account: {
    all: ['account'] as const,
    preferences: (prefs: Preferences) =>
      ['account', 'preferences', prefs] as const,
    connected: (prefs: Preferences) => ['account', 'connected', prefs] as const,
    addresses: (prefs: Preferences) => ['account', 'addresses', prefs] as const,
    paymentMethods: (prefs: Preferences) =>
      ['account', 'payment-methods', prefs] as const,
  },
  home: (prefs: Preferences) => ['home', prefs] as const,
  titles: {
    all: ['titles'] as const,
    list: (filters: Record<string, unknown>, prefs: Preferences) =>
      ['titles', 'list', filters, prefs] as const,
    detail: (id: string, prefs: Preferences) =>
      ['titles', 'detail', id, prefs] as const,
    /** name and publisher only (order lines); its own key so it never replaces a full detail */
    summary: (id: string, prefs: Preferences) =>
      ['titles', 'summary', id, prefs] as const,
    facets: (filters: Record<string, unknown>, prefs: Preferences) =>
      ['titles', 'facets', filters, prefs] as const,
    /** a title's reviews, discussions, similar titles, samples: apart from its detail */
    related: (
      id: string,
      kind: 'reviews' | 'discussions' | 'similar' | 'samples',
      prefs: Preferences,
    ) => ['titles', 'related', id, kind, prefs] as const,
  },
  search: {
    results: (params: Record<string, unknown>, prefs: Preferences) =>
      ['search', 'results', params, prefs] as const,
    suggest: (q: string, prefs: Preferences) =>
      ['search', 'suggest', q, prefs] as const,
  },
  publishers: {
    detail: (id: string, prefs: Preferences) =>
      ['publishers', 'detail', id, prefs] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (prefs: Preferences) => ['orders', 'list', prefs] as const,
    detail: (id: string, prefs: Preferences) =>
      ['orders', 'detail', id, prefs] as const,
  },
  following: {
    all: ['following'] as const,
    list: (prefs: Preferences) => ['following', 'list', prefs] as const,
    feed: (prefs: Preferences) => ['following', 'feed', prefs] as const,
  },
  cart: (prefs: Preferences) => ['cart', prefs] as const,
  wishlist: (prefs: Preferences) => ['wishlist', prefs] as const,
  library: (filters: Record<string, unknown>, prefs: Preferences) =>
    ['library', filters, prefs] as const,
}
