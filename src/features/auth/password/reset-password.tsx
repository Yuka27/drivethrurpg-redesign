import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon, ClockIcon, KeyRoundIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import { PasswordField } from '../register/password-field'
import { BackToLogin } from '../shared/back-to-login'
import { StatusIcon } from '../shared/status-icon'
import { TipsBox } from '../shared/tips-box'
import { bigButtonClass, subtitleClass, titleClass } from '../shared/styles'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  DEAD_RESET_LINK_CODES,
  ResetPasswordRequestSchema,
  useResetPassword,
} from '@/api/auth'
import type { ResetPasswordRequest } from '@/api/auth'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormRootError } from '@/components/ui/form'
import { TODO_URL } from '@/config/footer'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'

type Stage = 'form' | 'expired' | 'done'

type ResetPasswordProps = {
  /** from the email link; empty means the link is unusable (shown as expired) */
  token: string
  /** switch the modal to the login view */
  onLogin: () => void
  /** switch the modal to "Forgot your password?" */
  onRequestNewLink: () => void
}

/** Opened from the reset email: choose a new password, or ask for a new link if this one is dead. */
export function ResetPassword({
  token,
  onLogin,
  onRequestNewLink,
}: ResetPasswordProps) {
  const { t } = useTranslation('auth')
  const apiError = useApiError()
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const reset = useResetPassword()
  const [stage, setStage] = useState<Stage>(token ? 'form' : 'expired')

  const form = useForm<ResetPasswordRequest>({
    resolver: zodResolver(ResetPasswordRequestSchema),
    defaultValues: { password: '' },
  })

  // the form was replaced by a result: move focus to its title
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    titleRef.current?.focus()
  }, [stage])

  const submit = form.handleSubmit(({ password }) => {
    if (reset.isPending) return
    form.clearErrors('root')
    reset.mutate(
      { token, password },
      {
        onSuccess: () => setStage('done'),
        onError: (error) => {
          if (
            error instanceof ApiError &&
            (DEAD_RESET_LINK_CODES.has(error.code) || error.status === 410)
          ) {
            setStage('expired')
          } else if (
            error instanceof ApiError &&
            error.code === 'weak_password'
          ) {
            form.setError(
              'password',
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

  const heading = (text: string) => (
    // the id sits on an inner span: DialogTitle keeps its own id, which names the dialog
    <DialogTitle ref={titleRef} tabIndex={-1} className={titleClass}>
      <span id={titleId}>{text}</span>
    </DialogTitle>
  )

  if (stage === 'expired') {
    return (
      <section aria-labelledby={titleId}>
        <StatusIcon icon={ClockIcon} tone="warning" />
        {heading(t('reset.expired.title'))}
        <DialogDescription className={subtitleClass}>
          {t('reset.expired.subtitle')}
        </DialogDescription>
        <div className="mt-[22px]">
          <Button
            type="button"
            onClick={onRequestNewLink}
            className={bigButtonClass}
          >
            {t('reset.expired.newLink')}
          </Button>
        </div>
        <BackToLogin onBackToLogin={onLogin} />
      </section>
    )
  }

  if (stage === 'done') {
    return (
      <section aria-labelledby={titleId}>
        <StatusIcon icon={CheckIcon} tone="success" strokeWidth={2.4} />
        {heading(t('reset.done.title'))}
        <DialogDescription className={subtitleClass}>
          {t('reset.done.subtitle')}
        </DialogDescription>
        <div className="mt-[22px]">
          <Button type="button" onClick={onLogin} className={bigButtonClass}>
            {t('reset.done.login')}
          </Button>
        </div>
        <TipsBox title={t('reset.done.notYouTitle')}>
          <li>
            <Trans
              t={t}
              i18nKey="reset.done.notYou"
              components={{
                // TODO_URL: there is no support page yet
                support: (
                  <a
                    href={TODO_URL}
                    className="text-foreground underline underline-offset-2"
                  />
                ),
              }}
            />
          </li>
        </TipsBox>
      </section>
    )
  }

  return (
    <Form {...form}>
      <form noValidate aria-labelledby={titleId} onSubmit={submit}>
        <StatusIcon icon={KeyRoundIcon} />
        {heading(t('reset.title'))}
        <DialogDescription className={subtitleClass}>
          {t('reset.subtitle')}
        </DialogDescription>

        <fieldset disabled={reset.isPending} className="contents">
          <div className="mt-5">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <PasswordField field={field} label={t('reset.password')} />
              )}
            />
          </div>
        </fieldset>
        <FormRootError className="mt-4" />

        <Button
          type="submit"
          disabled={reset.isPending}
          className={cn(bigButtonClass, 'mt-5 disabled:opacity-85')}
        >
          {reset.isPending && (
            <Loader2Icon
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          )}
          {reset.isPending ? t('reset.submitting') : t('reset.submit')}
        </Button>

        <p className="mt-3.5 text-[0.76rem] leading-normal text-muted-foreground">
          {t('reset.note')}
        </p>
      </form>
    </Form>
  )
}
