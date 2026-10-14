import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import { CartContextNote } from '../shared/cart-context-note'
import { SocialButtons } from '../shared/social-buttons'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  LoginRequestSchema,
  useLogin,
  useMergeGuestData,
  useSocialLogin,
} from '@/api/auth'
import type { LoginRequest, SocialProvider } from '@/api/auth'
import logo from '@/assets/logos/drivethrurpg.png'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cartItemCount, useCart } from '@/api/cart'
import { PRIVACY_URL, TERMS_URL } from '@/config/links'
import { useApplyApiError } from '@/lib/forms'

const inputClass =
  'h-9 rounded-lg border-border bg-background px-2.5 shadow-none dark:bg-background'

type LoginFormProps = {
  /** prefilled email, e.g. from register's "Log in instead" */
  defaultEmail?: string
  /** "Register here" switches the modal to the register view */
  onSwitchToRegister: () => void
  /** "Forgot password?" switches the modal to the forgot-password view, keeping the email */
  onForgotPassword: (email: string) => void
  onSuccess: () => void
}

export function LoginForm({
  defaultEmail = '',
  onSwitchToRegister,
  onForgotPassword,
  onSuccess,
}: LoginFormProps) {
  const { t } = useTranslation('auth')
  const login = useLogin()
  const social = useSocialLogin()
  const { data: cart } = useCart()
  const merge = useMergeGuestData()
  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: defaultEmail, password: '', remember: true },
  })
  const applyApiError = useApplyApiError(form)
  const pending = login.isPending || social.isPending

  // an API error (wrong password) is stale as soon as the user edits anything
  useEffect(() => {
    const subscription = form.watch(() => {
      if (form.formState.errors.root) form.clearErrors('root')
    })
    return () => subscription.unsubscribe()
  }, [form])

  // the note promises the guest cart is kept: bring it into the account (once,
  // never blocking the login), then hand over to the caller
  const signedIn = () => {
    if (cartItemCount(cart) > 0) merge.mutate()
    onSuccess()
  }

  const onSubmit = form.handleSubmit((request) => {
    form.clearErrors('root')
    login.mutate(request, { onSuccess: signedIn, onError: applyApiError })
  })

  const signInWith = (provider: SocialProvider) => {
    form.clearErrors('root')
    social.mutate(provider, { onSuccess: signedIn, onError: applyApiError })
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-2 px-4">
        <img src={logo} alt="DriveThruRPG" width={141} height={24} />
        <div>
          <DialogTitle className="font-sans text-2xl leading-8 font-bold tracking-normal">
            {t('login.title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('login.description')}
          </DialogDescription>
        </div>
      </div>

      <Form {...form}>
        <form
          noValidate
          onSubmit={onSubmit}
          className="flex flex-col gap-4 px-6"
        >
          <CartContextNote context="login" />
          <div className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('login.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder={t('login.emailPlaceholder')}
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="flex-1">
                      {t('login.password')}
                    </FormLabel>
                    <button
                      type="button"
                      onClick={() =>
                        onForgotPassword(form.getValues('email').trim())
                      }
                      className="text-sm text-primary-text hover:underline"
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    ref={field.ref}
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    onBlur={field.onBlur}
                    className="border-border"
                  />
                </FormControl>
                <FormLabel>{t('login.remember')}</FormLabel>
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3">
            <FormRootError className="text-center" />
            <Button type="submit" className="w-full" disabled={pending}>
              {login.isPending ? t('login.submitting') : t('login.submit')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <span className="sm:hidden">{t('login.or')}</span>
              <span className="hidden sm:inline">
                {t('login.orContinueWith')}
              </span>
            </p>

            <SocialButtons
              layout="stacked"
              disabled={pending}
              pending={social.isPending ? social.variables : undefined}
              onSelect={signInWith}
            />

            <p className="text-center text-sm">
              {t('login.noAccount')}{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-primary-text hover:underline"
              >
                {t('login.register')}
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Trans
              t={t}
              i18nKey="login.legal"
              components={{
                terms: (
                  <a href={TERMS_URL} className="text-foreground underline" />
                ),
                privacy: (
                  <a href={PRIVACY_URL} className="text-foreground underline" />
                ),
              }}
            />
          </p>
        </form>
      </Form>
    </div>
  )
}
