import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

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

function RouteComponent() {
  return <div>Hello "/login"!</div>
}
