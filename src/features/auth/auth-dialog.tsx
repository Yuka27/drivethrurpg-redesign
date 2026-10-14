import { useRouter } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LoginForm } from './login/login-form'
import { ForgotPassword } from './password/forgot-password'
import { ResetPassword } from './password/reset-password'
import { BenefitsPanel } from './register/benefits-panel'
import { RegisterForm } from './register/register-form'
import { RegisterSuccess } from './register/register-success'
import { useRegisterFlow } from './register/use-register-flow'
import { AnimatedHeight } from '@/components/animations/animated-height'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { cn } from '@/lib/utils'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import type { AuthView } from '@/stores/auth-dialog'

/**
 * Switching login ⇄ register runs in steps, so the new layout never flashes
 * half-sized: fade the old view out → resize the width (old view still mounted,
 * invisible) → swap in the new view while the height animates → fade it in.
 * A "glass" shimmer covers the modal meanwhile. Durations match the CSS below;
 * the width and height steps wait 30ms longer than their 250ms transitions, so
 * the next step never starts on a transition's last frame.
 */
const STEP = { fadeOut: 120, width: 280, height: 280, fadeIn: 150 }
type Phase = 'idle' | 'leaving' | 'resizing' | 'swapping' | 'entering'

/**
 * Login, create-account and password-reset modal. Mounted once in the root route;
 * open it with useAuthDialogStore().openAuth('login' | 'register' | 'forgot' | 'reset').
 */
export function AuthDialog() {
  const { t } = useTranslation()
  const open = useAuthDialogStore((state) => state.open)
  const view = useAuthDialogStore((state) => state.view)
  const email = useAuthDialogStore((state) => state.email)
  const resetToken = useAuthDialogStore((state) => state.resetToken)
  const redirectTo = useAuthDialogStore((state) => state.redirectTo)
  const returnFocusTo = useAuthDialogStore((state) => state.returnFocusTo)
  const setOpen = useAuthDialogStore((state) => state.setOpen)
  const showView = useAuthDialogStore((state) => state.showView)
  const close = () => setOpen(false)
  const router = useRouter()
  // signed in: close, then continue to the protected page that asked for login
  const signedIn = () => {
    close()
    if (redirectTo) router.history.push(redirectTo)
  }
  const contentRef = useRef<HTMLDivElement>(null)
  const { registered, mergedCartItems, onRegistered, reset } = useRegisterFlow()
  const reducedMotion = useReducedMotion()

  // the view whose size the modal has: leads the shown view during a switch
  const [sizeView, setSizeView] = useState<AuthView>(view)
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // every opening starts fresh, on the requested view, with no switch in flight
  useEffect(() => {
    if (!open) return
    clearTimers()
    reset()
    setPhase('idle')
    setSizeView(view)
    // only when the modal opens; switches are handled by switchView
  }, [open, reset])
  useEffect(() => clearTimers, [])

  const focusFirstField = () =>
    contentRef.current
      ?.querySelector<HTMLInputElement>('input:not([type=hidden])')
      ?.focus()

  const switchView = useCallback(
    (next: AuthView, options?: { email?: string }) => {
      clearTimers()
      if (reducedMotion) {
        showView(next, options)
        setSizeView(next)
        requestAnimationFrame(focusFirstField)
        return
      }
      const at = (delay: number, step: () => void) =>
        timers.current.push(setTimeout(step, delay))
      let time = 0
      setPhase('leaving')
      at((time += STEP.fadeOut), () => {
        setPhase('resizing')
        setSizeView(next)
      })
      at((time += STEP.width), () => {
        setPhase('swapping')
        showView(next, options)
      })
      at((time += STEP.height), () => setPhase('entering'))
      at((time += STEP.fadeIn), () => {
        setPhase('idle')
        focusFirstField()
      })
    },
    [reducedMotion, showView],
  )

  const twoColumns = sizeView === 'register' && !registered
  const hidden =
    phase === 'leaving' || phase === 'resizing' || phase === 'swapping'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        ref={contentRef}
        showCloseButton={false}
        className={cn(
          'max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-xl bg-card p-0 shadow-sm motion-safe:transition-[max-width] motion-safe:duration-250 motion-safe:ease-out motion-reduce:transition-none',
          sizeView === 'login' && 'sm:max-w-[430px]',
          sizeView === 'register' && 'sm:max-w-[500px]',
          (sizeView === 'forgot' || sizeView === 'reset') && 'sm:max-w-[440px]',
          // 460 form + 48 gap + 400 benefits + 2×30 padding + 2×1 border.
          // The breakpoint is in rem, not px: Tailwind only orders it after
          // `sm:` (also rem) when the units match.
          twoColumns && 'min-[62.5rem]:max-w-[970px]',
        )}
        // opened from the store, not a DialogTrigger: send focus back ourselves
        onCloseAutoFocus={(event) => {
          if (returnFocusTo?.isConnected) {
            event.preventDefault()
            returnFocusTo.focus()
          }
        }}
      >
        {/* hold the height while the old view is hidden and the width changes */}
        <AnimatedHeight frozen={phase === 'leaving' || phase === 'resizing'}>
          <div
            aria-busy={phase !== 'idle' || undefined}
            className={cn(
              'motion-safe:transition-opacity motion-safe:duration-150',
              hidden && 'pointer-events-none opacity-0',
            )}
          >
            {view === 'login' ? (
              <LoginForm
                // remount when "Log in instead" brings a different email
                key={email}
                defaultEmail={email}
                onSuccess={signedIn}
                onSwitchToRegister={() => switchView('register')}
                onForgotPassword={(prefill) =>
                  switchView('forgot', { email: prefill })
                }
              />
            ) : view === 'forgot' || view === 'reset' ? (
              // same padding and focus colour as the register views
              <div className="px-[18px] pt-[22px] pb-5 [--ring:var(--primary)] min-[1000px]:p-[30px]">
                {view === 'forgot' ? (
                  <ForgotPassword
                    key={email}
                    defaultEmail={email}
                    onBackToLogin={(prefill) =>
                      switchView('login', { email: prefill })
                    }
                  />
                ) : (
                  <ResetPassword
                    // a new link (another token) starts over
                    key={resetToken}
                    token={resetToken}
                    onLogin={() => switchView('login')}
                    onRequestNewLink={() => switchView('forgot')}
                  />
                )}
              </div>
            ) : (
              // inside the register views, focus rings use the primary colour
              <div className="px-[18px] pt-[22px] pb-5 [--ring:var(--primary)] min-[1000px]:p-[30px]">
                {registered ? (
                  <RegisterSuccess
                    email={registered.email}
                    mergedCartItems={mergedCartItems}
                    cartHasItems={registered.cartItems > 0}
                    onDone={close}
                  />
                ) : (
                  <div className="grid items-start gap-[18px] min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,400px)] min-[1000px]:gap-12">
                    <RegisterForm
                      onSuccess={(_user, details) =>
                        onRegistered(details.email)
                      }
                      onSocialSuccess={signedIn}
                      onSwitchToLogin={(prefill) =>
                        switchView('login', { email: prefill })
                      }
                      onForgotPassword={(prefill) =>
                        switchView('forgot', { email: prefill })
                      }
                    />
                    <BenefitsPanel />
                  </div>
                )}
              </div>
            )}
          </div>
        </AnimatedHeight>

        {/* "glass" placeholder while the modal changes size */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden rounded-xl bg-card/50 backdrop-blur-sm transition-opacity duration-150',
            phase === 'idle' || phase === 'entering'
              ? 'opacity-0'
              : 'opacity-100',
          )}
        >
          <div className="h-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-foreground/[0.07] to-transparent motion-reduce:hidden" />
        </div>

        {/* Esc and the backdrop close it too, but touch and
            screen-reader users need a visible, labelled way out */}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('actions.close')}
            className="absolute top-3 right-3 text-muted-foreground"
          >
            <XIcon />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
