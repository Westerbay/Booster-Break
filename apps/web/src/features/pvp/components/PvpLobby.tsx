import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import type { PvpMatchView, PvpTeamSelection } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import {
  pvpBoardOptions,
  pvpLobbyOptions,
  pvpMatchOptions,
  pvpTrainerOptions,
} from '@/lib/queries/pvp'
import { m } from '@/paraglide/messages'
import { usePvpCommand } from '../hooks/usePvpCommand'
import { TrainerAvatar } from '@/features/trainers/components/TrainerAvatar'
import { TrainerBanner } from './TrainerBanner'
import { ArenaRules } from './ArenaRules'
import { PvpMatchScreen } from './PvpMatchScreen'
import { TeamComposer } from './TeamComposer'

export function PvpLobby({
  userId,
  initialOpponentId,
  initialInvitationId,
  onResetEntry,
  onBoard,
}: {
  userId: string
  initialOpponentId?: string
  initialInvitationId?: string
  onResetEntry: () => void
  onBoard: () => void
}) {
  const [opponentId, setOpponentId] = useState(initialOpponentId)
  const [invitationId, setInvitationId] = useState(initialInvitationId)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const lobby = useQuery({ ...pvpLobbyOptions(userId), enabled: !matchId })
  const board = useQuery({
    ...pvpBoardOptions(page),
    enabled: !matchId && !opponentId && !invitationId,
  })
  const target = useQuery({
    ...pvpTrainerOptions(opponentId ?? ''),
    enabled: Boolean(opponentId) && !matchId,
  })
  const invitation = useQuery({
    ...pvpMatchOptions(invitationId ?? '', userId),
    enabled: Boolean(invitationId) && !matchId,
  })
  const command = usePvpCommand(userId)
  function openMatch(match: PvpMatchView) {
    setInvitationId(undefined)
    setOpponentId(undefined)
    setMatchId(match.id)
  }
  function back() {
    setMatchId(null)
    setInvitationId(undefined)
    setOpponentId(undefined)
    command.reset()
    onResetEntry()
  }
  function submit(team: PvpTeamSelection[]) {
    if (invitationId)
      command.mutate({ action: 'accept', matchId: invitationId, team }, { onSuccess: openMatch })
    else if (opponentId)
      command.mutate({ action: 'create', opponentId, team }, { onSuccess: openMatch })
  }
  function retryComposer() {
    if (invitationId) void invitation.refetch()
    else void target.refetch()
  }
  function retry() {
    void lobby.refetch()
    void board.refetch()
  }
  function previous() {
    setPage((page) => page - 1)
  }
  function next() {
    setPage((page) => page + 1)
  }
  const resolvedMatchId =
    matchId ??
    (invitation.data &&
    (invitation.data.status !== 'waiting' || invitation.data.opponent.userId !== userId)
      ? invitation.data.id
      : null)
  if (resolvedMatchId)
    return (
      <PvpMatchScreen
        key={resolvedMatchId}
        matchId={resolvedMatchId}
        userId={userId}
        onBack={back}
        onBoard={onBoard}
      />
    )
  const pending =
    lobby.data?.matches.filter(
      (match) => match.status === 'waiting' || match.status === 'active',
    ) ?? []
  const recent = lobby.data?.matches.filter((match) => match.status === 'completed') ?? []
  const occupied = pending.some(
    (match) => match.status === 'active' || match.challenger.userId === userId,
  )
  const composing = Boolean(opponentId || invitationId)
  const opponent = invitationId ? invitation.data?.challenger : target.data?.trainer
  const composerError = invitationId ? invitation.error : target.error
  return (
    <section className="pvp arena-lobby">
      <header className="arena-page-header">
        <div>
          <p className="arena-eyebrow">{m.pvp_lobby_title()}</p>
          <h1>{m.pvp_surcharge()}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ArenaRules />
          <Button variant="outline" onClick={onBoard}>
            {m.pvp_board_link()}
          </Button>
        </div>
      </header>
      {composing ? (
        <>
          <div className="arena-section-title">
            <Button variant="ghost" onClick={back} disabled={command.isPending}>
              <ArrowLeftIcon data-icon="inline-start" />
              {m.pvp_back()}
            </Button>
            {opponent && (
              <div className="flex min-w-0 items-center gap-3">
                <TrainerAvatar name={opponent.name} avatarUrl={opponent.avatarUrl} />
                <h2>
                  {invitationId
                    ? m.pvp_invitation({ name: opponent.name })
                    : m.pvp_challenge({ name: opponent.name })}
                </h2>
              </div>
            )}
          </div>
          {composerError && (
            <div role="alert" className="arena-error">
              <p>{composerError.message}</p>
              <Button onClick={retryComposer}>{m.pvp_retry()}</Button>
            </div>
          )}
          {!opponent && !composerError && <p role="status">{m.pvp_loading()}</p>}
          {opponent && (
            <TeamComposer
              key={invitationId ?? opponentId}
              userId={userId}
              busy={command.isPending}
              error={command.error}
              onConfirm={submit}
              onCancel={back}
              confirmLabel={invitationId ? m.pvp_accept() : m.pvp_send()}
            />
          )}
        </>
      ) : (
        <>
          {lobby.isPending && <p role="status">{m.pvp_loading()}</p>}
          {(lobby.error || board.error) && (
            <div role="alert" className="arena-error">
              <p>{lobby.error?.message ?? board.error?.message}</p>
              <Button onClick={retry}>{m.pvp_retry()}</Button>
            </div>
          )}
          {pending.length > 0 && (
            <div className="arena-section-title">
              <h2>{m.pvp_invites()}</h2>
            </div>
          )}
          <div className="arena-challenge-list">
            {pending.map((match) => {
              const incoming = match.opponent.userId === userId && match.status === 'waiting'
              const other = match.challenger.userId === userId ? match.opponent : match.challenger
              function select() {
                if (incoming) setInvitationId(match.id)
                else setMatchId(match.id)
              }
              function decline() {
                command.mutate({ action: 'leave', matchId: match.id })
              }
              return (
                <article className="arena-challenge" key={match.id}>
                  <TrainerAvatar name={other.name} avatarUrl={other.avatarUrl} />
                  <div>
                    <h3>{incoming ? m.pvp_invitation({ name: other.name }) : other.name}</h3>
                    <p>
                      {other.elo} Elo ·{' '}
                      {match.status === 'active'
                        ? m.pvp_active()
                        : incoming
                          ? m.pvp_pick_team()
                          : m.pvp_waiting()}
                    </p>
                  </div>
                  <Button variant="default" onClick={select} disabled={incoming && occupied}>
                    {incoming ? m.pvp_accept() : m.pvp_active()}
                  </Button>
                  {incoming && (
                    <Button variant="outline" onClick={decline} disabled={command.isPending}>
                      {m.pvp_decline()}
                    </Button>
                  )}
                </article>
              )
            })}
          </div>
          {command.error && (
            <p role="alert" className="arena-error">
              {command.error.message}
            </p>
          )}
          <div className="arena-section-title">
            <h2>{m.pvp_choose_opponent()}</h2>
          </div>
          <div className="arena-roster">
            {board.data?.trainers
              .filter((trainer) => trainer.userId !== userId)
              .map((trainer) => (
                <TrainerBanner
                  key={trainer.userId}
                  trainer={trainer}
                  onSelect={setOpponentId}
                  challenge
                  disabled={occupied}
                />
              ))}
          </div>
          {board.data && board.data.total <= 1 && (
            <p className="arena-empty">{m.pvp_no_trainers()}</p>
          )}
          {board.data && board.data.total > board.data.pageSize && (
            <nav className="arena-pagination" aria-label={m.pvp_choose_opponent()}>
              <Button variant="outline" disabled={page === 1} onClick={previous}>
                {m.pvp_previous()}
              </Button>
              <span>{page}</span>
              <Button
                variant="outline"
                disabled={page * board.data.pageSize >= board.data.total}
                onClick={next}
              >
                {m.pvp_next()}
              </Button>
            </nav>
          )}
          {recent.length > 0 && (
            <>
              <div className="arena-section-title">
                <h2>{m.pvp_recent()}</h2>
              </div>
              <div className="arena-recent-matches">
                {recent.map((match) => {
                  const other =
                    match.challenger.userId === userId ? match.opponent : match.challenger
                  let result = m.pvp_round_draw()
                  if (match.winnerId)
                    result = match.winnerId === userId ? m.pvp_victory() : m.pvp_defeat()
                  function select() {
                    setMatchId(match.id)
                  }
                  return (
                    <button type="button" onClick={select} key={match.id}>
                      <TrainerAvatar name={other.name} avatarUrl={other.avatarUrl} />
                      <strong>{other.name}</strong>
                      <span>{result}</span>
                      <span>
                        {(match.eloChange ?? 0) > 0 ? '+' : ''}
                        {match.eloChange} Elo
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
