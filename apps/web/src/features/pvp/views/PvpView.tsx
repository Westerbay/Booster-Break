import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { m } from '@/paraglide/messages'
import { ArenaRules } from '../components/ArenaRules'
import { PvpLobby } from '../components/PvpLobby'

const duelsRoute = getRouteApi('/_dashboard/duels')

export function PvpView() {
  const { invitation: invitationId, opponent } = duelsRoute.useSearch()
  const opponentId = invitationId ? undefined : opponent
  const navigate = duelsRoute.useNavigate()
  const auth = useQuery(useCurrentUserQueryOption())

  function resetEntry() {
    if (invitationId || opponent) {
      void navigate({ to: '/duels', search: {}, replace: true })
    }
  }

  function openBoard() {
    void navigate({ to: '/trainers' })
  }
  if (!auth.data?.authenticated)
    return (
      <section className="pvp">
        <header className="arena-page-header">
          <div>
            <p className="arena-eyebrow">{m.pvp_lobby_title()}</p>
            <h1>{m.pvp_surcharge()}</h1>
          </div>
          <ArenaRules />
        </header>
        <p className="arena-empty">{auth.isPending ? m.pvp_loading() : m.pvp_sign_in()}</p>
      </section>
    )
  return (
    <PvpLobby
      key={`${auth.data.user.id}:${opponentId ?? ''}:${invitationId ?? ''}`}
      userId={auth.data.user.id}
      initialOpponentId={opponentId}
      initialInvitationId={invitationId}
      onResetEntry={resetEntry}
      onBoard={openBoard}
    />
  )
}
