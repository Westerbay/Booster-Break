import { expect, test } from 'bun:test'
import { parseRadioLibrary } from './radio-library'

test('turns nginx directory entries into naturally sorted MP3 tracks', () => {
  expect(
    parseRadioLibrary([
      { type: 'file', name: '10 - Combat.MP3', size: 120 },
      { type: 'file', name: '2 - Bourg #1.mp3', size: 120 },
      { type: 'directory', name: 'folder.mp3' },
      { type: 'file', name: 'notes.txt', size: 20 },
      { type: 'file', name: 'upload.mp3.part', size: 20 },
    ]),
  ).toEqual([
    { title: '2 - Bourg #1', file: '2%20-%20Bourg%20%231.mp3' },
    { title: '10 - Combat', file: '10%20-%20Combat.MP3' },
  ])
})

test('encodes literal percent signs without interpreting filenames as URLs', () => {
  expect(parseRadioLibrary([{ type: 'file', name: 'Route%20One.mp3' }])[0]?.file).toBe(
    'Route%2520One.mp3',
  )
  for (const name of ['../secret.mp3', 'https://other.test/a.mp3', 'folder\\track.mp3']) {
    expect(() => parseRadioLibrary([{ type: 'file', name }])).toThrow()
  }
  expect(() => parseRadioLibrary({ tracks: [] })).toThrow()
})

test('rejects malformed directory responses before building the playlist', () => {
  for (const response of [
    null,
    {},
    [null],
    [{}],
    [{ type: 'file' }],
    [{ type: 'file', name: 123 }],
    [{ type: 123, name: 'track.mp3' }],
  ]) {
    expect(() => parseRadioLibrary(response)).toThrow()
  }
  expect(() => parseRadioLibrary([{ type: 'file', name: 'bad\u0000.mp3' }])).toThrow()
})
