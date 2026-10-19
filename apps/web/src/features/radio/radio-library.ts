export interface RadioTrack {
  title: string
  file: string
}

export function parseRadioLibrary(value: unknown): RadioTrack[] {
  if (!Array.isArray(value)) throw new Error('Invalid radio playlist')
  return value.map((entry: unknown) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('title' in entry) ||
      typeof entry.title !== 'string' ||
      !entry.title.trim() ||
      !('file' in entry) ||
      typeof entry.file !== 'string'
    )
      throw new Error('Invalid radio track')
    const filename = decodeURIComponent(entry.file)
    const hasControlCharacters = [...filename].some((character) => character.charCodeAt(0) < 32)
    if (!/\.mp3$/i.test(filename) || /[/\\]/.test(filename) || hasControlCharacters) {
      throw new Error('Invalid radio filename')
    }
    return { title: entry.title, file: encodeURIComponent(filename) }
  })
}

export async function fetchRadioLibrary({ signal }: { signal: AbortSignal }) {
  const response = await fetch(`${import.meta.env.BASE_URL}radio/playlist.json`, {
    signal,
    cache: 'no-store',
  })
  if (response.status === 404) return []
  if (!response.ok) throw new Error('Unable to load radio playlist')
  // Vite serves the SPA fallback when the optional local playlist does not exist.
  if (import.meta.env.DEV && response.headers.get('content-type')?.includes('text/html')) return []
  const value: unknown = await response.json()
  return parseRadioLibrary(value)
}
