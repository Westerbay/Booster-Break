import { readdir, rename, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export async function generateRadioLibrary(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true })
  const tracks = entries
    .filter((entry) => entry.isFile() && /\.mp3$/i.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }))
    .map((entry) => ({
      title: entry.name.replace(/\.mp3$/i, ''),
      file: encodeURIComponent(entry.name),
    }))
  // Atomic replacement keeps listeners from reading a partially written playlist.
  const temporaryPath = join(directory, 'playlist.json.tmp')
  await writeFile(temporaryPath, `${JSON.stringify(tracks, null, 2)}\n`)
  await rename(temporaryPath, join(directory, 'playlist.json'))
  return tracks.length
}

if (import.meta.main) {
  const directory = resolve(process.argv[2] ?? 'apps/web/public/radio')
  const count = await generateRadioLibrary(directory)
  console.info(`Radio: ${count} MP3 file(s) indexed in ${directory}`)
}
