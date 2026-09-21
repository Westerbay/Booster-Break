import type { PokedexSetSummary } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'
import '@/styles/pokedex-loading.css'

interface PokedexBookLoadingProps {
  set: PokedexSetSummary
}

export function PokedexBookLoading({ set }: PokedexBookLoadingProps) {
  return (
    <div className="pokedex-loading">
      <div className="pokedex-loading-panel" role="status">
        <p className="pokedex-loading-eyebrow">{m.pokedex_cover_eyebrow()}</p>

        <div className="pokedex-loading-scene" aria-hidden="true">
          <div className="pokedex-loading-orbit" />
          <div className="pokedex-loading-card" data-position="left" />
          <div className="pokedex-loading-card" data-position="right" />
          <div className="pokedex-loading-card" data-position="front">
            <span className="pokedex-loading-card-label">{m.nav_pokedex()}</span>
            <div className="pokedex-cover-crest">
              <span />
            </div>
            <span className="pokedex-loading-card-stars">✦ · ✦ · ✦</span>
          </div>
        </div>

        <div className="pokedex-loading-copy">
          <h2>{m.pokedex_loading_title()}</h2>
          <p className="pokedex-loading-set">{set.name}</p>
          <p className="pokedex-loading-description">{m.pokedex_loading_description()}</p>
        </div>

        <div className="pokedex-loading-status">
          <div className="pokedex-loading-track" aria-hidden="true">
            <span />
          </div>
          <p>
            <span className="pokedex-loading-signal" aria-hidden="true" />
            {m.pokedex_loading_assets()}
          </p>
        </div>
        <p className="pokedex-loading-note">{m.pokedex_loading_note()}</p>
      </div>
    </div>
  )
}
