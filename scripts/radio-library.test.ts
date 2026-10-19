import { expect, test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateRadioLibrary } from './radio-library'

test('indexes only regular MP3 files in natural order and safely encodes their URLs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'booster-radio-'))
  try {
    await writeFile(join(directory, '10 - Battle.MP3'), 'test')
    await writeFile(join(directory, '2 - Bourg #1.mp3'), 'test')
    await writeFile(join(directory, 'notes.txt'), 'not audio')
    await mkdir(join(directory, 'folder.mp3'))
    await generateRadioLibrary(directory)
    const tracks = JSON.parse(await readFile(join(directory, 'playlist.json'), 'utf8'))
    expect(tracks).toEqual([
      { title: '2 - Bourg #1', file: '2%20-%20Bourg%20%231.mp3' },
      { title: '10 - Battle', file: '10%20-%20Battle.MP3' },
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
