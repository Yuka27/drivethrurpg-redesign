import { z } from 'zod'

/** a URL; unset: the default, empty: none */
const optionalUrl = z.union([z.url(), z.literal('')]).optional()

const EnvSchema = z.object({
  /**
   * The API's origin, e.g. https://drivethrurpg-mock-api.onrender.com: the
   * client adds /api/v1 itself, and images and files are served from it too.
   */
  VITE_API_URL: z
    .url({
      protocol: /^https?$/,
      error: 'must be the API origin, e.g. https://api.example.com',
    })
    .transform((url) => url.replace(/\/+$/, ''))
    .refine((url) => {
      const { pathname, search, hash } = new URL(url)
      return pathname === '/' && !search && !hash
    }, 'must be the API origin only: no path (leave /api/v1 out), query or hash'),
  /** mock API only: "guest" sends X-Mock-User: guest to see the logged-out state */
  VITE_MOCK_USER: z.enum(['guest']).optional(),
  // the portfolio notice's links (src/config/project-links.ts): unset uses the
  // default there, empty hides the link
  VITE_FIGMA_URL: optionalUrl,
  VITE_GITHUB_URL: optionalUrl,
  VITE_API_DOCS_URL: optionalUrl,
  VITE_COVERAGE_URL: optionalUrl,
  /** "false": no portfolio notice on the first visit (screenshots, e2e) */
  VITE_SHOW_PORTFOLIO_NOTICE: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value !== 'false'),
})
export type Env = z.infer<typeof EnvSchema>

/** Validates the variables a build was made with (Vite bakes them in). */
export const parseEnv = (source: Record<string, unknown>) =>
  EnvSchema.safeParse(source)

const parsed = parseEnv(import.meta.env)

/**
 * What is wrong with the build's variables, or null. `main.tsx` checks it
 * first and shows a configuration error screen instead of loading the app,
 * so a bad deploy never ends in a blank page.
 */
export const envProblem = parsed.success ? null : z.prettifyError(parsed.error)

/**
 * The validated variables. Read them only once `envProblem` is null:
 * `main.tsx` does not load the app otherwise, so nothing else reads them then.
 */
export const env = (parsed.success ? parsed.data : {}) as Env
