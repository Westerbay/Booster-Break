import type { PokedexSetSummary } from '@tcg-collection/shared'
import { ArrowLeftIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'

interface PokedexSummaryProps {
  set: PokedexSetSummary
  onReturnToCover: () => void
}

export function PokedexSummary({ set, onReturnToCover }: PokedexSummaryProps) {
  const { locale } = useLocale()
  const total = set.catalogCount
  const acquired = set.discoveredCount
  const missing = Math.max(0, total - acquired)
  const completion = total > 0 ? acquired / total : 0
  const missingRatio = total > 0 ? missing / total : 0
  const percentage = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  })
  const complete = total > 0 && missing === 0

  return (
    <div className="pokedex-endpaper pokedex-summary">
      <header className="pokedex-summary-heading">
        <p className="pokedex-endpaper-eyebrow">{m.pokedex_summary_eyebrow()}</p>
        <h2>{set.name}</h2>
        <span className="pokedex-endpaper-ornament" aria-hidden="true" />
      </header>

      <div className="pokedex-summary-record">
        <p className="pokedex-summary-completion">
          <strong>{percentage.format(completion)}</strong>
          <span>{m.pokedex_summary_completed()}</span>
        </p>
        <progress
          value={acquired}
          max={Math.max(1, total)}
          aria-label={m.pokedex_summary_completed()}
        />
        <dl className="pokedex-summary-counts">
          <div>
            <dt>{m.pokedex_summary_acquired()}</dt>
            <dd>
              <strong>{acquired.toLocaleString(locale)}</strong>
              <span>{percentage.format(completion)}</span>
            </dd>
          </div>
          <div>
            <dt>{m.pokedex_summary_missing()}</dt>
            <dd>
              <strong>{missing.toLocaleString(locale)}</strong>
              <span>{percentage.format(missingRatio)}</span>
            </dd>
          </div>
        </dl>
        <p className="pokedex-summary-catalog">
          {m.pokedex_summary_catalog({ count: total.toLocaleString(locale) })}
        </p>
        {complete && (
          <p className="pokedex-summary-stamp">
            <CheckIcon aria-hidden="true" />
            {m.pokedex_summary_complete()}
          </p>
        )}
      </div>

      <footer className="pokedex-summary-footer">
        <p>{m.pokedex_lifetime_note()}</p>
        <Button variant="ghost" onClick={onReturnToCover}>
          <ArrowLeftIcon aria-hidden="true" />
          {m.pokedex_summary_return()}
        </Button>
      </footer>
    </div>
  )
}
