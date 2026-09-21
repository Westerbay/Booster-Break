import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpenIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/features/i18n/useLocale'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { usePokedexQueryOption } from '@/lib/queries/pokedex'
import { m } from '@/paraglide/messages'
import { PokedexBook } from './components/PokedexBook'
import { getStoredPokedexSetId, setStoredPokedexSetId } from './lib/pokedex-set-storage'
import '@/styles/pokedex.css'
import '@/styles/pokedex-endpapers.css'

export function PokedexView() {
  useLocale()
  const auth = useQuery(useCurrentUserQueryOption())
  const userId = auth.data?.authenticated ? auth.data.user.id : undefined
  const overview = useQuery(usePokedexQueryOption(userId))
  const [selectedId, setSelectedId] = useState(getStoredPokedexSetId)
  const sets = overview.data?.sets ?? []
  const selectedSet = sets.find((set) => set.id === selectedId) ?? sets[0]

  function selectSet(setId: string) {
    setSelectedId(setId)
    setStoredPokedexSetId(setId)
  }

  function retry() {
    if (auth.error) void auth.refetch()
    else void overview.refetch()
  }

  if (userId && selectedSet) {
    return (
      <section className="pokedex-view" aria-label={m.nav_pokedex()}>
        <PokedexBook
          key={userId}
          userId={userId}
          set={selectedSet}
          hasSelectedSet={selectedSet.id === selectedId}
          sets={sets}
          onSetChange={selectSet}
        />
      </section>
    )
  }

  const error = auth.error ?? overview.error
  let description: string = m.pokedex_no_sets()
  if (auth.isPending || (userId && overview.isPending)) description = m.pokedex_loading()
  else if (error) description = error.message
  else if (!userId) description = m.pokedex_guest_description()

  return (
    <section className="pokedex-view" aria-label={m.nav_pokedex()}>
      <div className="pokedex-notice" role={error ? 'alert' : 'status'}>
        <BookOpenIcon aria-hidden="true" />
        <h1>{m.nav_pokedex()}</h1>
        <p>{description}</p>
        {error && <Button onClick={retry}>{m.pvp_retry()}</Button>}
      </div>
    </section>
  )
}
