export type Theme = 'light' | 'dark'

const storageKey = 'booster-break-theme'
const listeners = new Set<() => void>()

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  for (const listener of listeners) listener()
}

function onStorage(event: StorageEvent) {
  if (event.storageArea !== window.localStorage) return
  if (event.key !== storageKey && event.key !== null) return
  applyTheme(event.newValue === 'light' ? 'light' : 'dark')
}

export const themeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    if (listeners.size === 1) window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) window.removeEventListener('storage', onStorage)
    }
  },

  getSnapshot(): Theme {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  },

  setTheme(theme: Theme) {
    applyTheme(theme)
    try {
      window.localStorage.setItem(storageKey, theme)
      return true
    } catch {
      return false
    }
  },
}
