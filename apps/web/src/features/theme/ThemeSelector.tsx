import { useState, useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'

import { useLocale } from '@/features/i18n/useLocale'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { themeStore, type Theme } from './theme-store'

export function ThemeSelector({ className }: { className?: string }) {
  useLocale()
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot)
  const [saveFailed, setSaveFailed] = useState(false)

  function selectTheme(nextTheme: Theme) {
    setSaveFailed(!themeStore.setTheme(nextTheme))
  }

  function selectLight() {
    selectTheme('light')
  }

  function selectDark() {
    selectTheme('dark')
  }

  return (
    <div className={cn('theme-selector', className)}>
      <span className="theme-selector-label">{m.theme_label()}</span>
      <div className="theme-selector-options" role="group" aria-label={m.theme_label()}>
        <button type="button" aria-pressed={theme === 'light'} onClick={selectLight}>
          <SunIcon aria-hidden="true" />
          {m.theme_light()}
        </button>
        <button type="button" aria-pressed={theme === 'dark'} onClick={selectDark}>
          <MoonIcon aria-hidden="true" />
          {m.theme_dark()}
        </button>
      </div>
      {saveFailed && (
        <p role="status" className="mt-2 text-xs leading-relaxed text-destructive">
          {m.theme_storage_unavailable()}
        </p>
      )}
    </div>
  )
}
