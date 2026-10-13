import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

import { EmptyState, ErrorState } from './empty-state'
import { renderWithProviders } from '@/test/render'

describe('EmptyState', () => {
  it('says what happened, as a heading of the chosen level', async () => {
    await renderWithProviders(
      <EmptyState as="h1" icon={null} title="Nothing here" text="Yet." />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Nothing here' }),
    ).toBeVisible()
    expect(screen.getByText('Yet.')).toBeVisible()
  })
})

describe('ErrorState', () => {
  it('reassures, and offers a retry and support', async () => {
    const retry = vi.fn()
    const { user } = await renderWithProviders(
      <ErrorState title="We couldn’t load your library" onRetry={retry} />,
    )

    expect(
      screen.getByRole('heading', { name: 'We couldn’t load your library' }),
    ).toBeVisible()
    expect(
      screen.getByText(
        'This is on our side or your connection. Your things are safe.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Contact support' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
