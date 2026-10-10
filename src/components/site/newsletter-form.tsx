import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  NewsletterRequestSchema,
  useSubscribeNewsletter,
} from '@/api/newsletter'
import type { NewsletterRequest } from '@/api/newsletter'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  FormRootError,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useApplyApiError } from '@/lib/forms'

export function NewsletterForm() {
  const { t } = useTranslation()
  const headingId = useId()
  const successRef = useRef<HTMLDivElement>(null)
  const subscribe = useSubscribeNewsletter()
  const form = useForm<NewsletterRequest>({
    resolver: zodResolver(NewsletterRequestSchema),
    defaultValues: { email: '' },
  })
  // the API's 422 names field "email", so it lands on the input; anything else is form-wide
  const applyApiError = useApplyApiError(form)

  // a form-wide API error is stale as soon as the user edits the address
  useEffect(() => {
    const subscription = form.watch(() => {
      if (form.formState.errors.root) form.clearErrors('root')
    })
    return () => subscription.unsubscribe()
  }, [form])

  // the field and button disappear on success; move focus to the confirmation
  useEffect(() => {
    if (subscribe.isSuccess) successRef.current?.focus()
  }, [subscribe.isSuccess])

  const onSubmit = form.handleSubmit(({ email }) => {
    form.clearErrors('root')
    subscribe.mutate({ email: email.trim() }, { onError: applyApiError })
  })

  return (
    <Form {...form}>
      <form
        noValidate
        aria-labelledby={headingId}
        onSubmit={onSubmit}
        className="lg:w-[549px]"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            // one item for the whole row, so the hint on the left is the input's description
            <FormItem className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
              <div className="lg:w-[221px] lg:shrink-0">
                <p id={headingId} className="text-sm font-semibold">
                  {t('newsletter.heading')}
                </p>
                <FormDescription>{t('newsletter.hint')}</FormDescription>
              </div>

              <div className="flex flex-1 flex-col gap-1">
                {!subscribe.isSuccess && (
                  <>
                    <div className="flex">
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          aria-label={t('newsletter.emailLabel')}
                          placeholder={t('newsletter.emailPlaceholder')}
                          className="h-8 rounded-l-lg rounded-r-none border-border bg-background shadow-none dark:bg-background"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        disabled={subscribe.isPending}
                        className="rounded-l-none border border-l-0 border-border"
                      >
                        {subscribe.isPending
                          ? t('newsletter.subscribing')
                          : t('newsletter.subscribe')}
                      </Button>
                    </div>
                    <FormMessage />
                  </>
                )}
                <FormRootError className="text-xs" />
                {/* always rendered so screen readers announce the confirmation */}
                <div
                  ref={successRef}
                  aria-live="polite"
                  tabIndex={-1}
                  className="outline-none empty:hidden"
                >
                  {subscribe.isSuccess && (
                    <p className="flex h-8 items-center gap-1.5 text-sm text-success">
                      <CheckIcon aria-hidden className="size-4" />
                      {t('newsletter.success')}
                    </p>
                  )}
                </div>
              </div>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
