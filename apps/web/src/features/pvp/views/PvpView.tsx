import { useQuery } from '@tanstack/react-query'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { m } from '@/paraglide/messages'
import { ArenaRules } from '../components/ArenaRules'
import { PvpLobby } from '../components/PvpLobby'

export function PvpView({
  opponentId,
  invitationId,
  onResetEntry,
  onBoard,
}: {
  opponentId?: string
  invitationId?: string
  onResetEntry: () => void
  onBoard: () => void
}) {
  const auth = useQuery(useCurrentUserQueryOption())
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
      onResetEntry={onResetEntry}
      onBoard={onBoard}
    />
  )
}
