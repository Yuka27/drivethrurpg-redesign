import { LIBRARY_SEARCH_DEFAULTS } from './library-search'
import type { LibrarySearch } from './library-search'
import type { LibraryItem } from '@/api/library'

/** A library item as GET /library returns it, with test-friendly defaults. */
export function libraryItem(
  id: string,
  overrides: Partial<Omit<LibraryItem, 'title'>> & { name?: string } = {},
): LibraryItem {
  const { name = `Title ${id}`, ...rest } = overrides
  return {
    id,
    title: { id: `ttl_${id}`, name },
    publisher: { id: 'pub_red_door', name: 'Red Door Games' },
    cover: { url: `/img/${id}.jpg`, alt: '' },
    type: 'adventure',
    ruleSystem: 'osr',
    formats: ['pdf'],
    purchasedAt: '2026-04-01T09:00:00Z',
    lastUpdatedAt: null,
    giftFrom: null,
    hasUpdate: false,
    files: [
      {
        id: `fil_${id}`,
        name: `${id}.pdf`,
        format: 'pdf',
        sizeMb: 10,
        isNew: false,
      },
    ],
    ...rest,
  }
}

export const search = (patch: Partial<LibrarySearch> = {}): LibrarySearch => ({
  ...LIBRARY_SEARCH_DEFAULTS,
  ...patch,
})
