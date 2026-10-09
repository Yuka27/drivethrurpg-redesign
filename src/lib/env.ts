import { z } from 'zod'

const EnvSchema = z.object({
  /** API host without /api/v1, e.g. https://drivethrurpg-mock-api.onrender.com */
  VITE_API_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  /** mock API only: "guest" sends X-Mock-User: guest to see the logged-out state */
  VITE_MOCK_USER: z.enum(['guest']).optional(),
})

const parsed = EnvSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables (check .env):\n${z.prettifyError(parsed.error)}`,
  )
}

export const env = parsed.data
