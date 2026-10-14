import { LIBRARY_SEARCH_DEFAULTS } from '@/features/library/library-search'
import type { LibrarySearch } from '@/features/library/library-search'
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
    publisher: { id: 'pub_green_ronin', name: 'Green Ronin Publishing' },
    cover: { url: `/img/${id}.jpg`, alt: '' },
    type: 'adventure',
    ruleSystem: 'osr',
    genre: null,
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
