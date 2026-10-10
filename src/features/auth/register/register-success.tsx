import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useRouter } from '@tanstack/react-router'
import { CheckIcon, MailIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { ElementType } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { registerCardClass, registerInputClass } from './styles'
import {
  ChangeEmailRequestSchema,
  useChangeEmail,
  useResendConfirmation,
} from '@/api/auth'
import type { ChangeEmailRequest } from '@/api/auth'
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
import { useApplyApiError } from '@/lib/forms'
import { cn } from '@/lib/utils'

type RegisterSuccessProps = {
  email: string
  /** cart items moved into the account (null until /account/merge succeeds) */
  mergedCartItems: number | null
  cartHasItems: boolean
  redirect?: string
  /** the modal passes DialogTitle/DialogDescription; the /register page keeps h1/p */
  Title?: ElementType
  Description?: ElementType
  variant?: 'card' | 'plain'
  /**
   * In the modal: close it. "Continue shopping" then simply closes (the user stays
   * where they are); the other buttons navigate first.
   */
  onDone?: () => void
}

/** Replaces the form after the account is created. */
export function RegisterSuccess({
  email: initialEmail,
  mergedCartItems,
  cartHasItems,
  redirect,
  Title = 'h1',
  Description = 'p',
  variant = 'card',
  onDone,
}: RegisterSuccessProps) {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [email, setEmail] = useState(initialEmail)
  const [changing, setChanging] = useState(false)
  const resend = useResendConfirmation()
  const linkClass =
    'text-foreground underline underline-offset-2 hover:text-primary'

  // the form the user was in has gone: tell screen readers what happened
  useEffect(() => titleRef.current?.focus(), [])

  // back to where they started; otherwise the cart they just saved, or the shop
  // (in the modal "the shop" is the page underneath: just close)
  const next = redirect ?? (cartHasItems ? '/cart' : onDone ? null : '/')
  const onContinue = () => {
    if (next) router.history.push(next)
    onDone?.()
  }

  return (
    <section
      aria-labelledby="register-success-title"
      className={cn(variant === 'card' && registerCardClass)}
    >
      <div
        aria-hidden
        className="mb-4 grid size-14 place-items-center rounded-full border border-success/50 bg-success/[0.18] text-success"
      >
        <CheckIcon className="size-[26px]" strokeWidth={2.4} />
      </div>
      {/* the id sits on an inner span: DialogTitle keeps its own id, which names the dialog */}
      <Title
        ref={titleRef}
        tabIndex={-1}
        className="text-[1.4rem] leading-tight font-extrabold outline-none min-[1000px]:text-[1.6rem]"
      >
        <span id="register-success-title">{t('register.success.title')}</span>
      </Title>
      <Description className="mt-1.5 text-[0.9rem] text-muted-foreground">
        {t('register.success.subtitle')}
      </Description>

      <p className="my-[18px] flex items-center gap-2.5 rounded-[10px] border border-border bg-background px-3.5 py-3 text-[0.88rem] [overflow-wrap:anywhere]">
        <MailIcon
          aria-hidden
          className="size-[18px] shrink-0 text-muted-foreground"
        />
        <span>
          <Trans
            t={t}
            i18nKey="register.success.mail"
            values={{ email }}
            components={{ strong: <b />, br: <br /> }}
          />
        </span>
      </p>

      {changing && (
        <ChangeEmailForm
          onDone={(newEmail) => {
            if (newEmail) setEmail(newEmail)
            setChanging(false)
          }}
        />
      )}

      {mergedCartItems !== null && mergedCartItems > 0 && (
        <p className="mt-3.5 flex items-center gap-2 text-[0.82rem] text-muted-foreground">
          <CheckIcon aria-hidden className="size-4 shrink-0 text-success" />
          {t('register.success.cartSaved', { count: mergedCartItems })}
        </p>
      )}

      <div className="mt-5 grid gap-2.5">
        <Button
          type="button"
          className="h-[50px] rounded-[10px] text-[0.98rem] font-bold"
          onClick={onContinue}
        >
          {t(
            cartHasItems
              ? 'register.success.toCart'
              : 'register.success.continue',
          )}
        </Button>
        <Button
          asChild
          variant="secondary"
          className="h-[50px] rounded-[10px] border border-border text-[0.98rem] font-bold"
        >
          <Link to="/account" onClick={onDone}>
            {t('register.success.toAccount')}
          </Link>
        </Button>
      </div>

      <p className="mt-4 text-center text-[0.82rem] text-muted-foreground">
        {t('register.success.wrongEmail')}{' '}
        <button
          type="button"
          className={linkClass}
          aria-expanded={changing}
          onClick={() => setChanging((value) => !value)}
        >
          {t('register.success.changeIt')}
        </button>
        {' · '}
        {t('register.success.noEmail')}{' '}
        <button
          type="button"
          className={linkClass}
          disabled={resend.isPending}
          onClick={() =>
            resend.mutate(undefined, {
              onSuccess: () => toast.success(t('register.success.sent')),
            })
          }
        >
          {t('register.success.sendAgain')}
        </button>
      </p>
    </section>
  )
}

/** "Change it": POST /account/email/change, which sends a new confirmation link. */
function ChangeEmailForm({
  onDone,
}: {
  onDone: (newEmail: string | null) => void
}) {
  const { t } = useTranslation('auth')
  const id = useId()
  const change = useChangeEmail()
  const form = useForm<ChangeEmailRequest>({
    resolver: zodResolver(ChangeEmailRequestSchema),
    defaultValues: { email: '' },
  })
  const applyApiError = useApplyApiError(form)

  useEffect(() => form.setFocus('email'), [form])

  return (
    <Form {...form}>
      <form
        noValidate
        aria-labelledby={`${id}-label`}
        onSubmit={form.handleSubmit(({ email }) =>
          change.mutate(
            { email: email.trim() },
            {
              onSuccess: () => {
                toast.success(
                  t('register.success.emailChanged', { email: email.trim() }),
                )
                onDone(email.trim())
              },
              onError: applyApiError,
            },
          ),
        )}
        className="mb-2 grid gap-2.5"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel
                id={`${id}-label`}
                className="text-[0.82rem] font-semibold"
              >
                {t('register.success.newEmail')}
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className={registerInputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormRootError />
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="secondary"
            disabled={change.isPending}
            className="h-11 flex-1 border border-border font-semibold"
          >
            {t('register.success.saveEmail')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onClick={() => onDone(null)}
          >
            {t('register.success.cancel')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
