import { defineConfig } from 'vitest/config'

// Kept apart from vite.config.ts so tests don't run the router generator or devtools.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
