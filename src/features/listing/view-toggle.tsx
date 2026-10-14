import { LayoutGridIcon, ListIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ListingView } from './listing-search'
import { IconTooltip } from '@/components/site/icon-tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const VIEWS = [
  ['grid', LayoutGridIcon],
  ['list', ListIcon],
] as const

/** Cards or rows: the listing's and the wishlist's two views. */
export function ViewToggle({
  view,
  onChange,
}: {
  view: ListingView
  onChange: (view: ListingView) => void
}) {
  const { t } = useTranslation('listing')
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(next) => next && onChange(next as ListingView)}
      aria-label={t('view.label')}
      className="gap-0"
    >
      {VIEWS.map(([value, Icon]) => (
        <IconTooltip key={value} label={t(`view.${value}`)}>
          <ToggleGroupItem
            value={value}
            aria-label={t(`view.${value}`)}
            className="size-7 min-w-7 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Icon aria-hidden />
          </ToggleGroupItem>
        </IconTooltip>
      ))}
    </ToggleGroup>
  )
}
