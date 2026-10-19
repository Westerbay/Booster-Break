export interface RadioTrack {
  title: string
  file: string
}

export function parseRadioLibrary(value: unknown): RadioTrack[] {
  if (!Array.isArray(value)) throw new Error('Invalid radio directory listing')
  const tracks: RadioTrack[] = []
  for (const entry of value) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('type' in entry) ||
      !('name' in entry) ||
      typeof entry.name !== 'string'
    ) {
      throw new Error('Invalid radio directory entry')
    }
    if (entry.type !== 'file' || !/\.mp3$/i.test(entry.name)) continue
    const filename = entry.name
    const hasControlCharacters = [...filename].some((character) => character.charCodeAt(0) < 32)
    if (/[/\\]/.test(filename) || hasControlCharacters) throw new Error('Invalid radio filename')
    tracks.push({ title: filename.replace(/\.mp3$/i, ''), file: encodeURIComponent(filename) })
  }
  return tracks.sort((left, right) =>
    left.title.localeCompare(right.title, 'en', { numeric: true }),
  )
}

// A small directory listing is refreshed while the app is visible; audio is untouched.
export const radioRefreshIntervalMs = 30_000

export async function fetchRadioLibrary({ signal }: { signal: AbortSignal }) {
  const response = await fetch(`${import.meta.env.BASE_URL}radio/`, {
    signal,
    cache: 'no-store',
  })
  if (response.status === 404) return []
  if (!response.ok) throw new Error('Unable to load radio playlist')
  const value: unknown = await response.json()
  return parseRadioLibrary(value)
}
