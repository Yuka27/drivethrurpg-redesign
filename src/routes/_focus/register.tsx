import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { useMe } from '@/api/me'
import { RegisterPage } from '@/features/auth/register/RegisterPage'
import { safeRedirect } from '@/lib/search-params'

const RegisterSearchSchema = z.object({
  redirect: safeRedirect,
})

export const Route = createFileRoute('/_focus/register')({
  validateSearch: RegisterSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()
  const { redirect } = Route.useSearch()
  const { data: me, isPending } = useMe()
  // decided once, on arrival: someone who registers here becomes logged in
  // too, and must still see the success screen
  const [loggedInOnArrival, setLoggedInOnArrival] = useState<boolean | null>(
    null,
  )

  useEffect(() => {
    if (loggedInOnArrival === null && !isPending) {
      setLoggedInOnArrival(Boolean(me))
    }
  }, [isPending, me, loggedInOnArrival])

  useEffect(() => {
    // redirect is already validated as a same-site path
    if (loggedInOnArrival) router.history.replace(redirect ?? '/')
  }, [loggedInOnArrival, redirect, router])

  if (loggedInOnArrival !== false) return null
  return <RegisterPage redirect={redirect} />
}
