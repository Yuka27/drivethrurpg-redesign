import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

import { showConfigError } from './config-error'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('takes the API origin, without its trailing slash', () => {
    const parsed = parseEnv({
      VITE_API_URL: 'https://drivethrurpg-mock-api.onrender.com/',
    })
    expect(parsed.success && parsed.data.VITE_API_URL).toBe(
      'https://drivethrurpg-mock-api.onrender.com',
    )
  })

  it('takes a local API', () => {
    expect(parseEnv({ VITE_API_URL: 'http://localhost:3000' }).success).toBe(
      true,
    )
  })

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a URL', 'drivethrurpg-mock-api.onrender.com'],
    ['not http(s)', 'ftp://api.example.com'],
    ['with /api/v1', 'https://api.example.com/api/v1'],
    ['with a path', 'https://api.example.com/mock'],
  ])('rejects an API URL that is %s', (_, value) => {
    const parsed = parseEnv({ VITE_API_URL: value })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.path).toEqual(['VITE_API_URL'])
  })
})

describe('showConfigError', () => {
  it('shows what is wrong instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    document.body.innerHTML = '<div id="app"></div>'

    showConfigError('✖ VITE_API_URL: <b>missing</b>')

    expect(screen.getByRole('alert')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'This build is not configured' }),
    ).toBeVisible()
    // the details as text, never as markup
    expect(screen.getByText('✖ VITE_API_URL: <b>missing</b>')).toBeVisible()
    expect(document.querySelector('#app b')).toBeNull()
  })
})
