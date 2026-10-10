import { PASSWORD_MIN_LENGTH } from '@/api/auth'

/** 0 empty · 1 too short · 2 okay · 3 good · 4 strong. Advice only: it never blocks submit. */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4

const characterClasses = (password: string) =>
  [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password))
    .length

/**
 * Length matters most (a few random words beat "P@ssw0rd"):
 * - under 10 characters: too short (the API rejects it)
 * - 10+: okay
 * - 14+, or 12+ with 3 character classes: good
 * - 18+, or 14+ with 3 character classes: strong
 * The same as the email address is never better than "too short".
 */
export function passwordStrength(
  password: string,
  email = '',
): PasswordStrength {
  if (!password) return 0
  if (password.length < PASSWORD_MIN_LENGTH) return 1
  if (email && password.toLowerCase() === email.trim().toLowerCase()) return 1

  const classes = characterClasses(password)
  if (password.length >= 18 || (password.length >= 14 && classes >= 3)) return 4
  if (password.length >= 14 || (password.length >= 12 && classes >= 3)) return 3
  return 2
}

export const STRENGTH_LEVELS = [
  '',
  'tooShort',
  'okay',
  'good',
  'strong',
] as const
