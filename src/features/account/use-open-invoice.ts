import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { openInNewTab } from '@/lib/open-in-new-tab'
import { useReceipt } from '@/api/orders'

/** "Invoice" / "Download invoice (PDF)": opens the order's receipt PDF in a new tab. */
export function useOpenInvoice() {
  const { t } = useTranslation('account')
  const receipt = useReceipt()
  return {
    open: (orderId: string) =>
      openInNewTab(() =>
        receipt.mutateAsync(orderId).then(({ pdfUrl }) => pdfUrl),
      ).catch(() => toast.error(t('orders.invoiceFailed'))),
    pending: receipt.isPending,
  }
}
