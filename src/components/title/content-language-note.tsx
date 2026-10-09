import { LanguagesIcon } from 'lucide-react'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLanguageName } from '@/i18n/format'
import { apiLanguage } from '@/i18n/languages'
import { usePreferencesStore } from '@/stores/preferences'

/** True when the API could not give us this title in the current language. */
export function useIsOtherLanguage(textLanguage: string | undefined) {
  const language = apiLanguage(usePreferencesStore((state) => state.language))
  return Boolean(textLanguage) && textLanguage !== language
}

/** Title detail page: small "Shown in English" badge when the text is in another language. */
export function ContentLanguageBadge({
  textLanguage,
}: {
  textLanguage: string
}) {
  const { t } = useTranslation('title')
  const languageName = useLanguageName()
  if (!useIsOtherLanguage(textLanguage)) return null

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <LanguagesIcon aria-hidden />
      {t('contentLanguage.shownIn', { language: languageName(textLanguage) })}
    </Badge>
  )
}

/** Title cards: wrap the card's language hint so hovering or focusing explains it. */
export function ContentLanguageTooltip({
  textLanguage,
  children,
}: {
  textLanguage: string
  children: ReactElement
}) {
  const { t } = useTranslation('title')
  const languageName = useLanguageName()
  if (!useIsOtherLanguage(textLanguage)) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        {t('contentLanguage.cardTooltip', {
          language: languageName(textLanguage),
        })}
      </TooltipContent>
    </Tooltip>
  )
}
