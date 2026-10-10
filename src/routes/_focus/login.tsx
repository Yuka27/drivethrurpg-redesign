import { createFileRoute, useRouter } from '@tanstack/react-router'
import { z } from 'zod'

import { LoginForm } from '@/features/auth/login/login-form'
import { prefillEmail, safeRedirect } from '@/lib/search-params'

const LoginSearchSchema = z.object({
  redirect: safeRedirect,
  email: prefillEmail,
})

export const Route = createFileRoute('/_focus/login')({
  validateSearch: LoginSearchSchema,
  component: RouteComponent,
})

/** Full-page login for direct links and ?redirect= from protected pages; the header opens the modal instead. */
function RouteComponent() {
  const router = useRouter()
  const { redirect, email } = Route.useSearch()

  return (
    <div className="container flex justify-center py-10">
      <div className="w-full max-w-[430px] rounded-xl border bg-card shadow-sm">
        <LoginForm
          defaultEmail={email}
          // redirect is already validated as a same-site path
          onSuccess={() => router.history.push(redirect ?? '/')}
        />
      </div>
    </div>
  )
}
