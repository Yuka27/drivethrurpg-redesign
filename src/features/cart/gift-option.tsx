import { zodResolver } from '@hookform/resolvers/zod'
import { GiftIcon } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { useUpdateGift } from '@/api/cart'
import type { Cart } from '@/api/cart'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useApiError } from '@/i18n/use-api-error'
import { message } from '@/lib/forms'

const GiftSchema = z.object({
  recipientName: z.string().trim().max(100),
  recipientEmail: z
    .string()
    .trim()
    .min(1, { error: message('validation.recipientEmailRequired') })
    .pipe(z.email({ error: message('validation.emailInvalid') })),
  message: z.string().trim().max(500),
})
type Gift = z.infer<typeof GiftSchema>

/**
 * Figma "This order is a gift": a switch (PUT /cart/gift), and once it is on,
 * who it is for and an optional message. Each field saves when the buyer
 * leaves it, once the email is valid; checkout waits for that email.
 */
export function GiftOption({ cart }: { cart: Cart }) {
  const { t } = useTranslation('cart')
  const apiError = useApiError()
  const switchId = useId()
  const update = useUpdateGift()
  const { gift } = cart

  const form = useForm<Gift>({
    resolver: zodResolver(GiftSchema),
    mode: 'onTouched',
    defaultValues: {
      recipientName: gift.recipientName ?? '',
      recipientEmail: gift.recipientEmail ?? '',
      message: gift.message ?? '',
    },
  })

  const onError = (error: unknown) => toast.error(apiError(error))

  const toggle = (enabled: boolean) =>
    update.mutate(
      enabled ? { enabled, ...savedDetails(form.getValues()) } : { enabled },
      { onError },
    )

  // leaving a field: save what is there once the email is good (quietly:
  // each field shows its own error once touched)
  const save = () => {
    const parsed = GiftSchema.safeParse(form.getValues())
    if (!parsed.success) return
    const next = savedDetails(parsed.data)
    const unchanged =
      next.recipientEmail === gift.recipientEmail &&
      next.message === gift.message &&
      next.recipientName === gift.recipientName
    if (!unchanged) update.mutate({ enabled: true, ...next }, { onError })
  }

  return (
    <section
      aria-labelledby={`${switchId}-title`}
      className="flex flex-col gap-2 rounded-xl bg-card p-4"
    >
      <div className="flex items-center gap-2">
        <GiftIcon
          aria-hidden
          className="size-8 shrink-0 text-primary"
          strokeWidth={1.5}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            id={`${switchId}-title`}
            className="font-sans text-sm leading-5 font-bold"
          >
            <label htmlFor={switchId}>{t('gift.title')}</label>
          </h2>
          <p id={`${switchId}-text`} className="text-sm">
            {t('gift.text')}
          </p>
        </div>
        <Switch
          id={switchId}
          aria-describedby={`${switchId}-text`}
          checked={gift.enabled}
          disabled={update.isPending}
          onCheckedChange={toggle}
        />
      </div>

      {gift.enabled && (
        <Form {...form}>
          <form
            noValidate
            // Enter in a field: show what is missing, save what is valid
            onSubmit={(event) => {
              event.preventDefault()
              void form.trigger()
              save()
            }}
            className="flex flex-col gap-2 border-t border-muted pt-3"
          >
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel className="text-xs font-semibold">
                      {t('gift.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="off"
                        placeholder={t('gift.namePlaceholder')}
                        className="h-8 rounded-lg"
                        {...field}
                        onBlur={() => {
                          field.onBlur()
                          save()
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel className="text-xs font-semibold">
                      {t('gift.email')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="off"
                        placeholder={t('gift.emailPlaceholder')}
                        className="h-8 rounded-lg"
                        {...field}
                        onBlur={() => {
                          field.onBlur()
                          save()
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="text-xs font-semibold">
                    {t('gift.message')}{' '}
                    <span className="text-muted-foreground">
                      {t('gift.optional')}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      placeholder={t('gift.messagePlaceholder')}
                      className="h-8 rounded-lg"
                      {...field}
                      onBlur={() => {
                        field.onBlur()
                        save()
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs">{t('gift.note')}</p>
          </form>
        </Form>
      )}
    </section>
  )
}

/** Empty fields are left out rather than sent blank. */
const savedDetails = (details: {
  recipientName: string
  recipientEmail: string
  message: string
}) => ({
  recipientName: details.recipientName.trim() || undefined,
  recipientEmail: details.recipientEmail.trim() || undefined,
  message: details.message.trim() || undefined,
})
