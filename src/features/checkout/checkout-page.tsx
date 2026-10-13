import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  checkoutSchema,
  emptyAddress,
  paymentMethodId,
  savedToCheckoutAddress,
  toCheckoutAddress,
} from './checkout-schema'
import type { CheckoutForm } from './checkout-schema'
import {
  AddressSection,
  ContactSection,
  DeliverySection,
  GiftRow,
  PaymentSection,
} from './checkout-sections'
import { CheckoutSummary } from './checkout-summary'
import { useAddresses, usePaymentMethods } from '@/api/account'
import type { Address, PaymentMethod } from '@/api/account'
import { useLogout } from '@/api/auth'
import {
  useCheckoutSession,
  useChooseShippingRate,
  usePlaceOrder,
  useShippingRates,
} from '@/api/checkout'
import type { CheckoutSession } from '@/api/checkout'
import { ApiError } from '@/api/client'
import { useMe } from '@/api/me'
import type { Me } from '@/api/me'
import { LoadingStatus } from '@/components/site/loading-status'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiError } from '@/i18n/use-api-error'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { useCheckoutResult } from '@/stores/checkout-result'

/**
 * /checkout (mockup docs/Checkout — DriveThruRPG.html): one page, short
 * numbered sections and no account wall. A guest gives an email and an
 * address; an account sees its saved details as one-line summaries. The
 * summary stays beside the form on desktop and folds into one line on phones.
 */
export function CheckoutPage() {
  const { t } = useTranslation('checkout')
  const session = useCheckoutSession()
  const me = useMe()
  // an account's saved details wait until we know who is here
  const addresses = useAddresses()
  const cards = usePaymentMethods()
  const ready =
    session.data &&
    !me.isPending &&
    (!me.data || (!addresses.isPending && !cards.isPending))

  if (session.isError)
    return (
      <Message text={t('loadError')}>
        <Button asChild variant="outline">
          <Link to="/cart">{t('backToCart')}</Link>
        </Button>
      </Message>
    )
  if (!ready) return <CheckoutSkeleton />
  if (session.data.cart.lines.length === 0)
    return (
      <Message text={t('empty')}>
        <Button asChild variant="outline">
          <Link to="/cart">{t('backToCart')}</Link>
        </Button>
      </Message>
    )

  return (
    <CheckoutContent
      // a login or logout starts the form again, with that person's details
      key={me.data?.id ?? 'guest'}
      session={session.data}
      me={me.data ?? undefined}
      addresses={me.data ? (addresses.data ?? []) : []}
      cards={me.data ? (cards.data ?? []) : []}
    />
  )
}

function CheckoutContent({
  session,
  me,
  addresses,
  cards,
}: {
  session: CheckoutSession
  me: Me | undefined
  addresses: Array<Address>
  cards: Array<PaymentMethod>
}) {
  const { t } = useTranslation('checkout')
  const apiError = useApiError()
  const navigate = useNavigate()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const logout = useLogout()
  const setResult = useCheckoutResult((state) => state.set)
  const place = usePlaceOrder()
  const rates = useShippingRates(
    session.requiresShipping ? session.id : undefined,
  )
  const chooseRate = useChooseShippingRate()
  const [declined, setDeclined] = useState(false)
  const alertRef = useRef<HTMLDivElement>(null)

  const defaultAddress =
    addresses.find((item) => item.isDefault) ?? addresses.at(0)
  const defaultCard = cards.find((item) => item.isDefault) ?? cards.at(0)
  const guest = !me
  const resolver = useMemo(
    () =>
      zodResolver(
        checkoutSchema({ guest, requiresShipping: session.requiresShipping }),
      ),
    [guest, session.requiresShipping],
  )
  const form = useForm<CheckoutForm>({
    resolver,
    defaultValues: {
      email: '',
      savedAddressId: defaultAddress?.id ?? '',
      billing: emptyAddress(),
      shipToBilling: true,
      shipping: emptyAddress(),
      method: 'card',
      savedCardId: defaultCard?.id ?? '',
      card: { number: '', expiry: '', cvc: '' },
    },
  })

  // printed items: Standard until the buyer picks, so the total includes shipping
  const firstRate = rates.data?.[0]?.id
  const chosenRate = session.shippingRate?.id
  const { mutate: choose } = chooseRate
  useEffect(() => {
    if (session.requiresShipping && firstRate && !chosenRate)
      choose({ sessionId: session.id, rateId: firstRate })
  }, [session.requiresShipping, session.id, firstRate, chosenRate, choose])

  // declined: the banner says so, and takes focus
  useEffect(() => {
    if (declined) alertRef.current?.focus()
  }, [declined])

  const submit = form.handleSubmit((values) => {
    const saved = addresses.find((item) => item.id === values.savedAddressId)
    const billing = saved
      ? savedToCheckoutAddress(saved)
      : toCheckoutAddress(values.billing)
    const shipping = !session.requiresShipping
      ? undefined
      : saved || values.shipToBilling
        ? billing
        : toCheckoutAddress(values.shipping)
    const email = me?.email ?? values.email.trim()
    setDeclined(false)

    place.mutate(
      {
        sessionId: session.id,
        email,
        billing,
        shipping,
        paymentMethodId: paymentMethodId(values),
      },
      {
        onSuccess: (order) => {
          setResult({
            number: order.number,
            email,
            shippedTitleIds: session.cart.lines
              .filter((line) => line.requiresShipping)
              .map((line) => line.title.id),
          })
          void navigate({
            to: '/order-confirmation/$orderId',
            params: { orderId: order.number },
            replace: true,
          })
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'payment_declined') {
            setDeclined(true)
            // a declined saved card: offer the fields for another one
            if (values.savedCardId) form.setValue('savedCardId', '')
            else if (values.method === 'card')
              form.setError('card.number', { message: t('declined.field') })
            return
          }
          toast.error(apiError(error))
        },
      },
    )
  })

  let step = 0
  return (
    <div className="mx-auto grid max-w-[1100px] items-start gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-9 lg:px-7 lg:py-8">
      <h1 className="sr-only">{t('heading')}</h1>
      <Form {...form}>
        <form
          id="checkout-form"
          noValidate
          onSubmit={submit}
          className="flex min-w-0 flex-col gap-4"
        >
          {declined && (
            <div
              ref={alertRef}
              role="alert"
              tabIndex={-1}
              className="rounded-xl border border-destructive/55 bg-destructive/14 px-4 py-3.5 text-sm leading-relaxed outline-none"
            >
              <p className="font-bold">{t('declined.title')}</p>
              <p>{t('declined.text')}</p>
            </div>
          )}
          <ContactSection
            number={++step}
            me={me}
            onLogin={(trigger) => openAuth('login', { returnFocusTo: trigger })}
            onLogout={() => logout.mutate()}
          />
          <AddressSection
            number={++step}
            saved={addresses}
            requiresShipping={session.requiresShipping}
          />
          {session.requiresShipping && rates.data && (
            <DeliverySection
              number={++step}
              rates={rates.data}
              value={chosenRate}
              pending={chooseRate.isPending}
              onChange={(rateId) =>
                chooseRate.mutate(
                  { sessionId: session.id, rateId },
                  { onError: (error) => toast.error(apiError(error)) },
                )
              }
            />
          )}
          <PaymentSection number={++step} savedCards={cards} />
          <GiftRow gift={session.cart.gift} />
        </form>
      </Form>
      <CheckoutSummary session={session} paying={place.isPending} />
    </div>
  )
}

function Message({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col items-start gap-4 px-4 py-10 lg:px-7">
      <h1 className="font-heading text-2xl font-bold">{text}</h1>
      {children}
    </div>
  )
}

/** The checkout's outline while the session loads: sections, the summary. */
function CheckoutSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1100px] gap-9 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-7">
      <LoadingStatus />
      <div aria-hidden className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        {[2, 3, 1, 2].map((rows, section) => (
          <div
            key={section}
            className="flex flex-col gap-4 rounded-[14px] bg-card p-5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
            {Array.from({ length: rows }, (_, row) => (
              <Skeleton key={row} className="h-10 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
      <div
        aria-hidden
        className="flex flex-col gap-4 self-start rounded-[14px] bg-card p-5 max-lg:hidden"
      >
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="aspect-[3/4] w-11" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
        <Skeleton className="mt-2 h-11 rounded-lg" />
      </div>
    </div>
  )
}
