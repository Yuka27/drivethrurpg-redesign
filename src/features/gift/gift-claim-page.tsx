import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CheckIcon,
  Clock3Icon,
  GiftIcon,
  Link2OffIcon,
  WifiOffIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { ClaimCard, ReadyCard } from './claim-card'
import { GiftPreview, GiftTitles } from './gift-preview'
import { ApiError } from '@/api/client'
import {
  useGift,
  useLookupGift,
  useResendGiftLink,
  useThankSender,
} from '@/api/gifts'
import type { Gift } from '@/api/gifts'
import { useLibraryByTitle } from '@/api/library'
import { useMe } from '@/api/me'
import { LoadingStatus } from '@/components/site/loading-status'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { SUPPORT_URL } from '@/config/links'
import { LibraryButton } from '@/features/account/order-detail-page'
import { FormAlert } from '@/features/auth/shared/form-alert'
import { useFormatDate } from '@/i18n/format'
import { useApiError } from '@/i18n/use-api-error'
import { useApplyApiError } from '@/lib/forms'
import { cn } from '@/lib/utils'

/**
 * /gift/$token (mockup docs/Gift Claim Page — DriveThruRPG.html): what a
 * recipient sees after tapping the link in the gift email. Ready: the gift
 * beside a way to claim it (create an account or log in, or one button when
 * logged in). Then: claimed (by them: the downloads and an optional thank-you;
 * by someone else: what to do), expired (a new link), or a link that does not
 * work (enter the code instead).
 */
export function GiftClaimPage({ token }: { token: string }) {
  const { t } = useTranslation('gift')
  const { t: tCommon } = useTranslation()
  const gift = useGift(token)
  const me = useMe()

  if (gift.isError) {
    const missing = gift.error instanceof ApiError && gift.error.status === 404
    return missing ? (
      <InvalidLink />
    ) : (
      <Centered
        icon={<WifiOffIcon />}
        title={t('loadError')}
        text={t('loadErrorText')}
      >
        <Button
          className="h-11 rounded-[10px] px-5"
          disabled={gift.isFetching}
          aria-busy={gift.isFetching || undefined}
          onClick={() => void gift.refetch()}
        >
          {gift.isFetching && <Spinner />}
          {tCommon('actions.tryAgain')}
        </Button>
      </Centered>
    )
  }
  if (!gift.data || me.isPending) return <GiftSkeleton />

  const data = gift.data
  switch (data.state) {
    case 'claimed':
      return data.claimedByCurrentUser ? (
        <Claimed gift={data} token={token} />
      ) : (
        <ClaimedElsewhere gift={data} />
      )
    case 'expired':
      return <Expired gift={data} token={token} />
    case 'ready':
      return (
        <div className="mx-auto grid max-w-[960px] items-start gap-[22px] px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-10 lg:py-11">
          <h1 className="sr-only">{t('heading')}</h1>
          <GiftPreview gift={data} />
          {me.data ? (
            <ReadyCard gift={data} token={token} me={me.data} />
          ) : (
            <ClaimCard gift={data} token={token} />
          )}
        </div>
      )
  }
}

/** Mockup "center": an icon in a circle, a heading, a line, then actions. */
function Centered({
  icon,
  ok,
  title,
  text,
  children,
}: {
  icon: ReactNode
  ok?: boolean
  title: string
  text?: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center px-4 py-8 text-center lg:py-11">
      <span
        aria-hidden
        className={cn(
          'mb-[18px] grid size-[84px] place-items-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-10 [&_svg]:stroke-[1.6]',
          ok && 'bg-success/22 text-success',
        )}
      >
        {icon}
      </span>
      <h1 className="mb-2 font-heading text-[27px] leading-tight font-extrabold text-balance">
        {title}
      </h1>
      {text && (
        <p className="mb-[22px] max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
          {text}
        </p>
      )}
      {children}
    </div>
  )
}

const fine = 'mt-3 text-xs leading-normal text-muted-foreground'

/** Claimed by this account: the downloads, the library, an optional thank-you. */
function Claimed({ gift, token }: { gift: Gift; token: string }) {
  const { t } = useTranslation('gift')
  const library = useLibraryByTitle().data
  const name = gift.from.displayName

  return (
    <Centered
      ok
      icon={<CheckIcon />}
      title={t('done.title')}
      text={t('done.text', { name, count: gift.titles.length })}
    >
      <div className="mb-[22px] w-full">
        <GiftTitles
          gift={gift}
          className="bg-card"
          action={(title) => {
            const item = library?.get(title.id)
            return item ? (
              <LibraryButton item={item} title={title.name} />
            ) : null
          }}
        />
      </div>
      <Button asChild className="h-11 rounded-[10px] px-5">
        <Link to="/library">{t('done.library')}</Link>
      </Button>
      <ThankYou token={token} name={name} />
    </Centered>
  )
}

const ThanksSchema = z.object({ message: z.string().trim().max(500) })

/** "Say thanks": optional, below the rest (POST /gifts/{token}/thank-you). */
function ThankYou({ token, name }: { token: string; name: string }) {
  const { t } = useTranslation('gift')
  const thank = useThankSender(token)
  const [sent, setSent] = useState(false)
  const form = useForm<z.infer<typeof ThanksSchema>>({
    resolver: zodResolver(ThanksSchema),
    defaultValues: { message: '' },
  })
  const applyApiError = useApplyApiError(form)

  return (
    <section
      aria-labelledby="thanks-title"
      className="mt-[22px] w-full rounded-[14px] border bg-card p-[18px] text-left"
    >
      <h2 id="thanks-title" className="mb-1 font-sans text-base font-bold">
        {t('done.thanksTitle', { name })}
      </h2>
      {sent ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t('done.thanksSent', { name })}
        </p>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-muted-foreground">
            {t('done.thanksHint')}
          </p>
          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit(({ message }) =>
                thank.mutate(message, {
                  onSuccess: () => setSent(true),
                  onError: applyApiError,
                }),
              )}
              className="flex flex-col items-start gap-3"
            >
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="w-full gap-1.5">
                    <FormLabel className="sr-only">
                      {t('done.thanksLabel')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder={t('done.thanksPlaceholder')}
                        className="rounded-[10px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root?.server && (
                <FormAlert className="mb-0 w-full">
                  {form.formState.errors.root.server.message}
                </FormAlert>
              )}
              <Button
                type="submit"
                variant="secondary"
                disabled={thank.isPending}
                aria-busy={thank.isPending || undefined}
                className="border"
              >
                {thank.isPending && <Spinner />}
                {t(
                  thank.isPending ? 'done.thanksSending' : 'done.thanksSubmit',
                )}
              </Button>
            </form>
          </Form>
        </>
      )}
    </section>
  )
}

/** Claimed by someone else: what happened, and both ways on. */
function ClaimedElsewhere({ gift }: { gift: Gift }) {
  const { t } = useTranslation('gift')
  const formatDate = useFormatDate({ month: 'short', day: 'numeric' })
  return (
    <Centered
      icon={<GiftIcon />}
      title={t('claimed.title')}
      text={
        gift.claimedAt
          ? t('claimed.text', { date: formatDate(gift.claimedAt) })
          : undefined
      }
    >
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button asChild className="h-11 rounded-[10px] px-5">
          <Link to="/library">{t('claimed.library')}</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          className="h-11 rounded-[10px] border px-5"
        >
          <a href={SUPPORT_URL}>{t('claimed.support')}</a>
        </Button>
      </div>
      <p className={fine}>{t('claimed.fine')}</p>
    </Centered>
  )
}

/** "p•••••@example.com": enough to recognise, not to read. */
export const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')
  return domain ? `${local.slice(0, 1)}•••••@${domain}` : email
}

/** Expired: one click sends a fresh link to the gift's (masked) email. */
function Expired({ gift, token }: { gift: Gift; token: string }) {
  const { t } = useTranslation('gift')
  const apiError = useApiError()
  const resend = useResendGiftLink(token)
  const [sent, setSent] = useState(false)

  return (
    <Centered
      icon={<Clock3Icon />}
      title={t('expired.title')}
      text={t('expired.text')}
    >
      {sent ? (
        <p role="status" className="font-semibold text-success">
          {t('expired.sent')}
        </p>
      ) : (
        <Button
          className="h-11 rounded-[10px] px-5"
          disabled={resend.isPending}
          aria-busy={resend.isPending || undefined}
          onClick={() =>
            resend.mutate(undefined, {
              onSuccess: () => setSent(true),
              onError: (error) => toast.error(apiError(error)),
            })
          }
        >
          {resend.isPending && <Spinner />}
          {t(resend.isPending ? 'expired.resending' : 'expired.resend')}
        </Button>
      )}
      {gift.to.email && (
        <p className={fine}>
          {t('expired.fine', {
            email: maskEmail(gift.to.email),
            name: gift.from.displayName,
          })}
        </p>
      )}
    </Centered>
  )
}

const CodeSchema = z.object({ code: z.string().trim().min(1) })

/** A link that does not open: enter the code from the email instead. */
function InvalidLink() {
  const { t } = useTranslation('gift')
  const navigate = useNavigate()
  const apiError = useApiError()
  const lookup = useLookupGift()
  const form = useForm<z.infer<typeof CodeSchema>>({
    resolver: zodResolver(CodeSchema),
    defaultValues: { code: '' },
  })

  return (
    <Centered
      icon={<Link2OffIcon />}
      title={t('invalid.title')}
      text={t('invalid.text')}
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(({ code }) =>
            lookup.mutate(code.toUpperCase(), {
              onSuccess: ({ token }) =>
                void navigate({
                  to: '/gift/$token',
                  params: { token },
                  replace: true,
                }),
              // gift_not_found: under the field
              onError: (error) =>
                form.setError(
                  'code',
                  { message: apiError(error) },
                  { shouldFocus: true },
                ),
            }),
          )}
          className="flex w-full flex-col gap-3 rounded-2xl border bg-card p-[26px] text-left"
        >
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <FormLabel className="text-[13px] font-semibold">
                  {t('invalid.code')}
                </FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="GIFT-XXXX-XXXX"
                    className="h-[46px] rounded-[10px] text-[15px] md:text-[15px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={lookup.isPending}
            aria-busy={lookup.isPending || undefined}
            className="h-12 rounded-[10px] text-[15px] font-bold"
          >
            {lookup.isPending && <Spinner />}
            {t(lookup.isPending ? 'invalid.finding' : 'invalid.find')}
          </Button>
        </form>
      </Form>
      <p className={fine}>
        <Trans
          t={t}
          i18nKey="invalid.stuck"
          components={{
            support: (
              <a
                href={SUPPORT_URL}
                className="font-semibold text-primary hover:underline"
              />
            ),
          }}
        />
      </p>
    </Centered>
  )
}

/** The gift and the claim card's outline while the gift loads. */
function GiftSkeleton() {
  return (
    <div className="mx-auto grid max-w-[960px] items-start gap-10 px-4 py-11 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <LoadingStatus />
      <div
        aria-hidden
        className="flex flex-col gap-3 rounded-[18px] border border-muted bg-card p-7"
      >
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-20 rounded-r-[10px]" />
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="aspect-[3/4] w-12" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden className="flex flex-col gap-4 rounded-2xl bg-card p-6">
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
    </div>
  )
}
