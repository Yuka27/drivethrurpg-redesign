import { CheckIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NewsletterEmailSchema, useSubscribeNewsletter } from '@/api/newsletter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApiError } from '@/i18n/use-api-error'

export function NewsletterForm() {
  const { t } = useTranslation()
  const apiError = useApiError()
  const headingId = useId()
  const hintId = useId()
  const messageId = useId()
  const [email, setEmail] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)
  const messageRef = useRef<HTMLDivElement>(null)
  const subscribe = useSubscribeNewsletter()

  const error =
    clientError ?? (subscribe.isError ? apiError(subscribe.error) : null)

  // the button disappears on success; move focus to the confirmation once it renders
  useEffect(() => {
    if (subscribe.isSuccess) messageRef.current?.focus()
  }, [subscribe.isSuccess])

  return (
    <form
      noValidate
      aria-labelledby={headingId}
      className="flex flex-col gap-2 lg:w-[549px] lg:flex-row lg:items-start lg:gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = NewsletterEmailSchema.safeParse(email.trim())
        if (!parsed.success) {
          setClientError(t('errors.invalid_email'))
          return
        }
        setClientError(null)
        subscribe.mutate(parsed.data)
      }}
    >
      <div className="lg:w-[221px] lg:shrink-0">
        <p id={headingId} className="text-sm font-semibold">
          {t('newsletter.heading')}
        </p>
        <p id={hintId} className="text-xs text-muted-foreground">
          {t('newsletter.hint')}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {!subscribe.isSuccess && (
          <div className="flex">
            <Input
              type="email"
              name="email"
              autoComplete="email"
              aria-label={t('newsletter.emailLabel')}
              aria-describedby={`${hintId} ${messageId}`}
              aria-invalid={error ? true : undefined}
              placeholder={t('newsletter.emailPlaceholder')}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                // clear the old error as soon as the user edits
                setClientError(null)
                if (subscribe.isError) subscribe.reset()
              }}
              className="h-8 rounded-l-lg rounded-r-none border-border bg-background shadow-none dark:bg-background"
            />
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
        )}
        {/* always rendered so screen readers announce changes to it */}
        <div
          ref={messageRef}
          id={messageId}
          aria-live="polite"
          tabIndex={-1}
          className="text-xs outline-none empty:hidden"
        >
          {subscribe.isSuccess ? (
            <p className="flex h-8 items-center gap-1.5 text-sm text-success">
              <CheckIcon aria-hidden className="size-4" />
              {t('newsletter.success')}
            </p>
          ) : (
            error && <p className="text-destructive">{error}</p>
          )}
        </div>
      </div>
    </form>
  )
}
