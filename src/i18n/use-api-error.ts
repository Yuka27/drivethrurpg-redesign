import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { enResources } from './resources'
import { ApiError } from '@/api/client'

type ErrorCode = keyof typeof enResources.common.errors

const isKnownCode = (code: string): code is ErrorCode =>
  code in enResources.common.errors

/**
 * Turns any thrown error into a message for the user: our translation of the
 * API error code when we have one, the API's own message as a fallback, and a
 * generic message for network errors and anything unexpected.
 */
export function useApiError() {
  const { t } = useTranslation()
  return useCallback(
    (error: unknown) => {
      if (error instanceof ApiError) {
        if (isKnownCode(error.code)) return t(`errors.${error.code}`)
        if (error.message) return error.message
      }
      return t('errors.generic')
    },
    [t],
  )
}
