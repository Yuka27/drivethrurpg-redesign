import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { ElementType } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import { LoginRequestSchema, useLogin, useSocialLogin } from '@/api/auth'
import type { LoginRequest, SocialProvider } from '@/api/auth'
import facebookIcon from '@/assets/social/facebook.png'
import googleIcon from '@/assets/social/google.png'
import roll20Icon from '@/assets/social/roll20.png'
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
import { TODO_URL } from '@/config/footer'
import { useApplyApiError } from '@/lib/forms'

const inputClass =
  'h-9 rounded-lg border-border bg-background px-2.5 shadow-none dark:bg-background'

type LoginFormProps = {
  /** the modal passes DialogTitle/DialogDescription; the /login page keeps h1/p */
  Title?: ElementType
  Description?: ElementType
  onSuccess?: () => void
  /** called when a link inside the form navigates away (the modal closes itself) */
  onNavigate?: () => void
}

export function LoginForm({
  Title = 'h1',
  Description = 'p',
  onSuccess,
  onNavigate,
}: LoginFormProps) {
  const { t } = useTranslation('auth')
  const login = useLogin()
  const social = useSocialLogin()
  // validates on submit, then re-validates each field as the user fixes it;
  // the first invalid field gets focus (shouldFocusError, on by default)
  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '', remember: true },
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

  const onSubmit = form.handleSubmit((request) => {
    form.clearErrors('root')
    login.mutate(request, { onSuccess, onError: applyApiError })
  })

  const signInWith = (provider: SocialProvider) => {
    form.clearErrors('root')
    social.mutate(provider, { onSuccess, onError: applyApiError })
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-2 px-4">
        <img src={logo} alt="DriveThruRPG" width={141} height={24} />
        <div>
          <Title className="font-sans text-2xl leading-8 font-bold tracking-normal">
            {t('login.title')}
          </Title>
          <Description className="text-sm text-muted-foreground">
            {t('login.description')}
          </Description>
        </div>
      </div>

      <Form {...form}>
        <form
          noValidate
          onSubmit={onSubmit}
          className="flex flex-col gap-4 px-6"
        >
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
                    <Link
                      to="/forgot-password"
                      onClick={onNavigate}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('login.forgotPassword')}
                    </Link>
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

            <div className="flex flex-col gap-2">
              <SocialButton
                provider="roll20"
                name="Roll20"
                icon={roll20Icon}
                // Figma: "Continue with Roll20" on mobile, just "Roll20" on desktop
                longLabelOnMobile
                disabled={pending}
                onClick={() => signInWith('roll20')}
              />
              <div className="flex gap-2">
                <SocialButton
                  provider="google"
                  name="Google"
                  icon={googleIcon}
                  disabled={pending}
                  onClick={() => signInWith('google')}
                />
                <SocialButton
                  provider="facebook"
                  name="Facebook"
                  icon={facebookIcon}
                  disabled={pending}
                  onClick={() => signInWith('facebook')}
                />
              </div>
            </div>

            <p className="text-center text-sm">
              {t('login.noAccount')}{' '}
              <Link
                to="/register"
                onClick={onNavigate}
                className="text-primary hover:underline"
              >
                {t('login.register')}
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Trans
              t={t}
              i18nKey="login.legal"
              components={{
                // TODO_URL: legal pages are not routed yet
                terms: (
                  <a href={TODO_URL} className="text-foreground underline" />
                ),
                privacy: (
                  <a href={TODO_URL} className="text-foreground underline" />
                ),
              }}
            />
          </p>
        </form>
      </Form>
    </div>
  )
}

type SocialButtonProps = {
  provider: SocialProvider
  /** brand name, never translated */
  name: string
  icon: string
  longLabelOnMobile?: boolean
  disabled: boolean
  onClick: () => void
}

function SocialButton({
  name,
  icon,
  longLabelOnMobile,
  disabled,
  onClick,
}: SocialButtonProps) {
  const { t } = useTranslation('auth')
  const label = t('login.continueWith', { provider: name })

  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 flex-1 gap-1"
      // the visible text ("Google") is part of the name, as WCAG 2.5.3 requires
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <img
        src={icon}
        alt=""
        width={16}
        height={16}
        className="size-4 rounded-xs"
      />
      {longLabelOnMobile ? (
        <>
          <span className="sm:hidden">{label}</span>
          <span className="hidden sm:inline">{name}</span>
        </>
      ) : (
        name
      )}
    </Button>
  )
}
