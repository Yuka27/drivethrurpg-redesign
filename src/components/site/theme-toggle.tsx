import { MoonIcon, SunIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconTooltip } from './icon-tooltip'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useThemeStore } from '@/stores/theme'

/** Desktop header icon button. */
export function ThemeToggle() {
  const { t } = useTranslation()
  const setTheme = useThemeStore((state) => state.setTheme)
  const next =
    useThemeStore((state) => state.resolvedTheme) === 'dark' ? 'light' : 'dark'

  const label = t(
    next === 'light'
      ? 'header.theme.switchToLight'
      : 'header.theme.switchToDark',
  )

  return (
    <IconTooltip label={label}>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={label}
        className="cursor-pointer"
        onClick={() => setTheme(next)}
      >
        {next === 'light' ? <SunIcon /> : <MoonIcon />}
      </Button>
    </IconTooltip>
  )
}

const segmentClass =
  'h-8 min-w-0 border-border bg-background px-2.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-white'

/** Light/Dark segmented control for the mobile menu; the active segment is red, as in Figma. */
export function ThemeSegmented() {
  const { t } = useTranslation()
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme)
  const setTheme = useThemeStore((state) => state.setTheme)

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={t('menu.theme')}
      value={resolvedTheme}
      onValueChange={(value) => {
        if (value === 'light' || value === 'dark') setTheme(value)
      }}
    >
      <ToggleGroupItem value="light" className={segmentClass}>
        {t('menu.themeLight')}
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" className={segmentClass}>
        {t('menu.themeDark')}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
