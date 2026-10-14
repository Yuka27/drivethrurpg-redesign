import { z } from 'zod'

/** a URL; unset: the default, empty: none */
const optionalUrl = z.union([z.url(), z.literal('')]).optional()

const EnvSchema = z.object({
  /** API host without /api/v1, e.g. https://drivethrurpg-mock-api.onrender.com */
  VITE_API_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
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

const parsed = EnvSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables (check .env):\n${z.prettifyError(parsed.error)}`,
  )
}

export const env = parsed.data
