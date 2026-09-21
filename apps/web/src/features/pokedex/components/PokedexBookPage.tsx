import type { PokemonCardSummary, PokedexSetSummary } from '@tcg-collection/shared'
import type { BookScene } from '../hooks/usePokedexBook'
import { POKEDEX_SLOTS_PER_LEAF } from '../lib/book-pagination'
import { PokedexCover } from './PokedexCover'
import { PokedexSummary } from './PokedexSummary'
import { PokedexLeaf } from './PokedexLeaf'

interface PokedexBookPageProps {
  scene: BookScene
  side: 'left' | 'right'
  sets: PokedexSetSummary[]
  hasSelectedSet: boolean
  decorative?: boolean
  onSetChange: (setId: string) => void
  onReturnToCover: () => void
  onSelect: (card: PokemonCardSummary) => void
}

export function PokedexBookPage({
  scene,
  side,
  sets,
  hasSelectedSet,
  decorative,
  onSetChange,
  onReturnToCover,
  onSelect,
}: PokedexBookPageProps) {
  if (scene.layout.kind === 'cards') {
    const offset = side === 'right' ? POKEDEX_SLOTS_PER_LEAF : 0
    const slots = scene.slots?.slice(offset, offset + POKEDEX_SLOTS_PER_LEAF) ?? []
    const leaf = scene.layout.firstLeaf + (side === 'right' ? 1 : 0)
    const number = leaf <= scene.layout.lastLeaf ? leaf : undefined
    return (
      <PokedexLeaf
        slots={slots}
        setName={scene.set.name}
        side={side}
        pageNumber={number}
        decorative={decorative}
        onSelect={onSelect}
      />
    )
  }

  if (scene.layout.kind === 'cover')
    return (
      <PokedexCover
        set={hasSelectedSet ? scene.set : undefined}
        sets={sets}
        onSetChange={onSetChange}
      />
    )
  return <PokedexSummary set={scene.set} onReturnToCover={onReturnToCover} />
}
