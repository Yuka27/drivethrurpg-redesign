import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import {
  ContentLanguageBadge,
  ContentLanguageTooltip,
} from './content-language-note'
import { TooltipProvider } from '@/components/ui/tooltip'
import { usePreferencesStore } from '@/stores/preferences'

afterEach(() => usePreferencesStore.setState({ language: 'en' }))

describe('ContentLanguageBadge', () => {
  it('says which language a title is shown in when it is not the user’s', () => {
    render(<ContentLanguageBadge textLanguage="pl" />)

    expect(screen.getByText('Shown in Polish')).toBeVisible()
  })

  it('says nothing when the title is in the user’s language', () => {
    usePreferencesStore.setState({ language: 'pl' })
    render(<ContentLanguageBadge textLanguage="pl" />)

    expect(screen.queryByText(/Shown in/)).toBeNull()
  })
})

describe('ContentLanguageTooltip', () => {
  it('explains the hint on focus', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <ContentLanguageTooltip textLanguage="pl">
          <button type="button">EN</button>
        </ContentLanguageTooltip>
      </TooltipProvider>,
    )

    await userEvent.setup().tab()

    expect(
      await screen.findByRole('tooltip', {
        name: 'This title is shown in Polish',
      }),
    ).toBeInTheDocument()
  })

  it('leaves the hint alone in the user’s language', () => {
    render(
      <ContentLanguageTooltip textLanguage="en">
        <button type="button">EN</button>
      </ContentLanguageTooltip>,
    )

    expect(screen.getByRole('button', { name: 'EN' })).toBeVisible()
  })
})
