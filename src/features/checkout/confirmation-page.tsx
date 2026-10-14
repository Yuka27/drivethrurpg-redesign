import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { CheckIcon, PackageIcon, ZapIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { assetUrl } from '@/api/client'
import { useLibraryByTitle } from '@/api/library'
import { useMe } from '@/api/me'
import { useCreateAccountFromOrder, useOrder, useReceipt } from '@/api/orders'
import { useTitleName } from '@/api/titles'
import type { OrderDetail, OrderLine } from '@/api/orders'
import { Button } from '@/components/ui/button'
import { LoadingStatus } from '@/components/site/loading-status'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { brandName } from '@/lib/card-brand'
import { LibraryButton } from '@/components/title/library-button'
import { useFormatMoney } from '@/i18n/format'
import { message, useApplyApiError } from '@/lib/forms'
import { openInNewTab } from '@/lib/open-in-new-tab'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { useCheckoutResult } from '@/stores/checkout-result'

/**
 * /order-confirmation/$orderId: the result first,
 * then the downloads. Printed items get a shipping line. A guest gets one
 * optional step, a password to keep the titles in a library; skipping it never
 * stands between them and their files.
 */
export function ConfirmationPage({ orderId }: { orderId: string }) {
  const { t } = useTranslation('checkout')
  const order = useOrder(orderId)

  if (order.isError)
    return (
      <div className="mx-auto flex max-w-[760px] flex-col items-start gap-4 px-4 py-10">
        <h1 className="font-heading text-2xl font-bold">
          {t('confirmation.notFound')}
        </h1>
        <Button asChild variant="outline">
          <Link to="/">{t('continueShopping')}</Link>
        </Button>
      </div>
    )
  if (!order.data)
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-4 py-10">
        <LoadingStatus />
        <div aria-hidden className="flex flex-col items-center gap-3">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton aria-hidden className="h-24 rounded-[14px] bg-card" />
        <div
          aria-hidden
          className="flex flex-col gap-4 rounded-[14px] bg-card px-4 py-4"
        >
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="aspect-[3/4] w-[52px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  return <Confirmation order={order.data} />
}

function Confirmation({ order }: { order: OrderDetail }) {
  const { t } = useTranslation('checkout')
  const formatMoney = useFormatMoney()
  const meQuery = useMe()
  const me = meQuery.data
  // who is here decides between the guest and the account versions: wait for it
  const known = !meQuery.isPending
  // what the checkout just knew (gone after a reload)
  const result = useCheckoutResult((state) =>
    state.result?.number === order.number ? state.result : null,
  )
  const guest = order.guest || (known && !me)
  const email = result?.email ?? me?.email
  const shipped = (line: OrderLine) =>
    line.requiresShipping ??
    result?.shippedTitleIds.includes(line.title.id) ??
    false
  const hasDigital = order.lines.some(
    (line) => !shipped(line) || /pdf/i.test(line.formatLabel ?? ''),
  )

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4 px-4 py-6 lg:py-10">
      <header className="mb-2.5 flex flex-col items-center text-center">
        <span className="mb-4 grid size-20 place-items-center rounded-full bg-success/24 text-success">
          <CheckIcon aria-hidden className="size-[38px]" strokeWidth={2} />
        </span>
        <h1 className="mb-2 font-heading text-[28px] leading-tight font-extrabold text-balance">
          {t('confirmation.title')}
        </h1>
        <p className="max-w-[50ch] text-[15px] leading-relaxed text-muted-foreground">
          {email ? (
            <Trans
              t={t}
              i18nKey="confirmation.sentTo"
              values={{ email }}
              components={{ b: <b className="text-foreground" /> }}
            />
          ) : (
            t('confirmation.sent')
          )}{' '}
          {order.digitalReady && hasDigital && t('confirmation.ready')}
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Fact label={t('confirmation.number')} value={order.number} />
        <Fact
          label={t('confirmation.totalPaid')}
          value={formatMoney({
            amount: order.totals.total,
            currency: order.totals.currency,
          })}
        />
        <Fact
          label={t('confirmation.paidWith')}
          value={
            order.payment
              ? t('confirmation.savedCard', {
                  brand: brandName(order.payment.brand),
                  last4: order.payment.last4,
                })
              : t('confirmation.card')
          }
        />
      </dl>

      <ul className="overflow-hidden rounded-[14px] border bg-card">
        {order.lines.map((line) => (
          <ConfirmationLine
            key={line.lineId}
            line={line}
            shipped={shipped(line)}
            ready={order.digitalReady}
            eta={order.shippingRate?.eta ?? null}
            withLibrary={known && !guest}
          />
        ))}
      </ul>

      {guest && <KeepInLibrary orderId={order.id} email={email ?? undefined} />}

      {known && (
        <div className="flex flex-wrap justify-center gap-2.5">
          {guest ? (
            <>
              <Button asChild variant="secondary" className="border">
                <Link to="/">{t('confirmation.skip')}</Link>
              </Button>
              <ReceiptButton orderId={order.id} />
            </>
          ) : (
            <>
              <Button asChild>
                <Link to="/library">{t('confirmation.library')}</Link>
              </Button>
              <Button asChild variant="secondary" className="border">
                <Link to="/orders/$orderId" params={{ orderId: order.number }}>
                  {t('confirmation.details')}
                </Link>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3.5 py-3">
      <dt className="mb-0.5 text-[10.5px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-[15px] font-bold">{value}</dd>
    </div>
  )
}

/**
 * A line: the title, its format, "PDF ready" and, for a printed copy, when it
 * ships. An account gets the library's Download / In library button.
 */
function ConfirmationLine({
  line,
  shipped,
  ready,
  eta,
  withLibrary,
}: {
  line: OrderLine
  shipped: boolean
  ready: boolean
  eta: string | null
  withLibrary: boolean
}) {
  const { t } = useTranslation('checkout')
  const summary = useTitleName(line.title.id).data
  const name = line.title.name ?? summary?.title ?? ''
  const digital = !shipped || /pdf/i.test(line.formatLabel ?? '')

  return (
    <li className="flex items-center gap-3 border-t px-4 py-3.5 first:border-t-0">
      <span className="aspect-[3/4] w-[52px] shrink-0 overflow-hidden rounded-[5px] border bg-muted">
        {line.title.cover && (
          <img
            src={assetUrl(line.title.cover.url)}
            alt=""
            className="size-full object-cover"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        {name ? (
          <p className="text-sm leading-tight font-bold">{name}</p>
        ) : (
          <Skeleton className="my-0.5 h-3.5 w-2/3" />
        )}
        {line.formatLabel && (
          <p className="text-xs text-muted-foreground">{line.formatLabel}</p>
        )}
        {digital && ready && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-success">
            <ZapIcon aria-hidden className="size-3" />
            {t('confirmation.pdfReady')}
          </p>
        )}
        {shipped && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <PackageIcon aria-hidden className="size-3" />
            {eta
              ? t('confirmation.ships', { eta })
              : t('confirmation.shipsSoon')}
          </p>
        )}
      </div>
      {withLibrary && digital && name && (
        <LibraryAction titleId={line.title.id} title={name} />
      )}
    </li>
  )
}

function LibraryAction({ titleId, title }: { titleId: string; title: string }) {
  const item = useLibraryByTitle().data?.get(titleId)
  return item ? <LibraryButton item={item} title={title} /> : null
}

function ReceiptButton({ orderId }: { orderId: string }) {
  const { t } = useTranslation('checkout')
  const receipt = useReceipt()
  return (
    <Button
      variant="secondary"
      className="border"
      disabled={receipt.isPending}
      onClick={() =>
        void openInNewTab(() =>
          receipt.mutateAsync(orderId).then((file) => file.pdfUrl),
        ).catch(() => toast.error(t('confirmation.receiptFailed')))
      }
    >
      {t('confirmation.receipt')}
    </Button>
  )
}

const PasswordSchema = z.object({
  password: z
    .string()
    .min(10, { error: message('validation.passwordMinLength') }),
})
type Password = z.infer<typeof PasswordSchema>

/**
 * Guests only: "Keep these in your Library": a password for the order's email
 * (POST /orders/{id}/create-account), then a way to log in.
 */
function KeepInLibrary({
  orderId,
  email,
}: {
  orderId: string
  email: string | undefined
}) {
  const { t } = useTranslation('checkout')
  const create = useCreateAccountFromOrder()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const [created, setCreated] = useState(false)
  const form = useForm<Password>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { password: '' },
  })
  const applyApiError = useApplyApiError(form)

  const submit = form.handleSubmit(({ password }) =>
    create.mutate(
      { id: orderId, password },
      { onSuccess: () => setCreated(true), onError: applyApiError },
    ),
  )

  return (
    <section
      aria-labelledby="keep-library"
      className="rounded-[14px] border border-primary/30 bg-linear-to-br from-primary/14 to-card p-5"
    >
      <h2 id="keep-library" className="mb-1 font-heading text-[17px] font-bold">
        {t('confirmation.keepTitle')}
      </h2>
      {created ? (
        <div className="flex flex-col items-start gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            {t('confirmation.created')}
          </p>
          <Button
            onClick={(event) =>
              openAuth('login', {
                email,
                returnFocusTo: event.currentTarget,
              })
            }
          >
            {t('confirmation.login')}
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-3.5 text-sm leading-normal text-muted-foreground">
            {t('confirmation.keepText')}
          </p>
          <Form {...form}>
            <form
              noValidate
              onSubmit={submit}
              className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-start"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="flex-1 gap-1.5">
                    <FormLabel className="text-[13px] font-semibold">
                      {t('confirmation.password')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('confirmation.passwordPlaceholder')}
                        className="h-[46px] rounded-[10px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={create.isPending}
                className="h-[46px] px-5 sm:mt-[22px]"
              >
                {t('confirmation.create')}
              </Button>
            </form>
          </Form>
        </>
      )}
    </section>
  )
}
