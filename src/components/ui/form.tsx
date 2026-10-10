// shadcn/ui form (react-hook-form), adapted:
// - error messages may be translation keys (from Zod schemas) and are translated here
// - aria-describedby only references a description/message that is actually rendered
// - FormRootError: live region for form-wide errors (form.setError('root.server', …))
import * as React from 'react'
import type { Label as LabelPrimitive } from 'radix-ui'
import { Slot } from 'radix-ui'
import { useTranslation } from 'react-i18next'
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
} from 'react-hook-form'
import type { ControllerProps, FieldPath, FieldValues } from 'react-hook-form'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

type FormItemContextValue = {
  id: string
  hasDescription: boolean
  setHasDescription: (value: boolean) => void
}

const FormItemContext = React.createContext<FormItemContextValue | null>(null)

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  if (!fieldContext || !itemContext) {
    throw new Error(
      'useFormField should be used within <FormField> and <FormItem>',
    )
  }
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)
  const { id, hasDescription, setHasDescription } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    hasDescription,
    setHasDescription,
    ...fieldState,
  }
}

/** Zod messages are translation keys ("validation.emailInvalid"); API messages arrive translated. */
function useErrorText(message: string | undefined) {
  const { i18n } = useTranslation()
  if (!message) return ''
  return i18n.exists(message)
    ? (i18n.t as (key: string) => string)(message)
    : message
}

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()
  const [hasDescription, setHasDescription] = React.useState(false)

  return (
    <FormItemContext.Provider value={{ id, hasDescription, setHasDescription }}>
      <div
        data-slot="form-item"
        className={cn('grid gap-2', className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      className={className}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const {
    error,
    formItemId,
    formDescriptionId,
    formMessageId,
    hasDescription,
  } = useFormField()
  const describedBy = [
    hasDescription && formDescriptionId,
    error && formMessageId,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={describedBy || undefined}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  )
}

/** asChild renders the description as its child element (e.g. a requirements <ul>). */
function FormDescription({
  className,
  asChild,
  ...props
}: React.ComponentProps<'p'> & { asChild?: boolean }) {
  const { formDescriptionId, setHasDescription } = useFormField()
  const Comp = asChild ? Slot.Root : 'p'

  React.useEffect(() => {
    setHasDescription(true)
    return () => setHasDescription(false)
  }, [setHasDescription])

  return (
    <Comp
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

function FormMessage({
  className,
  icon,
  children,
  ...props
}: React.ComponentProps<'p'> & { icon?: React.ReactNode }) {
  const { error, formMessageId } = useFormField()
  const errorText = useErrorText(error?.message)
  const body = errorText || children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn(
        'text-xs text-destructive',
        icon && 'flex items-start gap-1.5',
        className,
      )}
      {...props}
    >
      {icon}
      {icon ? <span>{body}</span> : body}
    </p>
  )
}

/**
 * Form-wide error (wrong password, network failure…), set with
 * form.setError('root.server', { message }). Always rendered, so screen readers
 * announce it when it changes.
 */
function FormRootError({ className, ...props }: React.ComponentProps<'div'>) {
  const { errors } = useFormState()
  // typed as always present, but absent until form.setError('root.server', …)
  const serverError = errors.root?.server
  const errorText = useErrorText(serverError?.message)

  return (
    <div
      data-slot="form-root-error"
      aria-live="polite"
      className={cn('text-sm text-destructive empty:hidden', className)}
      {...props}
    >
      {errorText}
    </div>
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormRootError,
  FormField,
}
