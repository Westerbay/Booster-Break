import { useState, useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'
import { themeStore, type Theme } from './theme-store'

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  useLocale()
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot)
  const [saveFailed, setSaveFailed] = useState(false)
  const isDark = theme === 'dark'
  const currentLabel = isDark ? m.theme_dark() : m.theme_light()
  const toggleLabel = isDark ? m.theme_switch_to_light() : m.theme_switch_to_dark()

  function selectTheme(nextTheme: Theme) {
    setSaveFailed(!themeStore.setTheme(nextTheme))
  }

  return (
    <div className="theme-selector">
      {compact ? (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="justify-start px-2 text-xs font-semibold"
          aria-label={`${currentLabel}. ${toggleLabel}`}
          title={toggleLabel}
          onClick={() => selectTheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? <MoonIcon aria-hidden="true" /> : <SunIcon aria-hidden="true" />}
          {currentLabel}
        </Button>
      ) : (
        <>
          <span className="theme-selector-label">{m.theme_label()}</span>
          <div className="theme-selector-options" role="group" aria-label={m.theme_label()}>
            <button type="button" aria-pressed={!isDark} onClick={() => selectTheme('light')}>
              <SunIcon aria-hidden="true" />
              {m.theme_light()}
            </button>
            <button type="button" aria-pressed={isDark} onClick={() => selectTheme('dark')}>
              <MoonIcon aria-hidden="true" />
              {m.theme_dark()}
            </button>
          </div>
        </>
      )}
      {saveFailed && (
        <p role="status" className="mt-2 text-xs leading-relaxed text-destructive">
          {m.theme_storage_unavailable()}
        </p>
      )}
    </div>
  )
}
