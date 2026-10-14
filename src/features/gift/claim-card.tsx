import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  PASSWORD_MIN_LENGTH,
  useLogin,
  useLogout,
  useRegister,
  useSocialLogin,
} from '@/api/auth'
import type { SocialProvider } from '@/api/auth'
import { useClaimGift, useIsClaiming } from '@/api/gifts'
import type { Gift } from '@/api/gifts'
import type { Me } from '@/api/me'
import { UserAvatar } from '@/components/site/user-avatar'
import { FormAlert } from '@/features/auth/shared/form-alert'
import { SocialButtons } from '@/features/auth/shared/social-buttons'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TERMS_URL } from '@/config/links'
import { useApiError } from '@/i18n/use-api-error'
import { message, useApplyApiError } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { useAuthDialogStore } from '@/stores/auth-dialog'

const cardClass = 'rounded-2xl border bg-card p-[26px]'
const inputClass = 'h-[46px] rounded-[10px] text-[15px] md:text-[15px]'

/** Logged in: the account it goes to, and one button. */
export function ReadyCard({
  gift,
  token,
  me,
}: {
  gift: Gift
  token: string
  me: Me
}) {
  const { t } = useTranslation('gift')
  const apiError = useApiError()
  const claim = useClaimGift(token)
  // also a claim the logged-out card started before it gave way to this one
  const claiming = useIsClaiming(token)
  const logout = useLogout()

  return (
    <section aria-labelledby="claim-title" className={cardClass}>
      <h2
        id="claim-title"
        className="mb-1.5 font-heading text-xl font-extrabold"
      >
        {t('ready.title')}
      </h2>
      <p className="mb-[18px] text-sm leading-normal text-muted-foreground">
        {t('ready.text', { count: gift.titles.length })}
      </p>
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-secondary p-3">
        <UserAvatar user={me} className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{me.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{me.email}</p>
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="ml-auto shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
        >
          {t('ready.notYou')}
        </button>
      </div>
      <Button
        className="h-12 w-full rounded-[10px] text-[15px] font-bold"
        disabled={claiming}
        aria-busy={claiming || undefined}
        onClick={() =>
          claim.mutate(me.email, {
            onError: (error) => toast.error(apiError(error)),
          })
        }
      >
        {claiming && <Spinner />}
        {t(claiming ? 'ready.claiming' : 'ready.submit')}
      </Button>
      <p className="mt-3 text-center text-xs leading-normal text-muted-foreground">
        {t('ready.fine')}
      </p>
    </section>
  )
}

type Mode = 'create' | 'login'

const schemaFor = (mode: Mode) =>
  z.object({
    email: z.email({ error: message('validation.emailInvalid') }),
    password:
      mode === 'create'
        ? z.string().min(PASSWORD_MIN_LENGTH, {
            error: message('validation.passwordMinLength'),
          })
        : z.string().min(1, { error: message('validation.passwordRequired') }),
  })
type Credentials = { email: string; password: string }

/**
 * Logged out: claiming is one step in the same card. "Create account" (the
 * gift's email prefilled) or "Log in", then the claim; or Google, Facebook or
 * Roll20 (as in the auth modal), then the claim.
 */
export function ClaimCard({ gift, token }: { gift: Gift; token: string }) {
  const { t } = useTranslation('gift')
  const apiError = useApiError()
  const [mode, setMode] = useState<Mode>('create')
  const register = useRegister()
  const login = useLogin()
  const social = useSocialLogin()
  const claim = useClaimGift(token)
  const claiming = useIsClaiming(token)
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const resolver = useMemo(() => zodResolver(schemaFor(mode)), [mode])
  const form = useForm<Credentials>({
    resolver,
    defaultValues: { email: gift.to.email ?? '', password: '' },
  })
  const applyApiError = useApplyApiError(form)
  const create = mode === 'create'
  const busy =
    register.isPending || login.isPending || social.isPending || claiming
  // what the submit button is waiting for
  const working = register.isPending
    ? t('claim.creating')
    : login.isPending
      ? t('claim.loggingIn')
      : claiming && !social.isPending
        ? t('claim.claiming')
        : null

  // A failed sign-in stays on the form. Once signed in, this card gives way to
  // the logged-in one, so a failed claim is told in a toast instead.
  const submit = form.handleSubmit(async ({ email, password }) => {
    let session
    try {
      session = create
        ? await register.mutateAsync({ email, password, newsletter: false })
        : await login.mutateAsync({ email, password, remember: true })
    } catch (error) {
      applyApiError(error)
      return
    }
    claim.mutate(session.user.email, {
      onError: (error) => toast.error(apiError(error)),
    })
  })

  const withProvider = async (provider: SocialProvider) => {
    try {
      const session = await social.mutateAsync(provider)
      await claim.mutateAsync(session.user.email)
    } catch (error) {
      // the sign-in or the claim; either way the card may be gone by now
      toast.error(apiError(error))
    }
  }

  const switchTo = (next: Mode) => {
    setMode(next)
    form.clearErrors()
  }

  return (
    <section aria-labelledby="claim-title" className={cardClass}>
      <h2
        id="claim-title"
        className="mb-1.5 font-heading text-xl font-extrabold"
      >
        {t('claim.title')}
      </h2>
      <p className="mb-[18px] text-sm leading-normal text-muted-foreground">
        {t(create ? 'claim.createText' : 'claim.loginText')}
      </p>
      <div
        role="radiogroup"
        aria-label={t('claim.tabs')}
        className="mb-4 grid grid-cols-2 rounded-[10px] bg-secondary p-[3px]"
      >
        {(['create', 'login'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={mode === item}
            onClick={() => switchTo(item)}
            className={cn(
              'rounded-lg p-2.5 text-sm font-semibold text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              mode === item && 'bg-card text-foreground',
            )}
          >
            {t(item === 'create' ? 'claim.create' : 'claim.login')}
          </button>
        ))}
      </div>
      <Form {...form}>
        <form noValidate onSubmit={submit} className="flex flex-col gap-3.5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className="text-[13px] font-semibold">
                  {t('claim.email')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={inputClass}
                    {...field}
                  />
                </FormControl>
                {create && (
                  <p className="text-xs text-muted-foreground">
                    {t('claim.emailHint')}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                {/* as in the login modal: "Forgot password?" beside the label */}
                <div className="flex items-center gap-2">
                  <FormLabel className="flex-1 text-[13px] font-semibold">
                    {t(create ? 'claim.choosePassword' : 'claim.password')}
                  </FormLabel>
                  {!create && (
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={(event) =>
                        openAuth('forgot', {
                          email: form.getValues('email'),
                          returnFocusTo: event.currentTarget,
                        })
                      }
                      className="text-[13px] font-semibold text-primary-text hover:underline"
                    >
                      {t('claim.forgot')}
                    </button>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete={create ? 'new-password' : 'current-password'}
                    placeholder={
                      create ? t('claim.passwordPlaceholder') : undefined
                    }
                    className={inputClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root?.server && (
            <FormAlert className="mb-0">
              {form.formState.errors.root.server.message}
            </FormAlert>
          )}
          <Button
            type="submit"
            disabled={busy}
            aria-busy={working ? true : undefined}
            className="h-12 w-full rounded-[10px] text-[15px] font-bold"
          >
            {working && <Spinner />}
            {working ?? t(create ? 'claim.createSubmit' : 'claim.loginSubmit')}
          </Button>
        </form>
      </Form>
      <p className="my-4 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {t('claim.orContinueWith')}
      </p>
      <SocialButtons
        layout="row"
        disabled={busy}
        pending={social.isPending ? social.variables : undefined}
        onSelect={(provider) => void withProvider(provider)}
      />
      {create && (
        <p className="mt-3 text-center text-xs leading-normal text-muted-foreground">
          <Trans
            t={t}
            i18nKey="claim.terms"
            components={{
              terms: (
                <a
                  href={TERMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary-text hover:underline"
                />
              ),
            }}
          />
        </p>
      )}
    </section>
  )
}
