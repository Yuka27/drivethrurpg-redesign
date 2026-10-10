import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldPath } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordField } from './password-field'
import { registerCardClass, registerInputClass } from './styles'
import { CartContextNote } from '../shared/cart-context-note'
import { SocialButtons } from '../shared/social-buttons'
import { RegisterRequestSchema, useRegister, useSocialLogin } from '@/api/auth'
import type { RegisterRequest, SocialProvider } from '@/api/auth'
import { ApiError } from '@/api/client'
import type { Me } from '@/api/me'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRootError,
  useFormField,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TODO_URL } from '@/config/footer'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'

/** Errors set from API responses; everything else comes from the Zod schema. */
const SERVER_ERROR_TYPES = new Set(['email_taken', 'server'])
const FIELDS: Array<FieldPath<RegisterRequest>> = ['email', 'password']

const warnIcon = (
  <TriangleAlertIcon aria-hidden className="mt-px size-4 shrink-0" />
)

export type RegisterFormProps = {
  /** called with the new user and the address they typed (shown on the success screen) */
  onSuccess: (user: Me, details: { email: string }) => void
  /** social sign-in finished (the account may already have existed) */
  onSocialSuccess?: (user: Me) => void
  /** kept on the "Log in" links so the user still ends up where they started */
  redirect?: string
  /** the modal passes DialogTitle/DialogDescription; the /register page keeps h1/p */
  Title?: ElementType
  Description?: ElementType
  /** "card" on the /register page; "plain" inside the modal, which is the card */
  variant?: 'card' | 'plain'
  /** in the modal, "Log in" / "Log in instead" switch view instead of navigating to /login */
  onSwitchToLogin?: (email?: string) => void
  /** a link inside the form navigates away (the modal closes itself) */
  onNavigate?: () => void
}

export function RegisterForm({
  onSuccess,
  onSocialSuccess,
  redirect,
  Title = 'h1',
  Description = 'p',
  variant = 'card',
  onSwitchToLogin,
  onNavigate,
}: RegisterFormProps) {
  const { t } = useTranslation('auth')
  const apiError = useApiError()
  const titleId = useId()
  const register = useRegister()
  const social = useSocialLogin()
  const [serverDown, setServerDown] = useState(false)
  const [retryUntil, setRetryUntil] = useState<number | null>(null)
  const [retryAfter, setRetryAfter] = useState(0)
  const secondsLeft = useCountdown(retryUntil)

  // validate on submit, then re-validate each field as it changes;
  // the first invalid field gets focus (shouldFocusError)
  const form = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
    defaultValues: { email: '', password: '', newsletter: false },
  })
  const email = useWatch({ control: form.control, name: 'email' })
  const pending = register.isPending || social.isPending
  const { errors, submitCount } = form.formState

  const summaryFields = FIELDS.filter(
    (name) => errors[name] && !SERVER_ERROR_TYPES.has(errors[name].type),
  )

  function handleError(error: unknown) {
    if (error instanceof ApiError) {
      switch (error.code) {
        case 'email_taken':
          form.setError(
            'email',
            { type: 'email_taken', message: '' },
            { shouldFocus: true },
          )
          return
        case 'invalid_email':
        case 'weak_password':
          form.setError(
            error.code === 'invalid_email' ? 'email' : 'password',
            { type: 'server', message: apiError(error) },
            { shouldFocus: true },
          )
          return
        case 'rate_limited': {
          const seconds = error.retryAfter ?? 30
          setRetryAfter(seconds)
          setRetryUntil(Date.now() + seconds * 1000)
          return
        }
      }
      if (error.status < 500) {
        form.setError('root.server', { message: apiError(error) })
        return
      }
    }
    // 5xx, unavailable, network failure: keep everything typed, offer Try again
    setServerDown(true)
  }

  const submit = form.handleSubmit((values) => {
    if (pending || secondsLeft > 0) return // no double submit
    setServerDown(false)
    form.clearErrors('root')
    register.mutate(values, {
      onSuccess: ({ user }) => onSuccess(user, { email: values.email.trim() }),
      onError: handleError,
    })
  })

  const signUpWith = (provider: SocialProvider, name: string) => {
    setServerDown(false)
    social.mutate(provider, {
      onSuccess: ({ user }) => {
        toast.success(t('register.socialToast', { provider: name }))
        onSocialSuccess?.(user)
      },
      onError: handleError,
    })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        aria-labelledby={titleId}
        onSubmit={submit}
        className={cn(variant === 'card' && registerCardClass)}
      >
        {/* the id sits on an inner span: DialogTitle keeps its own id, which names the dialog */}
        <Title className="text-[1.4rem] leading-tight font-extrabold min-[1000px]:text-[1.6rem]">
          <span id={titleId}>{t('register.title')}</span>
        </Title>
        <Description className="mt-1.5 text-[0.9rem] text-muted-foreground">
          {t('register.subtitle')}
        </Description>
        <CartContextNote context="register" className="mt-4" />

        <div className="mt-5">
          <SocialButtons
            layout="row"
            disabled={pending}
            onSelect={signUpWith}
          />
        </div>
        <p className="my-[18px] mt-5 flex items-center gap-3 text-[0.78rem] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          {t('register.orEmail')}
        </p>

        {submitCount > 0 && summaryFields.length > 0 && (
          <Alert>
            <b className="mb-0.5 block">
              {t('register.summary.title', { count: summaryFields.length })}
            </b>
            <ul className="list-disc pl-[18px]">
              {summaryFields.map((name) => (
                <li key={name}>
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      form.setFocus(name)
                    }}
                    className="underline underline-offset-2"
                  >
                    {t(`register.summary.${name as 'email' | 'password'}`)}
                  </a>
                </li>
              ))}
            </ul>
          </Alert>
        )}
        {serverDown && (
          <Alert>
            <b className="mb-0.5 block">{t('register.errors.serverTitle')}</b>
            {t('register.errors.serverBody')}
            <br />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void submit()}
              className="mt-2 border border-border font-semibold"
            >
              {t('register.errors.tryAgain')}
            </Button>
          </Alert>
        )}
        {retryUntil !== null && secondsLeft > 0 && (
          // static text: a ticking role="alert" would be re-read every second
          <Alert>
            {t('register.errors.rateLimited', { count: retryAfter })}
          </Alert>
        )}
        <FormRootError className="mb-4" />

        <fieldset disabled={pending} className="contents">
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className="text-[0.82rem] font-semibold">
                    {t('register.email')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder={t('register.emailPlaceholder')}
                      className={registerInputClass}
                      {...field}
                    />
                  </FormControl>
                  {fieldState.error?.type === 'email_taken' ? (
                    <EmailTakenMessage
                      email={field.value}
                      redirect={redirect}
                      onSwitchToLogin={onSwitchToLogin}
                      onNavigate={onNavigate}
                    />
                  ) : (
                    <FormMessage icon={warnIcon} />
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <PasswordField field={field} email={email} />
              )}
            />

            <FormField
              control={form.control}
              name="newsletter"
              render={({ field }) => (
                <FormItem className="mt-1 mb-[18px] flex items-start gap-2.5">
                  <FormControl>
                    <Checkbox
                      ref={field.ref}
                      name={field.name}
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      onBlur={field.onBlur}
                      className="mt-px size-5 rounded-md border-border"
                    />
                  </FormControl>
                  <div className="grid gap-0.5">
                    <FormLabel className="text-[0.86rem] font-normal">
                      {t('register.newsletter')}
                    </FormLabel>
                    <FormDescription className="text-[0.76rem]">
                      {t('register.newsletterHint')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </fieldset>

        <Button
          type="submit"
          aria-disabled={pending || secondsLeft > 0 || undefined}
          disabled={pending || secondsLeft > 0}
          className="h-[50px] w-full rounded-[10px] text-[0.98rem] font-bold disabled:opacity-85"
        >
          {pending && (
            <Loader2Icon
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {pending
            ? t('register.submitting')
            : secondsLeft > 0
              ? t('register.submitWait', { count: secondsLeft })
              : t('register.submit')}
        </Button>

        <p className="mt-3.5 text-center text-[0.76rem] leading-normal text-muted-foreground">
          <Trans
            t={t}
            i18nKey="register.legal"
            components={{
              // TODO_URL: legal pages are not routed yet
              terms: (
                <a
                  href={TODO_URL}
                  className="text-foreground underline underline-offset-2"
                />
              ),
              privacy: (
                <a
                  href={TODO_URL}
                  className="text-foreground underline underline-offset-2"
                />
              ),
            }}
          />
        </p>
        <p className="mt-[18px] border-t border-border pt-[18px] text-center text-[0.88rem] text-muted-foreground">
          {t('register.haveAccount')}{' '}
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={() => onSwitchToLogin()}
              className="font-bold text-primary hover:underline"
            >
              {t('register.login')}
            </button>
          ) : (
            <Link
              to="/login"
              search={{ redirect }}
              className="font-bold text-primary hover:underline"
            >
              {t('register.login')}
            </Link>
          )}
        </p>
      </form>
    </Form>
  )
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-4 flex gap-2.5 rounded-[10px] border border-destructive/55 bg-destructive/[0.12] px-3.5 py-3 text-[0.86rem]"
    >
      <TriangleAlertIcon
        aria-hidden
        className="mt-px size-4 shrink-0 text-destructive"
      />
      <div>{children}</div>
    </div>
  )
}

/** email_taken: the message offers the two ways forward, keeping what was typed. */
function EmailTakenMessage({
  email,
  redirect,
  onSwitchToLogin,
  onNavigate,
}: {
  email: string
  redirect?: string
  onSwitchToLogin?: (email?: string) => void
  onNavigate?: () => void
}) {
  const { t } = useTranslation('auth')
  const { formMessageId } = useFormField()
  const linkClass = 'font-semibold text-foreground underline underline-offset-2'

  return (
    <p
      id={formMessageId}
      className={cn('flex items-start gap-1.5 text-xs text-destructive')}
    >
      {warnIcon}
      <span>
        <Trans
          t={t}
          i18nKey="register.errors.emailTaken"
          components={{
            login: onSwitchToLogin ? (
              <button
                type="button"
                onClick={() => onSwitchToLogin(email.trim())}
                className={linkClass}
              />
            ) : (
              <Link
                to="/login"
                search={{ redirect, email: email.trim() }}
                className={linkClass}
              />
            ),
            reset: (
              <Link
                to="/forgot-password"
                onClick={onNavigate}
                className={linkClass}
              />
            ),
          }}
        />
      </span>
    </p>
  )
}

/** Whole seconds left until `until` (epoch ms), ticking once a second. */
function useCountdown(until: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until === null) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [until])
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000))
}
