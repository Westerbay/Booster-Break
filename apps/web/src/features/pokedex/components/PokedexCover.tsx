import { useState, type MouseEvent } from 'react'
import type { PokedexSetSummary } from '@tcg-collection/shared'
import { BookOpenIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { PokedexSetPicker } from './PokedexSetPicker'

interface PokedexCoverProps {
  sets: PokedexSetSummary[]
  set?: PokedexSetSummary
  onSetChange: (setId: string) => void
  onOpen: () => void
  onWarm: () => void
}

export function PokedexCover({ sets, set, onSetChange, onOpen, onWarm }: PokedexCoverProps) {
  const [failedImages, setFailedImages] = useState<string[]>([])
  const imageUrl = [set?.logoUrl, set?.symbolUrl].find((url) => url && !failedImages.includes(url))
  const hint = set ? m.pokedex_cover_selected_hint() : m.pokedex_cover_hint()

  function imageFailed() {
    if (imageUrl) setFailedImages((urls) => [...urls, imageUrl])
  }
  function openFromCover(event: MouseEvent<HTMLDivElement>) {
    const target = event.target
    // React bubbles clicks from the portalled set picker through here, so only react to the cover's own surface.
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) return
    if (target.closest('button')) return
    onOpen()
  }

  return (
    <div
      className="pokedex-endpaper pokedex-cover"
      data-openable={Boolean(set)}
      onClick={set ? openFromCover : undefined}
      onPointerEnter={set ? onWarm : undefined}
    >
      <span className="pokedex-cover-stitch" aria-hidden="true" />
      <header className="pokedex-cover-heading">
        <p className="pokedex-endpaper-eyebrow">{m.pokedex_cover_eyebrow()}</p>
        <div className="pokedex-cover-crest" aria-hidden="true">
          <span />
        </div>
        <h1>{m.nav_pokedex()}</h1>
        <span className="pokedex-endpaper-ornament" aria-hidden="true" />
      </header>

      <div className="pokedex-cover-artwork">
        {set && (
          <div className="pokedex-cover-art-frame">
            {imageUrl ? (
              <img src={imageUrl} alt={set.name} onError={imageFailed} />
            ) : (
              <span className="pokedex-cover-art-name">{set.name}</span>
            )}
          </div>
        )}
      </div>

      <div className="pokedex-cover-edition">
        {set && (
          <Button
            variant="arena"
            className="pokedex-cover-choose"
            onClick={onOpen}
            onFocus={onWarm}
          >
            <BookOpenIcon aria-hidden="true" />
            {m.pokedex_cover_open()}
          </Button>
        )}
        <PokedexSetPicker
          sets={sets}
          variant={set ? 'arena-outline' : 'arena'}
          onSetChange={onSetChange}
        />
      </div>

      <footer className="pokedex-cover-footer">
        <p className="pokedex-cover-hint">{hint}</p>
        <span className="pokedex-cover-imprint">{m.pokedex_cover_imprint()}</span>
      </footer>
    </div>
  )
}
