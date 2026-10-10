import { zodResolver } from '@hookform/resolvers/zod'
import {
  KeyRoundIcon,
  Loader2Icon,
  MailIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ElementType } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { registerInputClass } from '../register/styles'
import { BackToLogin } from '../shared/back-to-login'
import { FormAlert } from '../shared/form-alert'
import { StatusIcon } from '../shared/status-icon'
import { TipsBox } from '../shared/tips-box'
import { ForgotPasswordRequestSchema, useForgotPassword } from '@/api/auth'
import type { ForgotPasswordRequest } from '@/api/auth'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRootError,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useApiError } from '@/i18n/use-api-error'
import { useCountdown } from '@/lib/use-countdown'
import { cn } from '@/lib/utils'

/** The user may ask for another email this long after the last one. */
const RESEND_AFTER_SECONDS = 30

const titleClass =
  'text-[1.4rem] leading-tight font-extrabold outline-none min-[1000px]:text-[1.6rem]'
const subtitleClass = 'mt-1.5 text-[0.9rem] text-muted-foreground'
const bigButtonClass = 'h-[50px] w-full rounded-[10px] text-[0.98rem] font-bold'

type ForgotPasswordProps = {
  /** prefilled from the login or register form */
  defaultEmail?: string
  /** the modal passes DialogTitle/DialogDescription */
  Title?: ElementType
  Description?: ElementType
  /** back to the login view, with the email typed so far */
  onBackToLogin: (email: string) => void
}

/** "Forgot your password?": ask for a reset link, then "Check your email". */
export function ForgotPassword({
  defaultEmail = '',
  Title = 'h1',
  Description = 'p',
  onBackToLogin,
}: ForgotPasswordProps) {
  const { t } = useTranslation('auth')
  const apiError = useApiError()
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const forgot = useForgotPassword()
  const [sentTo, setSentTo] = useState<string | null>(null)
  // rate limit from the API (request form) and the pause before "Resend" (sent screen)
  const [retryUntil, setRetryUntil] = useState<number | null>(null)
  const [retryAfter, setRetryAfter] = useState(0)
  const secondsLeft = useCountdown(retryUntil)
  const [resendUntil, setResendUntil] = useState<number | null>(null)
  const resendSecondsLeft = useCountdown(resendUntil)

  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(ForgotPasswordRequestSchema),
    defaultValues: { email: defaultEmail },
  })

  // the screen changed under the user: move focus to the new title (or back to
  // the email field), so keyboard and screen-reader users know where they are
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (sentTo === null) form.setFocus('email')
    else titleRef.current?.focus()
  }, [sentTo, form])

  const secondsFrom = (error: ApiError) =>
    error.retryAfter ?? RESEND_AFTER_SECONDS
  const resendLater = (seconds = RESEND_AFTER_SECONDS) =>
    setResendUntil(Date.now() + seconds * 1000)

  const submit = form.handleSubmit(({ email }) => {
    if (forgot.isPending || secondsLeft > 0) return
    form.clearErrors('root')
    forgot.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          setSentTo(email.trim())
          // the email just went out: "Resend" waits a little
          resendLater()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'rate_limited') {
            const seconds = secondsFrom(error)
            setRetryAfter(seconds)
            setRetryUntil(Date.now() + seconds * 1000)
          } else if (error instanceof ApiError && error.field === 'email') {
            form.setError(
              'email',
              { type: 'server', message: apiError(error) },
              { shouldFocus: true },
            )
          } else {
            form.setError('root.server', { message: apiError(error) })
          }
        },
      },
    )
  })

  const resend = () => {
    if (sentTo === null) return
    forgot.mutate(
      { email: sentTo },
      {
        onSuccess: () => {
          toast.success(t('forgot.sent.resent'))
          resendLater()
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'rate_limited') {
            resendLater(secondsFrom(error))
          } else {
            toast.error(apiError(error))
          }
        },
      },
    )
  }

  const backToLogin = () =>
    onBackToLogin(sentTo ?? form.getValues('email').trim())

  if (sentTo !== null) {
    return (
      <section aria-labelledby={titleId}>
        <StatusIcon icon={MailIcon} tone="success" />
        {/* the id sits on an inner span: DialogTitle keeps its own id, which names the dialog */}
        <Title ref={titleRef} tabIndex={-1} className={titleClass}>
          <span id={titleId}>{t('forgot.sent.title')}</span>
        </Title>
        <Description className={subtitleClass}>
          <Trans
            t={t}
            i18nKey="forgot.sent.subtitle"
            values={{ email: sentTo }}
            components={{
              strong: (
                <b className="text-foreground [overflow-wrap:anywhere]" />
              ),
            }}
          />
        </Description>

        <TipsBox title={t('forgot.sent.tipsTitle')}>
          <li>{t('forgot.sent.tipSpam')}</li>
          <li>{t('forgot.sent.tipAddress')}</li>
          <li>{t('forgot.sent.tipSocial')}</li>
        </TipsBox>

        <div className="mt-5 grid gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={forgot.isPending || resendSecondsLeft > 0}
            onClick={resend}
            className={cn(bigButtonClass, 'border border-border')}
          >
            {resendSecondsLeft > 0
              ? t('forgot.sent.resendIn', { seconds: resendSecondsLeft })
              : t('forgot.sent.resend')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSentTo(null)}
            className={cn(
              bigButtonClass,
              'font-semibold text-muted-foreground hover:text-foreground',
            )}
          >
            {t('forgot.sent.differentEmail')}
          </Button>
        </div>

        <BackToLogin onBackToLogin={backToLogin} />
      </section>
    )
  }

  return (
    <Form {...form}>
      <form noValidate aria-labelledby={titleId} onSubmit={submit}>
        <StatusIcon icon={KeyRoundIcon} />
        <Title ref={titleRef} tabIndex={-1} className={titleClass}>
          <span id={titleId}>{t('forgot.title')}</span>
        </Title>
        <Description className={subtitleClass}>
          {t('forgot.subtitle')}
        </Description>

        {retryUntil !== null && secondsLeft > 0 && (
          // static text: a ticking role="alert" would be re-read every second
          <FormAlert className="mt-[18px] mb-0">
            <b className="mb-0.5 block">{t('forgot.rateLimitedTitle')}</b>
            {t('forgot.rateLimited', { count: retryAfter })}
          </FormAlert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="mt-5 gap-1.5">
              <FormLabel className="text-[0.82rem] font-semibold">
                {t('forgot.email')}
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={t('forgot.emailPlaceholder')}
                  className={registerInputClass}
                  {...field}
                  disabled={forgot.isPending}
                />
              </FormControl>
              <FormMessage
                icon={
                  <TriangleAlertIcon
                    aria-hidden
                    className="mt-px size-4 shrink-0"
                  />
                }
              />
            </FormItem>
          )}
        />
        <FormRootError className="mt-4" />

        <Button
          type="submit"
          disabled={forgot.isPending || secondsLeft > 0}
          className={cn(bigButtonClass, 'mt-4 disabled:opacity-85')}
        >
          {forgot.isPending && (
            <Loader2Icon
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {forgot.isPending
            ? t('forgot.submitting')
            : secondsLeft > 0
              ? t('forgot.submitWait', { count: secondsLeft })
              : t('forgot.submit')}
        </Button>

        <p className="mt-3.5 text-[0.76rem] leading-normal text-muted-foreground">
          {t('forgot.socialNote')}
        </p>

        <BackToLogin onBackToLogin={backToLogin} />
      </form>
    </Form>
  )
}
