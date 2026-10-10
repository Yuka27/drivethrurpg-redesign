import { describe, expect, it } from 'vite-plus/test'

import { passwordStrength } from './password-strength'

describe('passwordStrength', () => {
  it.each([
    ['', 0],
    ['short', 1],
    ['abcdefghi', 1], // 9: one under the API minimum
    ['abcdefghij', 2], // 10, one character class
    ['abcdefghijklm', 2], // 13
    ['abcdefghijklmn', 3], // 14
    ['Abcdefgh1jkl', 3], // 12 with 3 classes
    ['Abcdefghijk', 2], // 11 with 2 classes
    ['abcdefghijklmnopqr', 4], // 18
    ['Abcdefgh1jklmn', 4], // 14 with 3 classes
    ['correct horse battery', 4], // a few words beat symbols
  ] as const)('%j -> %i', (password, expected) => {
    expect(passwordStrength(password)).toBe(expected)
  })

  it('is never better than "too short" when it matches the email', () => {
    const email = ' Long.Address@Example.com '
    expect(passwordStrength('long.address@example.com', email)).toBe(1)
    expect(passwordStrength('long.address@example.org', email)).toBe(4)
  })
})
