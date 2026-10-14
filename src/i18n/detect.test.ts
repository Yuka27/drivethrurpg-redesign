import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { detectInitialLanguage, getInitialLanguageSource } from './detect'
import { usePreferencesStore } from '@/stores/preferences'

const browserLanguages = (...tags: Array<string>) =>
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(tags)

beforeEach(() => {
  usePreferencesStore.setState({ language: 'en', languageChosen: false })
})
afterEach(() => window.history.replaceState(null, '', '/'))

describe('detectInitialLanguage', () => {
  it('keeps a language the user chose, whatever the browser says', () => {
    usePreferencesStore.setState({ language: 'pl', languageChosen: true })
    browserLanguages('de-DE')

    expect(detectInitialLanguage()).toBe('pl')
    expect(getInitialLanguageSource()).toBe('saved')
  })

  it('takes the first browser language the API offers, and stores it', () => {
    browserLanguages('fr-FR', 'pl-PL', 'en-US')

    expect(detectInitialLanguage()).toBe('pl')
    expect(getInitialLanguageSource()).toBe('browser')
    expect(usePreferencesStore.getState().language).toBe('pl')
  })

  it('falls back to English when no browser language is offered', () => {
    usePreferencesStore.setState({ language: 'pl' })
    browserLanguages('fr-FR', 'pt-BR')

    expect(detectInitialLanguage()).toBe('en')
    expect(getInitialLanguageSource()).toBe('fallback')
    expect(usePreferencesStore.getState().language).toBe('en')
  })

  it('opens the pseudo-locale from ?lng=en-XA without storing it', () => {
    window.history.replaceState(null, '', '/?lng=en-XA')
    browserLanguages('pl-PL')

    expect(detectInitialLanguage()).toBe('en-XA')
    expect(getInitialLanguageSource()).toBe('pseudo')
    // API requests keep the stored language
    expect(usePreferencesStore.getState().language).toBe('en')
  })
})
