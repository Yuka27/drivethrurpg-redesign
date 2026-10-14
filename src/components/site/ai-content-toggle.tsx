import { useTranslation } from 'react-i18next'

import { IconTooltip } from './icon-tooltip'
import { Toggle } from '@/components/ui/toggle'
import { usePreferencesStore } from '@/stores/preferences'

/** Desktop header "AI" toggle: greyed when off, red border and text when on. */
export function AiContentToggle() {
  const { t } = useTranslation()
  const aiContent = usePreferencesStore((state) => state.aiContent)
  const setAiContent = usePreferencesStore((state) => state.setAiContent)

  return (
    <IconTooltip
      label={t(
        aiContent ? 'header.aiContent.shown' : 'header.aiContent.hidden',
      )}
    >
      <Toggle
        variant="outline"
        size="sm"
        pressed={aiContent}
        onPressedChange={setAiContent}
        aria-label={t('header.aiContent.toggle')}
        className="h-8 rounded-lg border-border bg-background px-2.5 text-muted-foreground shadow-none hover:bg-accent hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-background data-[state=on]:text-primary-text"
      >
        {t('header.aiContent.label')}
      </Toggle>
    </IconTooltip>
  )
}
