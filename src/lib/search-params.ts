import { z } from 'zod'
import { create } from 'zustand'

/**
 * TanStack Router JSON-parses search values, so ?q=1984 arrives as the number 1984
 * and ?q=true as a boolean. Turn those back into the text the user typed before
 * validating it as a string.
 */
export const searchText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : value,
    schema,
  )

/**
 * A multi-select filter in the URL: ?format=pdf,vtt (readable, unlike a JSON
 * array). '' when nothing is picked; read and write it with splitList/joinList.
 */
export const listParam = searchText(
  z.string().regex(/^[\w-]+(,[\w-]+)*$/),
).catch('')

export const splitList = (value: string) => (value ? value.split(',') : [])
export const joinList = (values: Array<string>) => values.join(',')

/**
 * The list view the user last looked at (filters, sort, page), so a link back
 * to it ("← Orders", "My Library") returns to the same view rather than a fresh
 * one. In memory only: the URL is what survives a reload.
 */
export const createSearchMemory = <T>(defaults: T) =>
  create<{ search: T; remember: (search: T) => void }>()((set) => ({
    search: defaults,
    remember: (search) => set({ search }),
  }))

/**
 * ?language=pl or ?language=pl,de — content-language filter for /titles and /search,
 * passed as-is to the API's `language` query param. Codes come from GET /meta/locales.
 */
export const languageFilter = searchText(
  z
    .string()
    .regex(/^[a-z]{2}(,[a-z]{2})*$/)
    .optional(),
).catch(undefined)
