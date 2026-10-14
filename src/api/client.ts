import { z } from 'zod'
import { useShallow } from 'zustand/react/shallow'

import { apiLanguage } from '@/i18n/languages'
import { clearAuthToken, getAuthToken } from '@/lib/auth-token'
import { env } from '@/lib/env'
import { usePreferencesStore } from '@/stores/preferences'
import type { Preferences } from '@/stores/preferences'

const API_BASE = `${env.VITE_API_URL}/api/v1`

/** Every API error body: { error: { code, message, field?, retryAfter? } } */
const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().optional(),
    /** seconds to wait (rate_limited, unavailable) */
    retryAfter: z.number().optional(),
  }),
})

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
    readonly retryAfter?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiRequest<T extends z.ZodType> = {
  /** validates the response body; a mismatch throws instead of passing bad data on */
  schema: T
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  /**
   * Defaults to the store values at request time (mutations). Queries pass the values
   * from their query key, so the headers always match the cache entry they fill.
   */
  prefs?: Preferences
  signal?: AbortSignal
}

export async function apiFetch<T extends z.ZodType>(
  path: string,
  { schema, method = 'GET', body, params, prefs, signal }: ApiRequest<T>,
): Promise<z.output<T>> {
  const { currency, language, aiContent } =
    prefs ?? usePreferencesStore.getState()
  const url = new URL(API_BASE + path)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const token = getAuthToken()
  const response = await fetch(url, {
    method,
    signal,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      'X-Currency': currency,
      'Accept-Language': apiLanguage(language),
      'X-Ai-Content': aiContent ? 'show' : 'hide',
      ...(env.VITE_MOCK_USER && { 'X-Mock-User': env.VITE_MOCK_USER }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data: unknown =
    response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    // the token we sent is no longer accepted: the session is over
    if (response.status === 401 && token) clearAuthToken()
    const parsed = ApiErrorBodySchema.safeParse(data)
    throw parsed.success
      ? new ApiError(
          response.status,
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.field,
          parsed.data.error.retryAfter,
        )
      : new ApiError(response.status, 'unknown', response.statusText)
  }

  return schema.parse(data)
}

/** The preference values that change API responses; put them in every query key. */
export function useRequestPrefs(): Preferences {
  return usePreferencesStore(
    useShallow(({ currency, language, aiContent }) => ({
      currency,
      language,
      aiContent,
    })),
  )
}

/**
 * An image or file address from the API, resolved against `origin`. The API
 * sends covers, logos, hero and promo art, page spreads, avatars and PDFs as
 * root-relative paths ("/img/covers/x.jpg"); in production the app and the
 * API are on different origins, so the browser must not resolve them against
 * the app's own. Absolute URLs (https:, data:, blob:, //host) pass through;
 * nothing (null, undefined, "") stays nothing.
 */
export function resolveAssetUrl(
  path: string | null | undefined,
  origin: string,
): string | undefined {
  if (!path) return undefined
  // a scheme ("https:", "data:", "blob:") or a protocol-relative "//host"
  if (/^([a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path
  return `${origin.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

/** `resolveAssetUrl` against the API origin (VITE_API_URL). */
export function assetUrl(path: string): string
export function assetUrl(path: string | null | undefined): string | undefined
export function assetUrl(path: string | null | undefined) {
  return resolveAssetUrl(path, env.VITE_API_URL)
}

/** Money from the API: integer minor units (cents) + ISO currency. Format with useFormatMoney. */
export const MoneySchema = z.object({
  amount: z.number().int(),
  currency: z.string(),
})
export type Money = z.infer<typeof MoneySchema>
