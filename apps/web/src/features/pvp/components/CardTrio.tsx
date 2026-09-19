import type { PokemonCardSummary } from '@tcg-collection/shared'
import { CardPreview } from '@/features/dashboard/components/CardPreview'
import { BattleCardImage } from './BattleCardImage'

export function CardTrio({ cards }: { cards: PokemonCardSummary[] }) {
  const ordered = [cards[1], cards[2], cards[0]]
  return (
    <span className="arena-card-trio">
      {ordered.map((card, index) => (
        <span className="arena-fan-card" key={card?.id ?? index}>
          {card ? (
            <CardPreview card={card}>
              <BattleCardImage card={card} />
            </CardPreview>
          ) : (
            <span className="arena-card-back">
              <b>BB</b>
            </span>
          )}
        </span>
      ))}
    </span>
  )
}
