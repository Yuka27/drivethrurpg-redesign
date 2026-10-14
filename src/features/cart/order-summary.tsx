import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, CheckIcon, LockIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { cartItemCount, useApplyPromo, useRemovePromo } from '@/api/cart'
import type { Cart } from '@/api/cart'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useFormatMoney } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { message, useApplyApiError } from '@/lib/forms'
import { cn } from '@/lib/utils'

const PERKS = ['instant', 'library', 'updates'] as const

/**
 * Subtotal, sale savings, the promo code, tax and
 * shipping (worked out at checkout), the total and "Proceed to checkout",
 * then what the buyer gets. A gift needs its recipient's email first.
 * Phones: the sticky bar below carries the checkout button instead.
 */
export function OrderSummary({
  cart,
  className,
}: {
  cart: Cart
  className?: string
}) {
  const { t } = useTranslation('cart')
  const formatMoney = useFormatMoney()
  const count = cartItemCount(cart)
  const { totals, promo } = cart
  const blocked = checkoutBlocked(cart)

  return (
    <section
      aria-labelledby="order-summary"
      className={cn('flex flex-col gap-4 rounded-xl bg-card p-4', className)}
    >
      <div className="flex flex-col gap-4 border-b border-muted pb-2">
        <h2
          id="order-summary"
          className="font-sans text-lg leading-7 font-bold"
        >
          {t('summary.title')}
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label={t('summary.subtotal', { count })}>
            <span className="text-base font-bold">
              {formatMoney(totals.subtotal)}
            </span>
          </Row>
          {totals.saleSavings.amount > 0 && (
            <Row label={t('summary.saleSavings')}>
              <span className="text-base font-bold text-success">
                -{formatMoney(totals.saleSavings)}
              </span>
            </Row>
          )}
          {promo && (
            <PromoRow code={promo.code} amount={formatMoney(promo.discount)} />
          )}
          <Row label={t('summary.taxShipping')}>
            <span className="text-muted-foreground">
              {totals.taxAndShippingNote || t('summary.taxShippingNote')}
            </span>
          </Row>
        </dl>
        {!promo && <PromoForm />}
      </div>

      <div className="flex flex-col gap-3">
        <p className="flex items-center justify-between">
          <span className="text-sm font-bold">{t('summary.total')}</span>
          <span className="text-2xl leading-8 font-bold">
            {formatMoney(totals.total)}
          </span>
        </p>
        <div className="flex flex-col gap-3 max-lg:hidden">
          <CheckoutButton blocked={blocked} className="h-9 w-full">
            {t('summary.checkout')}
          </CheckoutButton>
          {blocked && (
            <p className="text-center text-xs text-warning">
              {t('summary.giftNeedsEmail')}
            </p>
          )}
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <LockIcon aria-hidden className="size-4" />
            {t('summary.secure')}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-muted pt-4 pb-2">
        <ul className="flex flex-col gap-2">
          {PERKS.map((perk) => (
            <li
              key={perk}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <CheckIcon aria-hidden className="size-4 shrink-0" />
              {t(`summary.perks.${perk}`)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t('summary.payments')}</p>
      </div>
    </section>
  )
}

/** A gift cannot be sent without the recipient's email. */
export const checkoutBlocked = (cart: Cart) =>
  cart.lines.length === 0 || (cart.gift.enabled && !cart.gift.recipientEmail)

/** "Proceed to checkout" (desktop) and "Checkout" (the phones' sticky bar). */
export function CheckoutButton({
  blocked,
  className,
  children,
}: {
  blocked: boolean
  className?: string
  children: string
}) {
  if (blocked)
    return (
      <Button disabled className={cn('rounded-lg', className)}>
        {children}
        <ArrowRightIcon aria-hidden />
      </Button>
    )
  return (
    <Button asChild className={cn('rounded-lg', className)}>
      <Link to="/checkout">
        {children}
        <ArrowRightIcon aria-hidden />
      </Link>
    </Button>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function PromoRow({ code, amount }: { code: string; amount: string }) {
  const { t } = useTranslation('cart')
  const apiError = useApiError()
  const remove = useRemovePromo()
  return (
    <Row label={t('summary.promo', { code })}>
      <span className="flex items-center gap-1">
        <span className="text-base font-bold text-success">-{amount}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('summary.removePromo', { code })}
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(undefined, {
              onError: (error) => toast.error(apiError(error)),
            })
          }
          className="size-6"
        >
          <XIcon aria-hidden />
        </Button>
      </span>
    </Row>
  )
}

const PromoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, { error: message('validation.codeRequired') }),
})
type Promo = z.infer<typeof PromoSchema>

/** POST /cart/promo; the API's verdict (expired, unknown) shows under the field. */
function PromoForm() {
  const { t } = useTranslation('cart')
  const apply = useApplyPromo()
  const form = useForm<Promo>({
    resolver: zodResolver(PromoSchema),
    defaultValues: { code: '' },
  })
  const applyApiError = useApplyApiError(form)

  const submit = form.handleSubmit(({ code }) =>
    apply.mutate(code.toUpperCase(), {
      onSuccess: () => {
        toast.success(t('summary.applied', { code: code.toUpperCase() }))
        form.reset()
      },
      onError: applyApiError,
    }),
  )

  return (
    <Form {...form}>
      <form noValidate onSubmit={submit}>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem className="gap-1">
              <FormLabel className="sr-only">
                {t('summary.promoLabel')}
              </FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder={t('summary.promoPlaceholder')}
                    className="h-8 flex-1 rounded-lg"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={apply.isPending}
                  className="h-8 rounded-lg"
                >
                  {t('summary.apply')}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
