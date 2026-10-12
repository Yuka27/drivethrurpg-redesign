import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

/**
 * For buttons in the design whose flow is not built yet (add address, add card,
 * connect a provider, merge accounts, manage keys, redeem a gift card): say so
 * instead of doing nothing. Replace each use when its flow exists.
 */
export function useComingSoon() {
  const { t } = useTranslation('account')
  return useCallback(() => toast.info(t('comingSoon')), [t])
}
