import { XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LoginForm } from './login-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthDialogStore } from '@/stores/auth-dialog'

/** Mounted once in the root route; open it with useAuthDialogStore().openLogin(). */
export function LoginDialog() {
  const { t } = useTranslation()
  const open = useAuthDialogStore((state) => state.open)
  const setOpen = useAuthDialogStore((state) => state.setOpen)
  const returnFocusTo = useAuthDialogStore((state) => state.returnFocusTo)
  const close = () => setOpen(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* the content unmounts on close, so every opening starts with a fresh form */}
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-xl bg-card p-0 shadow-sm sm:max-w-[430px]"
        // opened from the store, not a DialogTrigger: send focus back ourselves
        onCloseAutoFocus={(event) => {
          if (returnFocusTo?.isConnected) {
            event.preventDefault()
            returnFocusTo.focus()
          }
        }}
      >
        <LoginForm
          Title={DialogTitle}
          Description={DialogDescription}
          onSuccess={close}
          onNavigate={close}
        />
        {/* not in Figma: Esc and the backdrop close it too, but touch and
            screen-reader users need a visible, labelled way out */}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('actions.close')}
            className="absolute top-4 right-4 text-muted-foreground"
          >
            <XIcon />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
