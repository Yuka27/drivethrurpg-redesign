import { createFileRoute, useRouter } from '@tanstack/react-router'
import { z } from 'zod'

import { LoginForm } from '@/components/auth/login-form'

const LoginSearchSchema = z.object({
  // only same-site paths: blocks open redirects like ?redirect=https://evil.example or //evil.example
  redirect: z
    .string()
    .startsWith('/')
    .refine((path) => !path.startsWith('//'))
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_focus/login')({
  validateSearch: LoginSearchSchema,
  component: RouteComponent,
})

/** Full-page login for direct links and ?redirect= from protected pages; the header opens the modal instead. */
function RouteComponent() {
  const router = useRouter()
  const { redirect } = Route.useSearch()

  return (
    <div className="container flex justify-center py-10">
      <div className="w-full max-w-[430px] rounded-xl border bg-card shadow-sm">
        <LoginForm
          // redirect is already validated as a same-site path
          onSuccess={() => router.history.push(redirect ?? '/')}
        />
      </div>
    </div>
  )
}
