import { z } from 'zod'

export interface RadioTrack {
  title: string
  file: string
}

const radioDirectorySchema = z.array(
  z.object({
    type: z.enum(['file', 'directory', 'other']),
    name: z.string(),
  }),
)

const radioFilenameSchema = z
  .string()
  .min(1)
  .regex(/^[^/\\\p{Cc}]+$/u, 'Invalid radio filename')

export function parseRadioLibrary(value: unknown): RadioTrack[] {
  const entries = radioDirectorySchema.parse(value)
  const tracks = entries
    .filter((entry) => entry.type === 'file' && /\.mp3$/i.test(entry.name))
    .map((entry) => {
      const filename = radioFilenameSchema.parse(entry.name)
      return { title: filename.replace(/\.mp3$/i, ''), file: encodeURIComponent(filename) }
    })
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
