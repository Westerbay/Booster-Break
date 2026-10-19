import { expect, test } from 'bun:test'
import { parseRadioLibrary } from './radio-library'

test('accepts encoded filenames but rejects remote sources and path traversal', () => {
  expect(parseRadioLibrary([{ title: 'Bourg Palette', file: 'Bourg%20Palette.mp3' }])).toEqual([
    { title: 'Bourg Palette', file: 'Bourg%20Palette.mp3' },
  ])
  for (const file of [
    '../secret.mp3',
    '%2E%2E%2Fsecret.mp3',
    'https://other.test/a.mp3',
    '%ZZ.mp3',
    'folder/a.mp3',
  ]) {
    expect(() => parseRadioLibrary([{ title: 'Track', file }])).toThrow()
  }
  expect(() => parseRadioLibrary({ tracks: [] })).toThrow()
})
