import { env } from '@/lib/env'

/** The case study's other pieces, linked from the portfolio notice. */
export type ProjectLinkId = 'figma' | 'github' | 'apiDocs' | 'coverage'

/** unset: the default; set but empty: no link (its card is left out) */
const pick = (value: string | undefined, fallback: string) => value ?? fallback

/**
 * Where each card of the portfolio notice goes, from VITE_FIGMA_URL,
 * VITE_GITHUB_URL, VITE_API_DOCS_URL and VITE_COVERAGE_URL. An empty value
 * means no card, never a dead link.
 */
export const projectLinks: Record<ProjectLinkId, string> = {
  // no public file yet: set VITE_FIGMA_URL to show the card
  figma: pick(
    env.VITE_FIGMA_URL,
    'https://www.figma.com/design/pckNOLhUrC8jyhUZDyIrVT/DriveThruRPG--UX-UI-Redesign?node-id=0-1&p=f&t=BJ7keTKOfF5q00QW-0',
  ),
  github: pick(
    env.VITE_GITHUB_URL,
    'https://github.com/Yuka27/drivethrurpg-redesign',
  ),
  // the mock API serves its OpenAPI docs at its origin
  apiDocs: pick(env.VITE_API_DOCS_URL, `${env.VITE_API_URL}/docs`),
  // no published report yet: set VITE_COVERAGE_URL to show the card
  coverage: pick(env.VITE_COVERAGE_URL, ''),
}
