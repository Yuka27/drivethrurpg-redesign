import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ChangePasswordRequestSchema, useChangePassword } from '@/api/account'
import type { ChangePasswordRequest } from '@/api/account'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { PasswordField } from '@/features/auth/register/password-field'
import { useApplyApiError } from '@/lib/forms'

/** POST /account/password: current password plus the new one (same rules and meter as sign-up). */
export function ChangePasswordDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** the account's email, for the "different from your email" check */
  email: string
}) {
  const { t } = useTranslation('account')
  const change = useChangePassword()
  const form = useForm<ChangePasswordRequest>({
    resolver: zodResolver(ChangePasswordRequestSchema),
    defaultValues: { currentPassword: '', password: '' },
  })
  const applyApiError = useApplyApiError(form)

  const close = (next: boolean) => {
    if (change.isPending) return
    if (!next) form.reset()
    onOpenChange(next)
  }

  const submit = form.handleSubmit((values) => {
    form.clearErrors('root')
    change.mutate(values, {
      onSuccess: () => {
        toast.success(t('changePassword.saved'))
        close(false)
      },
      onError: applyApiError,
    })
  })

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form noValidate onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="font-sans tracking-normal">
                {t('changePassword.title')}
              </DialogTitle>
              <DialogDescription>
                {t('changePassword.description')}
              </DialogDescription>
            </DialogHeader>
            <fieldset disabled={change.isPending} className="contents">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('changePassword.current')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
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
                  <PasswordField
                    field={field}
                    email={email}
                    label={t('changePassword.new')}
                  />
                )}
              />
            </fieldset>
            <FormRootError />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" disabled={change.isPending}>
                  {t('dialog.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={change.isPending}>
                {change.isPending
                  ? t('changePassword.saving')
                  : t('changePassword.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
