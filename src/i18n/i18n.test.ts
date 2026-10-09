import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { initI18n, i18n } from './index'
import { apiFetch } from '@/api/client'
import { queryKeys } from '@/api/query-keys'
import { queryClient } from '@/lib/query-client'
import { usePreferencesStore } from '@/stores/preferences'

beforeAll(async () => {
  await initI18n('en')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  queryClient.clear()
})

describe('Polish plurals', () => {
  it.each([
    [1, '1 produkt'],
    [2, '2 produkty'],
    [5, '5 produktów'],
    [22, '22 produkty'],
  ])(
    'cart:summary.itemCount with count %i -> "%s"',
    async (count, expected) => {
      await i18n.loadLanguages('pl')
      expect(
        i18n.t('summary.itemCount', { ns: 'cart', lng: 'pl', count }),
      ).toBe(expected)
    },
  )

  it('English uses one/other', () => {
    expect(i18n.t('summary.itemCount', { ns: 'cart', count: 1 })).toBe('1 item')
    expect(i18n.t('summary.itemCount', { ns: 'cart', count: 22 })).toBe(
      '22 items',
    )
  })
})

describe('setLanguage', () => {
  it('switches i18n, <html lang>, the store, the account and refetches', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({}), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    // a logged-in user is cached, so the choice is also saved to the account
    const { currency, language, aiContent } = usePreferencesStore.getState()
    queryClient.setQueryData(
      queryKeys.me.current({ currency, language, aiContent }),
      { id: 'usr_test' },
    )

    await usePreferencesStore.getState().setLanguage('pl')

    expect(i18n.language).toBe('pl')
    expect(document.documentElement.lang).toBe('pl')
    expect(usePreferencesStore.getState()).toMatchObject({
      language: 'pl',
      languageChosen: true,
    })
    expect(
      JSON.parse(localStorage.getItem('dtrpg-preferences') ?? '{}').state,
    ).toMatchObject({ language: 'pl', languageChosen: true })
    expect(invalidate).toHaveBeenCalledTimes(1)
    // content cached for the new language (or keyed without one) is refetched;
    // entries for the old language are left alone
    const { predicate } = invalidate.mock.calls[0][0] ?? {}
    const query = (queryKey: unknown[]) =>
      ({ queryKey }) as unknown as Parameters<NonNullable<typeof predicate>>[0]
    expect(predicate?.(query(['titles', { language: 'pl' }]))).toBe(true)
    expect(predicate?.(query(['no-prefs-key']))).toBe(true)
    expect(predicate?.(query(['titles', { language: 'en' }]))).toBe(false)

    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    )
    expect(String(patch?.[0])).toMatch(/\/account\/preferences$/)
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
      content: { language: 'pl' },
    })

    // the next request carries the new language
    fetchMock.mockClear()
    await apiFetch('/meta/locales', { schema: z.unknown() })
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<
      string,
      string
    >
    expect(headers['Accept-Language']).toBe('pl')
  })

  it('does not PATCH the account for guests', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response('{}', { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await usePreferencesStore.getState().setLanguage('en')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.documentElement.lang).toBe('en')
  })
})
