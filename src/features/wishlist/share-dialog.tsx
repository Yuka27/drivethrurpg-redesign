import { CopyIcon, ShareIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useShareWishlist, useWishlistSettings } from '@/api/wishlist'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useApiError } from '@/i18n/use-api-error'

/**
 * Figma "Share": a dialog to turn the public link on or off
 * (PATCH /wishlist/settings) and copy it. Nothing goes public without the
 * switch.
 */
export function ShareDialog() {
  const { t } = useTranslation('wishlist')
  const apiError = useApiError()
  const [open, setOpen] = useState(false)
  const id = useId()
  const settings = useWishlistSettings(open).data
  const share = useShareWishlist()
  const url = settings?.isPublic ? settings.shareUrl : null

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('shareDialog.copied'))
    } catch {
      toast.error(t('shareDialog.copyFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-lg">
          <ShareIcon aria-hidden />
          {t('share')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans tracking-normal">
            {t('shareDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('shareDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={id} className="text-sm font-medium">
            {t('shareDialog.public')}
          </label>
          <Switch
            id={id}
            checked={settings?.isPublic ?? false}
            disabled={!settings || share.isPending}
            onCheckedChange={(isPublic) =>
              share.mutate(isPublic, {
                onError: (error) => toast.error(apiError(error)),
              })
            }
          />
        </div>
        {url ? (
          <div className="flex gap-2">
            <Input
              readOnly
              value={url}
              aria-label={t('shareDialog.link')}
              onFocus={(event) => event.currentTarget.select()}
              className="h-8 flex-1 rounded-lg"
            />
            <Button
              size="sm"
              className="h-8 rounded-lg"
              onClick={() => void copy()}
            >
              <CopyIcon aria-hidden />
              {t('shareDialog.copy')}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('shareDialog.private')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
