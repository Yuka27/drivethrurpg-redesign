import { CheckIcon, EyeIcon, EyeOffIcon, TriangleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import type { ControllerRenderProps } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import { STRENGTH_LEVELS, passwordStrength } from './password-strength'
import type { PasswordStrength } from './password-strength'
import { PASSWORD_MIN_LENGTH } from '@/api/auth'
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { inputClass } from '../shared/styles'

const BAR_COLOR: Record<PasswordStrength, string> = {
  0: '',
  1: 'bg-destructive',
  2: 'bg-warning',
  3: 'bg-success',
  4: 'bg-success',
}
const TEXT_COLOR: Record<PasswordStrength, string> = {
  0: '',
  1: 'text-destructive',
  2: 'text-warning',
  3: 'text-success',
  4: 'text-success',
}

type PasswordFieldProps = {
  /** the `password` field of any form (register, reset password) */
  field: Omit<ControllerRenderProps, 'value'> & { value: string }
  /** compared with the password for the "different from your email" check; omit when unknown */
  email?: string
  /** defaults to "Password" */
  label?: string
}

/** Password with show/hide, a strength meter (advice only) and the requirement checklist. */
export function PasswordField({ field, email, label }: PasswordFieldProps) {
  const { t } = useTranslation('auth')
  const [shown, setShown] = useState(false)
  const value = field.value
  const strength = passwordStrength(value, email ?? '')
  const level = STRENGTH_LEVELS[strength]

  const requirements: Array<{ key: 'length' | 'notEmail'; met: boolean }> = [
    { key: 'length', met: value.length >= PASSWORD_MIN_LENGTH },
  ]
  if (email !== undefined) {
    requirements.push({
      key: 'notEmail',
      met: Boolean(value) && value.toLowerCase() !== email.trim().toLowerCase(),
    })
  }

  return (
    <FormItem className="gap-1.5">
      <FormLabel className="text-[0.82rem] font-semibold">
        {label ?? t('register.password')}
      </FormLabel>
      <div className="relative">
        <FormControl>
          <Input
            type={shown ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('register.passwordPlaceholder')}
            className={cn(inputClass, 'pr-12')}
            {...field}
          />
        </FormControl>
        <button
          type="button"
          onClick={() => setShown((isShown) => !isShown)}
          aria-label={t(
            shown ? 'register.hidePassword' : 'register.showPassword',
          )}
          className="absolute top-1/2 right-0.5 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {shown ? (
            <EyeOffIcon className="size-[19px]" />
          ) : (
            <EyeIcon className="size-[19px]" />
          )}
        </button>
      </div>
      <FormMessage
        icon={
          <TriangleAlertIcon aria-hidden className="mt-px size-4 shrink-0" />
        }
      />

      <div aria-hidden className="mt-1 grid grid-cols-4 gap-[5px]">
        {[1, 2, 3, 4].map((bar) => (
          <i
            key={bar}
            className={cn(
              'h-1 rounded-full bg-muted motion-safe:transition-colors',
              bar <= strength && BAR_COLOR[strength],
            )}
          />
        ))}
      </div>
      <div className="flex min-h-[18px] justify-between gap-2.5 text-[0.78rem] text-muted-foreground">
        {/* announced as it changes, so screen-reader users get the same feedback */}
        <span aria-live="polite" data-slot="password-strength">
          {strength > 0 && (
            <Trans
              t={t}
              i18nKey="register.strength.label"
              values={{
                level: t(
                  `register.strength.${level as Exclude<typeof level, ''>}`,
                ),
              }}
              components={{
                strong: (
                  <b className={cn('font-semibold', TEXT_COLOR[strength])} />
                ),
              }}
            />
          )}
        </span>
        {strength > 0 && strength < 3 && (
          <span className="hidden sm:inline">{t('register.strength.tip')}</span>
        )}
      </div>

      <FormDescription asChild>
        <ul className="grid gap-[5px] text-[0.8rem]">
          {requirements.map(({ key, met }) => (
            <li
              key={key}
              className={cn(
                'flex items-center gap-2',
                met && 'text-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full border border-border',
                  met && 'border-success bg-success text-success-foreground',
                )}
              >
                {met && <CheckIcon className="size-2.5" strokeWidth={4} />}
              </span>
              {t(`register.requirements.${key}`)}
              {/* the tick is visual only; say it in words too */}
              <span className="sr-only">
                {' '}
                (
                {t(
                  met
                    ? 'register.requirements.met'
                    : 'register.requirements.notMet',
                )}
                )
              </span>
            </li>
          ))}
        </ul>
      </FormDescription>
    </FormItem>
  )
}
