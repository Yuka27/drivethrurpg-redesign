import { z } from 'zod'

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
 * ?language=pl or ?language=pl,de — content-language filter for /titles and /search,
 * passed as-is to the API's `language` query param. Codes come from GET /meta/locales.
 */
export const languageFilter = searchText(
  z
    .string()
    .regex(/^[a-z]{2}(,[a-z]{2})*$/)
    .optional(),
).catch(undefined)

/**
 * ?redirect= after login/register: same-site paths only, so a crafted link cannot
 * send the user to another site (open redirect). Rejects https://…, //host and
 * /\host (browsers treat a backslash like a slash). Anything else is dropped.
 */
export const safeRedirect = searchText(
  z
    .string()
    .startsWith('/')
    .refine((path) => !path.startsWith('//') && !path.startsWith('/\\'))
    .optional(),
).catch(undefined)

/** ?email= to prefill a form (e.g. "Log in instead" after email_taken). */
export const prefillEmail = searchText(z.email().max(254).optional()).catch(
  undefined,
)
