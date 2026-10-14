import { useTranslation } from 'react-i18next'

import type { SocialProvider } from '@/api/auth'
import facebookIcon from '@/assets/social/facebook.png'
import googleIcon from '@/assets/social/google.png'
import roll20Icon from '@/assets/social/roll20.png'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

// brand names are never translated
const PROVIDERS: Record<SocialProvider, { name: string; icon: string }> = {
  roll20: { name: 'Roll20', icon: roll20Icon },
  google: { name: 'Google', icon: googleIcon },
  facebook: { name: 'Facebook', icon: facebookIcon },
}

type SocialButtonsProps = {
  /**
   * stacked (login, Figma): Roll20 full width, then Google · Facebook.
   * row (register, mockup): Google · Facebook · Roll20 in three columns,
   * which still fit on one row at 360px.
   */
  layout: 'stacked' | 'row'
  disabled?: boolean
  /** the provider signing in: its button spins */
  pending?: SocialProvider
  onSelect: (provider: SocialProvider, name: string) => void
}

/** "Continue with" buttons for Roll20, Google and Facebook, shared by login and register. */
export function SocialButtons({
  layout,
  disabled,
  pending,
  onSelect,
}: SocialButtonsProps) {
  const { t } = useTranslation('auth')
  const button = (provider: SocialProvider, longLabelOnMobile = false) => (
    <SocialButton
      key={provider}
      provider={provider}
      layout={layout}
      longLabelOnMobile={longLabelOnMobile}
      disabled={disabled}
      pending={pending === provider}
      onSelect={onSelect}
    />
  )

  if (layout === 'row') {
    return (
      <div
        role="group"
        aria-label={t('register.socialGroup')}
        className="grid grid-cols-3 gap-2.5"
      >
        {(['google', 'facebook', 'roll20'] as const).map((p) => button(p))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Figma: "Continue with Roll20" on mobile, just "Roll20" on desktop */}
      {button('roll20', true)}
      <div className="flex gap-2">
        {button('google')}
        {button('facebook')}
      </div>
    </div>
  )
}

function SocialButton({
  provider,
  layout,
  longLabelOnMobile,
  disabled,
  pending,
  onSelect,
}: {
  provider: SocialProvider
  layout: SocialButtonsProps['layout']
  longLabelOnMobile: boolean
  disabled?: boolean
  pending: boolean
  onSelect: SocialButtonsProps['onSelect']
}) {
  const { t } = useTranslation('auth')
  const { name, icon } = PROVIDERS[provider]
  const label = t('login.continueWith', { provider: name })

  return (
    <Button
      type="button"
      // login follows Figma (outline, 36px); register follows the mockup (filled, 44px)
      variant={layout === 'row' ? 'secondary' : 'outline'}
      disabled={disabled}
      aria-busy={pending || undefined}
      onClick={() => onSelect(provider, name)}
      // the visible text ("Google") is part of the name, as WCAG 2.5.3 requires
      aria-label={label}
      className={cn(
        layout === 'row'
          ? 'h-11 gap-1.5 rounded-[10px] border border-border px-1 text-[0.8rem] font-semibold hover:border-foreground/35 sm:gap-2 sm:px-2 sm:text-[0.86rem]'
          : 'h-11 flex-1 gap-1',
      )}
    >
      {pending ? (
        <Spinner className={layout === 'row' ? 'size-5' : 'size-4'} />
      ) : (
        <img
          src={icon}
          alt=""
          width={layout === 'row' ? 20 : 16}
          height={layout === 'row' ? 20 : 16}
          className={
            layout === 'row' ? 'size-5 rounded-full' : 'size-4 rounded-xs'
          }
        />
      )}
      {longLabelOnMobile ? (
        <>
          <span className="sm:hidden h-7 text-sm/7">{label}</span>
          <span className="hidden sm:inline h-7 text-sm/7">{name}</span>
        </>
      ) : (
        name
      )}
    </Button>
  )
}
