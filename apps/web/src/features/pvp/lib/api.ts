import { api } from '@/lib/api-client'
import { m } from '@/paraglide/messages'
import type { PvpChoice, PvpTeamSelection } from '@tcg-collection/shared'

type PvpCommand =
  | { action: 'create'; opponentId: string; team: PvpTeamSelection[] }
  | { action: 'accept'; matchId: string; team: PvpTeamSelection[] }
  | { action: 'choose'; matchId: string; choice: PvpChoice }
  | { action: 'leave'; matchId: string }

export function pvpData<T>(result: { data: T | null; error: unknown }): T {
  if (result.error || result.data === null) throw pvpError(result.error)
  return result.data
}

function pvpError(error: unknown): Error {
  let code = ''
  if (typeof error === 'object' && error && 'value' in error) {
    const value = error.value
    if (typeof value === 'object' && value && 'error' in value && typeof value.error === 'string')
      code = value.error
  }
  const messages: Record<string, () => string> = {
    pvp_busy: m.pvp_error_busy,
    pvp_invalid_team: m.pvp_error_team,
    pvp_card_unavailable: m.pvp_error_card,
    pvp_invalid_choice: m.pvp_error_choice,
    pvp_choice_locked: m.pvp_error_locked,
    pvp_closed: m.pvp_error_closed,
    pvp_not_found: m.pvp_error_not_found,
    pvp_forbidden: m.pvp_error_forbidden,
    pvp_self_challenge: m.pvp_error_forbidden,
    unauthenticated: m.pvp_sign_in,
  }
  return new Error((messages[code] ?? m.pvp_error_generic)())
}

export async function runPvpCommand(command: PvpCommand) {
  switch (command.action) {
    case 'create':
      return pvpData(
        await api.pvp.matches.post({ opponentId: command.opponentId, team: command.team }),
      )
    case 'accept':
      return pvpData(
        await api.pvp.matches({ matchId: command.matchId }).accept.post({ team: command.team }),
      )
    case 'choose':
      return pvpData(
        await api.pvp.matches({ matchId: command.matchId }).choice.post(command.choice),
      )
    case 'leave':
      return pvpData(await api.pvp.matches({ matchId: command.matchId }).leave.post())
  }
}
