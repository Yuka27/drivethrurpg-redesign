import { useCallback } from 'react'
import type { ParseKeys } from 'i18next'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

import { ApiError } from '@/api/client'
import { useApiError } from '@/i18n/use-api-error'

/**
 * Zod error messages are translation keys, translated by <FormMessage>.
 * This keeps the key type-checked: z.email({ error: message('validation.emailInvalid') }).
 */
export const message = (key: ParseKeys<'common'>) => key

/**
 * Put an API error where the user will see it: on the field the API names
 * (error.field, e.g. "email") when the form has it, otherwise form-wide (<FormRootError>).
 */
export function useApplyApiError<T extends FieldValues>(
  form: UseFormReturn<T>,
) {
  const apiError = useApiError()
  return useCallback(
    (error: unknown) => {
      const text = apiError(error)
      const field = error instanceof ApiError ? error.field : undefined
      if (field && field in form.getValues()) {
        form.setError(
          field as Path<T>,
          { message: text },
          { shouldFocus: true },
        )
      } else {
        form.setError('root.server', { message: text })
      }
    },
    [apiError, form],
  )
}
