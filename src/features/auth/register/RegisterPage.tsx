import { useRouter } from '@tanstack/react-router'

import { BenefitsPanel } from './BenefitsPanel'
import { RegisterForm } from './RegisterForm'
import { RegisterSuccess } from './RegisterSuccess'
import { useRegisterFlow } from './use-register-flow'

/**
 * Full-page fallback for direct links and ?redirect= (the header opens the modal).
 * Two columns from 1000px (form 460px · benefits 400px, 48px apart, centred);
 * one column below, with the benefits collapsed under the form.
 */
export function RegisterPage({ redirect }: { redirect?: string }) {
  const router = useRouter()
  const { registered, mergedCartItems, onRegistered } = useRegisterFlow()

  return (
    // inside the register views, focus rings use the primary colour
    <div className="min-h-full bg-[radial-gradient(90%_60%_at_100%_0%,color-mix(in_oklch,var(--primary)_9%,transparent),transparent_60%)] px-4 pt-[22px] pb-[34px] [--ring:var(--primary)] min-[1000px]:px-7 min-[1000px]:pt-11 min-[1000px]:pb-14">
      <div className="grid grid-cols-[minmax(0,460px)] items-start justify-center gap-[18px] min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,400px)] min-[1000px]:gap-12">
        {registered ? (
          <RegisterSuccess
            email={registered.email}
            mergedCartItems={mergedCartItems}
            cartHasItems={registered.cartItems > 0}
            redirect={redirect}
          />
        ) : (
          <>
            <RegisterForm
              redirect={redirect}
              onSuccess={(_user, { email }) => onRegistered(email)}
              onSocialSuccess={() => router.history.push(redirect ?? '/')}
            />
            <BenefitsPanel />
          </>
        )}
      </div>
    </div>
  )
}
