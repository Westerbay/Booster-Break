import type { PokedexSlot, PokemonCardSummary } from '@tcg-collection/shared'
import { BattleCardImage } from '@/features/pvp/components/BattleCardImage'
import { m } from '@/paraglide/messages'
import { POKEDEX_SLOTS_PER_LEAF } from '../lib/book-pagination'

interface PokedexLeafProps {
  slots: PokedexSlot[]
  setName: string
  side: 'left' | 'right'
  pageNumber?: number
  decorative?: boolean
  onSelect?: (card: PokemonCardSummary) => void
}

export function PokedexLeaf({
  slots,
  setName,
  side,
  pageNumber,
  decorative,
  onSelect,
}: PokedexLeafProps) {
  return (
    <div className="pokedex-leaf" data-side={side}>
      <div className="pokedex-leaf-heading">
        <span>{setName}</span>
        <span aria-hidden="true">{pageNumber && String(pageNumber).padStart(2, '0')}</span>
      </div>
      <div className="pokedex-pockets">
        {Array.from({ length: POKEDEX_SLOTS_PER_LEAF }, (_, index) => {
          const slot = slots[index]
          if (!slot)
            return <div key={`empty-${index}`} className="pokedex-pocket-end" aria-hidden="true" />
          const label = m.pokedex_missing_card({ number: slot.card.number })
          const card = slot.card
          function select() {
            onSelect?.(card)
          }
          return (
            <div className="pokedex-pocket" data-discovered={slot.discovered} key={slot.card.id}>
              {slot.discovered ? (
                decorative ? (
                  <div className="pokedex-card">
                    <BattleCardImage card={slot.card} />
                  </div>
                ) : (
                  <button
                    className="pokedex-card"
                    type="button"
                    onClick={select}
                    aria-label={m.pokedex_view_card({ name: slot.card.name })}
                  >
                    <BattleCardImage card={slot.card} />
                  </button>
                )
              ) : (
                <div className="pokedex-empty-pocket" role="img" aria-label={label}>
                  <span className="pokedex-pocket-emblem" aria-hidden="true">
                    <span />
                  </span>
                  <span className="pokedex-pocket-number">{slot.card.number}</span>
                  <span className="pokedex-pocket-missing">{m.pokedex_undiscovered()}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="pokedex-leaf-footer" aria-hidden="true">
        {pageNumber && (
          <>
            <span />
            {pageNumber}
            <span />
          </>
        )}
      </div>
    </div>
  )
}
