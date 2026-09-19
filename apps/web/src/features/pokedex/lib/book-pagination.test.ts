import { describe, expect, test } from 'bun:test'
import { bookPositionAt, resolveBookPosition } from './book-pagination'

describe('Pokédex book navigation', () => {
  test('turns directly from the cover to the summary for an empty catalog', () => {
    for (const spread of [false, true]) {
      expect(bookPositionAt(-1, 0, spread)).toEqual({ kind: 'cover' })
      expect(bookPositionAt(1, 0, spread)).toEqual({ kind: 'summary' })
      expect(bookPositionAt(2, 0, spread)).toEqual({ kind: 'summary' })

      const summary = resolveBookPosition({ kind: 'summary' }, 0, spread)
      expect(summary.index).toBe(1)
      expect(summary.cardPageCount).toBe(0)
      expect(summary.totalLeaves).toBe(0)
      expect(summary.firstLeaf).toBe(0)
      expect(summary.lastLeaf).toBe(0)
    }
  })

  test('puts every card on a leaf before the back cover, including a partial final leaf', () => {
    const catalogs = [
      { count: 1, leaves: [1] },
      { count: 9, leaves: [1] },
      { count: 10, leaves: [1, 2] },
      { count: 18, leaves: [1, 2] },
      { count: 19, leaves: [1, 2, 3] },
    ]

    for (const { count, leaves } of catalogs) {
      const visitedCards: number[] = []
      for (const leaf of leaves) {
        const position = bookPositionAt(leaf, count, false)
        const page = resolveBookPosition(position, count, false)
        expect(position.kind).toBe('cards')
        expect(page.index).toBe(leaf)
        expect(page.cardPage).toBe(leaf)
        expect(page.firstLeaf).toBe(leaf)
        expect(page.lastLeaf).toBe(leaf)
        expect(page.totalLeaves).toBe(leaves.length)

        if (position.kind === 'cards') {
          for (
            let card = position.firstCard;
            card < Math.min(position.firstCard + page.pageSize, count);
            card++
          ) {
            visitedCards.push(card)
          }
        }
      }
      expect(visitedCards).toEqual(Array.from({ length: count }, (_, index) => index))
      expect(bookPositionAt(leaves.length + 1, count, false)).toEqual({ kind: 'summary' })
    }
  })

  test('pairs desktop leaves without inventing a final leaf after the last card', () => {
    const catalogs = [
      { count: 1, pairs: [[1, 1]] },
      { count: 9, pairs: [[1, 1]] },
      { count: 10, pairs: [[1, 2]] },
      { count: 18, pairs: [[1, 2]] },
      {
        count: 19,
        pairs: [
          [1, 2],
          [3, 3],
        ],
      },
    ]

    for (const { count, pairs } of catalogs) {
      for (const [index, [firstLeaf, lastLeaf]] of pairs.entries()) {
        const page = resolveBookPosition(bookPositionAt(index + 1, count, true), count, true)
        expect(page.firstLeaf).toBe(firstLeaf)
        expect(page.lastLeaf).toBe(lastLeaf)
        expect(page.cardPageCount).toBe(pairs.length)
      }
      expect(bookPositionAt(pairs.length + 1, count, true)).toEqual({ kind: 'summary' })
    }
  })

  test('keeps the current card visible when resizing between a single leaf and a spread', () => {
    const mobilePosition = bookPositionAt(2, 40, false)
    const desktop = resolveBookPosition(mobilePosition, 40, true)
    expect(desktop.cardPage).toBe(1)
    expect([desktop.firstLeaf, desktop.lastLeaf]).toEqual([1, 2])
    expect(resolveBookPosition(mobilePosition, 40, false).firstLeaf).toBe(2)

    const desktopPosition = bookPositionAt(2, 40, true)
    const mobile = resolveBookPosition(desktopPosition, 40, false)
    expect(mobile.cardPage).toBe(3)
    expect(mobile.firstLeaf).toBe(3)
    expect(resolveBookPosition(desktopPosition, 40, true).firstLeaf).toBe(3)
  })

  test('clamps stale card positions after a catalog shrinks and preserves cover navigation bounds', () => {
    for (const spread of [false, true]) {
      expect(bookPositionAt(-50, 19, spread)).toEqual({ kind: 'cover' })
      expect(bookPositionAt(50, 19, spread)).toEqual({ kind: 'summary' })
      const first = resolveBookPosition({ kind: 'cards', firstCard: -9 }, 19, spread)
      expect(first.cardPage).toBe(1)
      expect(first.firstLeaf).toBe(1)
      const final = resolveBookPosition({ kind: 'cards', firstCard: 99 }, 19, spread)
      expect(final.cardPage).toBe(final.cardPageCount)
      expect(final.lastLeaf).toBe(3)

      const empty = resolveBookPosition({ kind: 'cards', firstCard: 9 }, 0, spread)
      expect(empty.kind).toBe('summary')
      expect(empty.index).toBe(1)
      expect(empty.cardPage).toBe(1)
      expect(empty.firstLeaf).toBe(0)
      expect(empty.lastLeaf).toBe(0)
    }
  })
})
