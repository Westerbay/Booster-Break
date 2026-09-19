import { useState, type SyntheticEvent } from 'react'
import { ImageOffIcon } from 'lucide-react'
import type { PokemonCardSummary } from '@tcg-collection/shared'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { m } from '@/paraglide/messages'

export function BattleCardImage({ card }: { card: PokemonCardSummary }) {
  const [attempt, setAttempt] = useState(0)
  const source = card.imageLarge ?? card.imageSmall
  const src =
    attempt === 1 ? source?.replace('://assets.tcgdex.net/fr/', '://assets.tcgdex.net/en/') : source
  function onImageError(event: SyntheticEvent<HTMLSpanElement>) {
    // Foil cards can render a second decorative image; one failing resource
    // must not skip the English fallback by counting that duplicate error.
    const image = event.target
    if (image instanceof HTMLImageElement && image.getAttribute('aria-hidden') !== 'true') {
      setAttempt(Math.min(2, attempt + 1))
    }
  }
  if (!src || attempt === 2)
    return (
      <span className="arena-card-placeholder" role="img" aria-label={card.name}>
        <ImageOffIcon aria-hidden="true" />
        <span>{card.name}</span>
        <small>{m.pvp_unknown_card()}</small>
      </span>
    )
  return (
    <span className="arena-card-image" onErrorCapture={onImageError}>
      <FoilCardImage
        src={src}
        alt={card.name}
        cardId={card.id}
        finish={card.finish}
        rarity={card.rarity}
        supertype={card.supertype}
        isEvolved={card.isEvolved}
        className="h-full w-full object-cover"
      />
    </span>
  )
}
