import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useLocale } from '@/features/i18n/useLocale'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { usePokemonLeaderboardQueryOption } from '@/lib/queries/pokemon'
import {
  getLeaderboardConfig,
  leaderboardOptions,
  type LeaderboardKind,
} from '../lib/leaderboard-config'

export const useLeaderboardPage = () => {
  const { locale } = useLocale()
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardKind>(leaderboardOptions[0])
  const auth = useQuery(useCurrentUserQueryOption())
  const leaderboard = useQuery(usePokemonLeaderboardQueryOption())
  const players = (leaderboard.data?.[activeLeaderboard] ?? []).map((player) => ({
    ...player,
    score: activeLeaderboard === 'mostCards' ? player.totalCards : player.uniqueCards,
  }))
  const activeConfig = getLeaderboardConfig(activeLeaderboard)

  return {
    activeConfig,
    activeLeaderboard,
    auth,
    leaderboard,
    numberFormatter: new Intl.NumberFormat(locale),
    players,
    setActiveLeaderboard,
  }
}
