import { Link } from '@tanstack/react-router'
import { GiftIcon } from 'lucide-react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { COUNTRIES, PAYMENT_METHODS } from './checkout-schema'
import type { CheckoutForm, PaymentMethodKind } from './checkout-schema'
import type { Address, PaymentMethod } from '@/api/account'
import type { Cart } from '@/api/cart'
import type { ShippingRate } from '@/api/checkout'
import type { Me } from '@/api/me'
import { UserAvatar } from '@/components/site/user-avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { brandName } from '@/features/account/card-brand'
import { useFormatMoney, useRegionName } from '@/i18n/format'
import { cn } from '@/lib/utils'

/** Mockup: inputs 46px tall, 10px corners. */
const inputClass = 'h-[46px] rounded-[10px] text-[15px] md:text-[15px]'
const linkButton =
  'ml-auto shrink-0 text-[13px] text-muted-foreground underline hover:text-foreground'

/** Mockup "sec2": a numbered card. */
export function Section({
  number,
  title,
  children,
}: {
  number?: number
  title?: string
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col rounded-[14px] border bg-card p-[22px]"
    >
      {title && (
        <h2 className="mb-3.5 flex items-center gap-2.5 font-heading text-[17px] font-bold">
          {number !== undefined && (
            <span
              aria-hidden
              className="grid size-6 place-items-center rounded-full bg-secondary text-xs"
            >
              {number}
            </span>
          )}
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

/** Mockup "saved": a one-line summary of saved details, with a change link. */
function SavedRow({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-secondary px-3.5 py-3 text-sm">
      {children}
      {action}
    </div>
  )
}

function TextField({
  name,
  label,
  className,
  hint,
  ...input
}: {
  name: Parameters<typeof FormField<CheckoutForm>>[0]['name']
  label: string
  className?: string
  hint?: string
} & Omit<React.ComponentProps<typeof Input>, 'name'>) {
  const { control } = useFormContext<CheckoutForm>()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('gap-1.5', className)}>
          <FormLabel className="text-[13px] font-semibold">{label}</FormLabel>
          <FormControl>
            <Input
              {...input}
              {...field}
              value={field.value as string}
              className={inputClass}
            />
          </FormControl>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** 1. Contact: the email for a guest; who is buying, for an account. */
export function ContactSection({
  number,
  me,
  onLogin,
  onLogout,
}: {
  number: number
  me: Me | undefined
  onLogin: (trigger: HTMLElement) => void
  onLogout: () => void
}) {
  const { t } = useTranslation('checkout')
  return (
    <Section number={number} title={t('sections.contact')}>
      {me ? (
        <SavedRow
          action={
            <button type="button" className={linkButton} onClick={onLogout}>
              {t('contact.notYou')}
            </button>
          }
        >
          <UserAvatar user={me} className="size-9" />
          <div className="min-w-0">
            <p className="truncate font-bold">{me.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{me.email}</p>
          </div>
        </SavedRow>
      ) : (
        <div className="flex flex-col gap-2.5">
          <TextField
            name="email"
            label={t('contact.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('contact.emailPlaceholder')}
            hint={t('contact.emailHint')}
          />
          <p className="text-sm text-muted-foreground">
            {t('contact.haveAccount')}{' '}
            <button
              type="button"
              aria-haspopup="dialog"
              className="font-semibold text-primary hover:underline"
              onClick={(event) => onLogin(event.currentTarget)}
            >
              {t('contact.login')}
            </button>{' '}
            {t('contact.loginRest')}
          </p>
        </div>
      )}
    </Section>
  )
}

/** Country, names, street, postal code and city, under `name`. */
function AddressFieldset({ name }: { name: 'billing' | 'shipping' }) {
  const { t } = useTranslation('checkout')
  const regionName = useRegionName()
  const { control } = useFormContext<CheckoutForm>()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField
        control={control}
        name={`${name}.country`}
        render={({ field }) => (
          <FormItem className="gap-1.5 sm:col-span-2">
            <FormLabel className="text-[13px] font-semibold">
              {t('address.country')}
            </FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className={cn(inputClass, 'w-full')}>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {COUNTRIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {regionName(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField
        name={`${name}.firstName`}
        label={t('address.firstName')}
        autoComplete={`${name} given-name`}
      />
      <TextField
        name={`${name}.lastName`}
        label={t('address.lastName')}
        autoComplete={`${name} family-name`}
      />
      <TextField
        name={`${name}.line1`}
        label={t('address.line1')}
        autoComplete={`${name} address-line1`}
        className="sm:col-span-2"
      />
      <TextField
        name={`${name}.postalCode`}
        label={t('address.postalCode')}
        autoComplete={`${name} postal-code`}
      />
      <TextField
        name={`${name}.city`}
        label={t('address.city')}
        autoComplete={`${name} address-level2`}
      />
    </div>
  )
}

const oneLine = (address: Address, regionName: (code: string) => string) =>
  [
    address.line1,
    address.line2,
    `${address.postalCode} ${address.city}`,
    regionName(address.country),
  ]
    .filter(Boolean)
    .join(', ')

/**
 * 2. Billing (and shipping) address: an account's default address as one
 * line ("Change" lists the others and a new one); otherwise the fields, with
 * "ship the printed items here" when something ships.
 */
export function AddressSection({
  number,
  saved,
  requiresShipping,
}: {
  number: number
  saved: Array<Address>
  requiresShipping: boolean
}) {
  const { t } = useTranslation('checkout')
  const regionName = useRegionName()
  const { control, setValue } = useFormContext<CheckoutForm>()
  const savedAddressId = useWatch({ control, name: 'savedAddressId' })
  const shipToBilling = useWatch({ control, name: 'shipToBilling' })
  const [choosing, setChoosing] = useState(false)
  const chosen = saved.find((address) => address.id === savedAddressId)

  return (
    <Section
      number={number}
      title={t(requiresShipping ? 'sections.address' : 'sections.billing')}
    >
      {chosen && !choosing ? (
        <SavedRow
          action={
            <button
              type="button"
              className={linkButton}
              onClick={() => setChoosing(true)}
            >
              {t('address.change')}
            </button>
          }
        >
          <div className="min-w-0">
            <p className="font-bold">{chosen.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {oneLine(chosen, regionName)}
            </p>
          </div>
        </SavedRow>
      ) : (
        <div className="flex flex-col gap-3">
          {saved.length > 0 && (
            <RadioGroupPrimitive.Root
              aria-label={t('address.saved')}
              value={savedAddressId || 'new'}
              onValueChange={(value) => {
                setValue('savedAddressId', value === 'new' ? '' : value)
                if (value !== 'new') setChoosing(false)
              }}
              className="grid gap-2"
            >
              {[...saved.map((address) => address.id), 'new'].map((id) => {
                const address = saved.find((item) => item.id === id)
                return (
                  <RadioGroupPrimitive.Item
                    key={id}
                    value={id}
                    className={radioCard}
                  >
                    <RadioDot />
                    <span className="min-w-0 text-left">
                      {address ? (
                        <>
                          <span className="block font-semibold">
                            {address.fullName}
                          </span>
                          <small className="block text-xs text-muted-foreground">
                            {oneLine(address, regionName)}
                          </small>
                        </>
                      ) : (
                        t('address.useNew')
                      )}
                    </span>
                  </RadioGroupPrimitive.Item>
                )
              })}
            </RadioGroupPrimitive.Root>
          )}
          {!savedAddressId && <AddressFieldset name="billing" />}
        </div>
      )}

      {requiresShipping && !savedAddressId && (
        <>
          <FormField
            control={control}
            name="shipToBilling"
            render={({ field }) => (
              <FormItem className="mt-2.5 flex-row items-center gap-2.5">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal text-muted-foreground">
                  {t('address.shipHere')}
                </FormLabel>
              </FormItem>
            )}
          />
          {!shipToBilling && (
            <div className="mt-4 flex flex-col gap-3 border-t pt-4">
              <h3 className="font-heading text-[15px] font-bold">
                {t('sections.shipping')}
              </h3>
              <AddressFieldset name="shipping" />
            </div>
          )}
        </>
      )}
    </Section>
  )
}

const radioCard =
  'group flex items-center gap-3 rounded-[10px] border px-3.5 py-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/8'

function RadioDot() {
  return (
    <span
      aria-hidden
      className="grid size-4 shrink-0 place-items-center rounded-full border border-input group-data-[state=checked]:border-primary"
    >
      <span className="size-2 rounded-full bg-primary opacity-0 group-data-[state=checked]:opacity-100" />
    </span>
  )
}

/** 3. Delivery (printed items only): the rates, each changing the total at once. */
export function DeliverySection({
  number,
  rates,
  value,
  pending,
  onChange,
}: {
  number: number
  rates: Array<ShippingRate>
  value: string | undefined
  pending: boolean
  onChange: (rateId: string) => void
}) {
  const { t } = useTranslation('checkout')
  const formatMoney = useFormatMoney()
  return (
    <Section number={number} title={t('sections.delivery')}>
      <RadioGroupPrimitive.Root
        aria-label={t('sections.delivery')}
        value={value}
        onValueChange={onChange}
        disabled={pending}
        className="grid gap-2"
      >
        {rates.map((rate) => (
          <RadioGroupPrimitive.Item
            key={rate.id}
            value={rate.id}
            className={radioCard}
          >
            <RadioDot />
            <span className="text-left">
              {rate.label}
              {rate.eta && (
                <small className="block text-xs text-muted-foreground">
                  {rate.eta}
                </small>
              )}
            </span>
            <span className="ml-auto font-semibold">
              {formatMoney(rate.price)}
            </span>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      <p className="mt-3 text-xs text-muted-foreground">{t('delivery.hint')}</p>
    </Section>
  )
}

/**
 * 4. Payment: card, PayPal or Apple Pay. An account's default card shows as
 * one line ("Use another" for a new one). There is no payment provider in
 * this redesign: the card fields stand in for its form.
 */
export function PaymentSection({
  number,
  savedCards,
}: {
  number: number
  savedCards: Array<PaymentMethod>
}) {
  const { t } = useTranslation('checkout')
  const { control, setValue } = useFormContext<CheckoutForm>()
  const method = useWatch({ control, name: 'method' })
  const savedCardId = useWatch({ control, name: 'savedCardId' })
  const card = savedCards.find((item) => item.id === savedCardId)
  const label: Record<PaymentMethodKind, string> = {
    card: t('payment.card'),
    paypal: t('payment.paypal'),
    apple_pay: t('payment.applePay'),
  }

  return (
    <Section number={number} title={t('sections.payment')}>
      <FormField
        control={control}
        name="method"
        render={({ field }) => (
          <RadioGroupPrimitive.Root
            aria-label={t('payment.methods')}
            value={field.value}
            onValueChange={field.onChange}
            className="mb-4 grid grid-cols-3 gap-2"
          >
            {PAYMENT_METHODS.map((kind) => (
              <RadioGroupPrimitive.Item
                key={kind}
                value={kind}
                className="min-h-[46px] rounded-[10px] border bg-secondary px-2 py-3 text-sm font-semibold text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary/14 data-[state=checked]:text-foreground"
              >
                {label[kind]}
              </RadioGroupPrimitive.Item>
            ))}
          </RadioGroupPrimitive.Root>
        )}
      />

      {method !== 'card' ? (
        <p className="text-sm text-muted-foreground">
          {t('payment.redirect', { provider: label[method] })}
        </p>
      ) : card ? (
        <SavedRow
          action={
            <button
              type="button"
              className={linkButton}
              onClick={() => setValue('savedCardId', '')}
            >
              {t('payment.useAnother')}
            </button>
          }
        >
          <span className="rounded-[5px] border px-1.5 py-0.5 text-xs font-extrabold uppercase">
            {brandName(card.brand)}
          </span>
          <div>
            <p className="font-bold">
              {t('payment.savedCard', {
                brand: brandName(card.brand),
                last4: card.last4,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('payment.expires', {
                date: `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`,
              })}
            </p>
          </div>
        </SavedRow>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              name="card.number"
              label={t('payment.cardNumber')}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              className="col-span-2"
            />
            <TextField
              name="card.expiry"
              label={t('payment.expiry')}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder={t('payment.expiryPlaceholder')}
            />
            <TextField
              name="card.cvc"
              label={t('payment.cvc')}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={t('payment.cvcPlaceholder')}
            />
          </div>
          {savedCards.length > 0 && (
            <button
              type="button"
              className="self-start text-[13px] text-muted-foreground underline hover:text-foreground"
              onClick={() =>
                setValue(
                  'savedCardId',
                  (savedCards.find((item) => item.isDefault) ?? savedCards[0])
                    .id,
                )
              }
            >
              {t('payment.useSaved')}
            </button>
          )}
        </div>
      )}
    </Section>
  )
}

/** Mockup "giftrow": whether it is a gift; that is decided in the cart. */
export function GiftRow({ gift }: { gift: Cart['gift'] }) {
  const { t } = useTranslation('checkout')
  const on = gift.enabled && gift.recipientEmail
  return (
    <Section>
      <div className="flex items-center gap-3 text-sm">
        <GiftIcon aria-hidden className="size-6 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-bold">
            {on ? t('gift.on', { email: gift.recipientEmail }) : t('gift.none')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(on ? 'gift.onHint' : 'gift.noneHint')}
          </p>
        </div>
        <Link to="/cart" className={linkButton}>
          {t(on ? 'gift.change' : 'gift.make')}
        </Link>
      </div>
    </Section>
  )
}
