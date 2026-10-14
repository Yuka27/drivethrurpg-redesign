import { createFileRoute } from '@tanstack/react-router'

import { CheckoutPage } from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/_focus/checkout')({
  component: CheckoutPage,
})
