import { useTranslation } from 'react-i18next'

/**
 * Says "Loading…" to screen readers while skeletons (hidden from them) stand
 * in for the content. Put one per loading region, not one per skeleton.
 */
export function LoadingStatus({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <p role="status" className="sr-only">
      {label ?? t('status.loading')}
    </p>
  )
}
