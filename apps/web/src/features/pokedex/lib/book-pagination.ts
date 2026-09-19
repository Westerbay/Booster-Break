export const POKEDEX_SLOTS_PER_LEAF = 9

export type BookPosition =
  | { kind: 'cover' }
  | { kind: 'cards'; firstCard: number }
  | { kind: 'summary' }

export interface BookLayout {
  kind: BookPosition['kind']
  index: number
  cardPage: number
  pageSize: number
  cardPageCount: number
  firstLeaf: number
  lastLeaf: number
  totalLeaves: number
}

export function resolveBookPosition(
  position: BookPosition,
  catalogCount: number,
  spread: boolean,
): BookLayout {
  const pageSize = POKEDEX_SLOTS_PER_LEAF * (spread ? 2 : 1)
  const cardPageCount = Math.ceil(catalogCount / pageSize)
  const totalLeaves = Math.ceil(catalogCount / POKEDEX_SLOTS_PER_LEAF)
  const kind = position.kind === 'cards' && cardPageCount === 0 ? 'summary' : position.kind
  const cardPage =
    position.kind === 'cards'
      ? Math.max(1, Math.min(Math.floor(position.firstCard / pageSize) + 1, cardPageCount))
      : kind === 'summary'
        ? Math.max(1, cardPageCount)
        : 1
  const firstLeaf = kind === 'cards' ? (cardPage - 1) * (spread ? 2 : 1) + 1 : 0

  return {
    kind,
    index: kind === 'cover' ? 0 : kind === 'cards' ? cardPage : cardPageCount + 1,
    cardPage,
    pageSize,
    cardPageCount,
    firstLeaf,
    lastLeaf: firstLeaf === 0 ? 0 : Math.min(firstLeaf + (spread ? 1 : 0), totalLeaves),
    totalLeaves,
  }
}

export function bookPositionAt(index: number, catalogCount: number, spread: boolean): BookPosition {
  const pageSize = POKEDEX_SLOTS_PER_LEAF * (spread ? 2 : 1)
  const cardPageCount = Math.ceil(catalogCount / pageSize)
  if (index <= 0) return { kind: 'cover' }
  if (index > cardPageCount) return { kind: 'summary' }
  return { kind: 'cards', firstCard: (index - 1) * pageSize }
}
