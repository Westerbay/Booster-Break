import { useEffect, useReducer, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { XIcon } from 'lucide-react'
import type { UpcomingPokemonSet } from '@tcg-collection/shared'

import { pokemonQueryKeys } from '../lib/query-keys'
import { formatCountdown } from '../time'
import { useLocale } from '@/features/i18n/useLocale'
import { wallClock } from '@/lib/clock'
import { m } from '@/paraglide/messages'

// Module-level: a closed teaser stays closed across views, and returns on reload.
const dismissedSetIds = new Set<string>()

const RELEASE_RECHECK_MS = 5_000
const MAX_TIMEOUT_MS = 2_147_483_647

interface UpcomingPackBannerProps {
  sets: UpcomingPokemonSet[]
  dataUpdatedAt: number
}

export function UpcomingPackBanner({ sets, dataUpdatedAt }: UpcomingPackBannerProps) {
  const queryClient = useQueryClient()
  const [, forceRender] = useReducer((tick: number) => tick + 1, 0)
  const nextReleaseAt =
    sets.length > 0 ? Math.min(...sets.map((set) => new Date(set.releasesAt).getTime())) : undefined

  // Kept in the parent so closing the banner can't stop it. dataUpdatedAt re-arms it.
  useEffect(() => {
    if (nextReleaseAt === undefined) {
      return
    }

    const timerId = window.setTimeout(
      () => queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.all }),
      Math.min(Math.max(nextReleaseAt - Date.now() + 1_000, RELEASE_RECHECK_MS), MAX_TIMEOUT_MS),
    )

    return () => window.clearTimeout(timerId)
  }, [nextReleaseAt, dataUpdatedAt, queryClient])

  const visibleSets = sets.filter((set) => !dismissedSetIds.has(set.id))

  if (visibleSets.length === 0) {
    return null
  }

  return (
    <aside className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-20 flex flex-col items-center gap-2 px-3 md:top-3 md:left-52">
      {visibleSets.map((set) => (
        <UpcomingPackRow
          key={set.id}
          set={set}
          onDismiss={() => {
            dismissedSetIds.add(set.id)
            forceRender()
          }}
        />
      ))}
    </aside>
  )
}

interface UpcomingPackRowProps {
  set: UpcomingPokemonSet
  onDismiss: () => void
}

function UpcomingPackRow({ set, onDismiss }: UpcomingPackRowProps) {
  const now = useSyncExternalStore(
    wallClock.subscribe,
    wallClock.getSnapshot,
    wallClock.getSnapshot,
  )
  const { locale } = useLocale()
  const release = new Date(set.releasesAt)
  const countdown = formatCountdown(release.getTime() - now, locale)

  return (
    <div className="pack-teaser pointer-events-auto">
      {set.logoUrl ? <img src={set.logoUrl} alt="" className="pack-teaser-logo" /> : null}
      <p className="pack-teaser-text">
        <span className="pack-teaser-eyebrow">{m.upcoming_pack_eyebrow()}</span>
        <span>{m.upcoming_pack_title({ name: set.name })}</span>
        <time
          dateTime={release.toISOString()}
          title={new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(
            release,
          )}
          className="pack-teaser-countdown"
        >
          <span className="sr-only">{countdown}</span>
          <span aria-hidden="true">
            {[...countdown].map((character, index) =>
              /\d/.test(character) ? (
                <span key={index} className="pack-teaser-digit">
                  {character}
                </span>
              ) : (
                character
              ),
            )}
          </span>
        </time>
      </p>
      <button
        type="button"
        className="pack-teaser-dismiss"
        onClick={onDismiss}
        aria-label={m.toast_dismiss()}
      >
        <XIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
