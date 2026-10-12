import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ChangeEmailRequestSchema, useChangeEmail } from '@/api/auth'
import type { ChangeEmailRequest } from '@/api/auth'
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
import { useApplyApiError } from '@/lib/forms'

/** POST /account/email/change: the address changes once the user confirms the emailed link. */
export function ChangeEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('account')
  const change = useChangeEmail()
  const form = useForm<ChangeEmailRequest>({
    resolver: zodResolver(ChangeEmailRequestSchema),
    defaultValues: { email: '' },
  })
  const applyApiError = useApplyApiError(form)

  const close = (next: boolean) => {
    if (change.isPending) return
    if (!next) form.reset()
    onOpenChange(next)
  }

  const submit = form.handleSubmit(({ email }) => {
    form.clearErrors('root')
    change.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          toast.success(t('changeEmail.sent', { email: email.trim() }))
          close(false)
        },
        onError: applyApiError,
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form noValidate onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="font-sans tracking-normal">
                {t('changeEmail.title')}
              </DialogTitle>
              <DialogDescription>
                {t('changeEmail.description')}
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('changeEmail.newEmail')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormRootError />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" disabled={change.isPending}>
                  {t('dialog.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={change.isPending}>
                {t('changeEmail.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
