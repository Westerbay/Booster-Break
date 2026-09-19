import { useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { setStoredDashboardTab } from '@/features/dashboard/lib/dashboard-tab-storage'
import { useLocale } from '@/features/i18n/useLocale'
import { wallClock } from '@/lib/clock'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { pvpLobbyOptions } from '@/lib/queries/pvp'
import { useTradeNotificationsQueryOption } from '@/lib/queries/trade'
import { PvpInvitationModal } from './PvpInvitationModal'

export function PvpNotificationManager() {
  const auth = useQuery(useCurrentUserQueryOption())
  if (!auth.data?.authenticated) return null
  return <IncomingChallenges key={auth.data.user.id} userId={auth.data.user.id} />
}

function IncomingChallenges({ userId }: { userId: string }) {
  useLocale()
  const navigate = useNavigate()
  const { invitation } = useSearch({ strict: false })
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())
  const lobby = useQuery(pvpLobbyOptions(userId))
  // The trade manager owns fetching; wait until its current notification is dismissed.
  const trade = useQuery(useTradeNotificationsQueryOption(false))
  const now = useSyncExternalStore(
    wallClock.subscribe,
    wallClock.getSnapshot,
    wallClock.getSnapshot,
  )
  const matches = lobby.data?.matches ?? []
  const occupied = matches.some(
    (match) =>
      match.status === 'active' ||
      (match.status === 'waiting' && match.challenger.userId === userId),
  )
  const incoming = matches.find(
    (match) =>
      match.status === 'waiting' &&
      match.opponent.userId === userId &&
      match.id !== invitation &&
      !dismissedIds.has(match.id) &&
      new Date(match.expiresAt).getTime() > now,
  )
  if (!incoming || invitation || occupied || trade.data?.notifications.length) return null

  function dismiss() {
    if (incoming) setDismissedIds((current) => new Set(current).add(incoming.id))
  }
  function prepare() {
    if (!incoming) return
    dismiss()
    setStoredDashboardTab('pvp')
    void navigate({ to: '/', search: { invitation: incoming.id } })
  }

  return (
    <PvpInvitationModal
      key={incoming.id}
      match={incoming}
      userId={userId}
      onPrepare={prepare}
      onDismiss={dismiss}
    />
  )
}
