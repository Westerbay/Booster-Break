import { expect, test } from 'bun:test'
import type { PokedexSetResponse } from '@tcg-collection/shared'
import { loadPokedexBook } from './load-pokedex-book'

test('loads every page and waits for unique discovered artwork before exposing the book', async () => {
  const pages: number[] = []
  const images: string[] = []
  let release!: () => void
  const ready = new Promise<void>((resolve) => {
    release = resolve
  })
  let complete = false
  const result = loadPokedexBook(
    async (page) => {
      pages.push(page)
      return {
        set: {
          id: 'test',
          name: 'Test',
          series: 'Test',
          total: 3,
          releaseDate: '2026-09-21',
          catalogCount: 3,
          discoveredCount: 2,
        },
        slots: [
          {
            discovered: page < 3,
            card: {
              id: String(page),
              name: 'Card',
              number: String(page),
              setId: 'test',
              imageLarge: 'https://example.com/card.png',
            },
          },
        ],
        pagination: { page, pageSize: 1, total: 3, pageCount: 3 },
      } satisfies PokedexSetResponse
    },
    async (src) => {
      images.push(src)
      await ready
      return true
    },
  ).then((book) => {
    complete = true
    return book
  })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(complete).toBe(false)
  release()
  expect((await result).slots.map((slot) => slot.card.id)).toEqual(['1', '2', '3'])
  expect(pages).toEqual([1, 2, 3])
  expect(images.filter((src) => src === 'https://example.com/card.png')).toHaveLength(1)
})

test('prepares the English fallback and an unavailable placeholder before turning pages', async () => {
  const requested: string[] = []
  const book = await loadPokedexBook(
    async () => ({
      set: {
        id: 'test',
        name: 'Test',
        series: 'Test',
        total: 3,
        releaseDate: '2026-09-21',
        catalogCount: 3,
        discoveredCount: 2,
      },
      slots: [1, 2, 3].map((id) => ({
        discovered: id !== 3,
        card: {
          id: String(id),
          name: 'Card',
          number: String(id),
          setId: 'test',
          imageLarge: `https://assets.tcgdex.net/fr/test/${id}/high.png`,
        },
      })),
      pagination: { page: 1, pageSize: 60, total: 3, pageCount: 1 },
    }),
    async (src) => {
      requested.push(src)
      return src === 'https://assets.tcgdex.net/en/test/1/high.png'
    },
  )
  expect(book.slots[0]?.card.imageLarge).toBe('https://assets.tcgdex.net/en/test/1/high.png')
  expect(book.slots[1]?.card.imageLarge).toBeUndefined()
  expect(book.slots[1]?.card.imageSmall).toBeUndefined()
  expect(requested.some((src) => src.includes('/3/'))).toBe(false)
})

test('reports a page failure instead of opening a partially loaded book', async () => {
  await expect(
    loadPokedexBook(
      async (page) => {
        if (page === 2) throw new Error('Set unavailable')
        return {
          set: {
            id: 'test',
            name: 'Test',
            series: 'Test',
            total: 2,
            releaseDate: '2026-09-21',
            catalogCount: 2,
            discoveredCount: 0,
          },
          slots: [],
          pagination: { page, pageSize: 1, total: 2, pageCount: 2 },
        }
      },
      async () => true,
    ),
  ).rejects.toThrow('Set unavailable')
})
