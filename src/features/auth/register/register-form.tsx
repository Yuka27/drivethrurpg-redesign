import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon, TriangleAlertIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldPath } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordField } from './password-field'
import {
  bigButtonClass,
  inputClass,
  subtitleClass,
  titleClass,
} from '../shared/styles'
import { CartContextNote } from '../shared/cart-context-note'
import { FormAlert } from '../shared/form-alert'
import { SocialButtons } from '../shared/social-buttons'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
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
import { useCountdown } from '@/lib/use-countdown'
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
  /** "Log in" / "Log in instead" switch the modal to the login view (with the typed email) */
  onSwitchToLogin: (email?: string) => void
  /** "reset your password" switches the modal to the forgot-password view */
  onForgotPassword: (email: string) => void
}

export function RegisterForm({
  onSuccess,
  onSocialSuccess,
  onSwitchToLogin,
  onForgotPassword,
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
      <form noValidate aria-labelledby={titleId} onSubmit={submit}>
        {/* the id sits on an inner span: DialogTitle keeps its own id, which names the dialog */}
        <DialogTitle className={titleClass}>
          <span id={titleId}>{t('register.title')}</span>
        </DialogTitle>
        <DialogDescription className={subtitleClass}>
          {t('register.subtitle')}
        </DialogDescription>
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
          <FormAlert>
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
          </FormAlert>
        )}
        {serverDown && (
          <FormAlert>
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
          </FormAlert>
        )}
        {retryUntil !== null && secondsLeft > 0 && (
          // static text: a ticking role="alert" would be re-read every second
          <FormAlert>
            {t('register.errors.rateLimited', { count: retryAfter })}
          </FormAlert>
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
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  {fieldState.error?.type === 'email_taken' ? (
                    <EmailTakenMessage
                      email={field.value}
                      onSwitchToLogin={onSwitchToLogin}
                      onForgotPassword={onForgotPassword}
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
          className={cn(bigButtonClass, 'disabled:opacity-85')}
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
          <button
            type="button"
            onClick={() => onSwitchToLogin()}
            className="font-bold text-primary hover:underline"
          >
            {t('register.login')}
          </button>
        </p>
      </form>
    </Form>
  )
}

/** email_taken: the message offers the two ways forward, keeping what was typed. */
function EmailTakenMessage({
  email,
  onSwitchToLogin,
  onForgotPassword,
}: {
  email: string
  onSwitchToLogin: (email?: string) => void
  onForgotPassword: (email: string) => void
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
            login: (
              <button
                type="button"
                onClick={() => onSwitchToLogin(email.trim())}
                className={linkClass}
              />
            ),
            reset: (
              <button
                type="button"
                onClick={() => onForgotPassword(email.trim())}
                className={linkClass}
              />
            ),
          }}
        />
      </span>
    </p>
  )
}
