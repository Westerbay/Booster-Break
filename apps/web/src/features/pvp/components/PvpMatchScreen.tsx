import { useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReducedMotion } from 'motion/react'
import { ArrowLeftIcon, FlagIcon, RotateCcwIcon, SwordsIcon } from 'lucide-react'
import type { PvpMatchView, PvpRound } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { wallClock } from '@/lib/clock'
import { pvpMatchOptions } from '@/lib/queries/pvp'
import { m } from '@/paraglide/messages'
import { usePvpCommand } from '../hooks/usePvpCommand'
import { ArenaRules } from './ArenaRules'
import { BattleArena } from './BattleArena'
import { CardPreview } from '@/features/dashboard/components/CardPreview'
import { BattleCardImage } from './BattleCardImage'
import { CombatActions } from './CombatActions'

export function PvpMatchScreen({
  matchId,
  userId,
  onBack,
  onBoard,
}: {
  matchId: string
  userId: string
  onBack: () => void
  onBoard: () => void
}) {
  const query = useQuery(pvpMatchOptions(matchId, userId))
  const [seenRound, setSeenRound] = useState(0)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const command = usePvpCommand(userId)
  const match = query.data
  const round = match?.rounds.find((entry) => entry.number > seenRound)
  const active = match?.status === 'active'
  const waiting = match?.status === 'waiting'
  function retry() {
    void query.refetch()
  }
  function leave() {
    command.mutate({ action: 'leave', matchId })
    setConfirmLeave(false)
  }
  function requestLeave() {
    if (active) setConfirmLeave(true)
    else leave()
  }
  function cancelLeave() {
    setConfirmLeave(false)
  }
  function nextRound() {
    if (round) setSeenRound(round.number)
  }
  return (
    <section className="pvp arena-match">
      <div className="arena-match-toolbar">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" />
          {m.pvp_back()}
        </Button>
        <div className="flex items-center gap-2">
          <ArenaRules />
          {(active || waiting) && (
            <Button variant="ghost" onClick={requestLeave} disabled={command.isPending}>
              <FlagIcon data-icon="inline-start" />
              {active ? m.pvp_leave() : m.pvp_cancel()}
            </Button>
          )}
        </div>
      </div>
      {confirmLeave && (
        <div className="arena-forfeit-confirm" role="group" aria-label={m.pvp_leave_confirm()}>
          <strong>{m.pvp_leave_confirm()}</strong>
          <p>{m.pvp_leave_detail()}</p>
          <Button variant="outline" onClick={cancelLeave}>
            {m.pvp_back()}
          </Button>
          <Button variant="destructive" onClick={leave}>
            {m.pvp_leave()}
          </Button>
        </div>
      )}
      {query.isPending && <p role="status">{m.pvp_loading()}</p>}
      {query.error && (
        <div role="alert" className="arena-error">
          <p>{query.error.message}</p>
          <Button onClick={retry}>{m.pvp_retry()}</Button>
        </div>
      )}
      {command.error && (
        <p role="alert" className="arena-error">
          {command.error.message}
        </p>
      )}
      {match &&
        (round ? (
          <RoundSequence
            key={round.number}
            match={match}
            round={round}
            userId={userId}
            onNext={nextRound}
          />
        ) : (
          <>
            {active ? (
              <RoundChoice key={match.round} match={match} userId={userId} />
            ) : (
              <BattleArena
                match={match}
                userId={userId}
                card={match.team[0]}
                round={match.rounds.at(-1)}
                animate={false}
              />
            )}
            {waiting && (
              <div className="arena-result" role="status">
                <SwordsIcon aria-hidden="true" />
                <h2>{m.pvp_waiting()}</h2>
              </div>
            )}
            {(match.status === 'completed' || match.status === 'cancelled') && (
              <MatchResult match={match} userId={userId} onBoard={onBoard} />
            )}
          </>
        ))}
    </section>
  )
}

function RoundChoice({ match, userId }: { match: PvpMatchView; userId: string }) {
  const side = match.challenger.userId === userId ? 'challenger' : 'opponent'
  const used = new Set(match.rounds.map((round) => round[side].card.id))
  const available = match.team.filter((card) => !used.has(card.id))
  const [cardId, setCardId] = useState(match.choice?.cardId ?? available[0]?.id)
  const [energy, setEnergy] = useState(match.choice?.energy ?? Math.min(1, match.energyRemaining))
  const card = available.find((card) => card.id === (match.choice?.cardId ?? cardId))
  const command = usePvpCommand(userId)
  const committed = match.choice?.energy ?? energy
  const availableEnergy = match.energyRemaining + (match.choice?.energy ?? 0)
  function seal() {
    if (card)
      command.mutate({
        action: 'choose',
        matchId: match.id,
        choice: { round: match.round, cardId: card.id, energy },
      })
  }
  return (
    <>
      <BattleArena match={match} userId={userId} card={card} />
      <div className="arena-round-status" aria-live="polite">
        <div>
          <strong>{match.choice ? m.pvp_sealed() : m.pvp_ready()}</strong>
          <p>{match.opponentReady ? m.pvp_opponent_ready() : m.pvp_reveal_hint()}</p>
        </div>
        <ArenaDeadline expiresAt={match.expiresAt} />
      </div>
      <div className="arena-combat-team" role="group" aria-label={m.pvp_pick_card()}>
        {match.team.map((entry) => {
          const isUsed = used.has(entry.id)
          function select() {
            setCardId(entry.id)
          }
          return (
            <div
              key={entry.id}
              className="arena-combat-choice"
              data-selected={entry.id === card?.id}
              data-used={isUsed}
            >
              <CardPreview card={entry}>
                <BattleCardImage card={entry} />
              </CardPreview>
              <button
                type="button"
                className="arena-combat-select"
                aria-pressed={entry.id === card?.id}
                disabled={isUsed || Boolean(match.choice) || command.isPending}
                onClick={select}
                aria-label={m.pvp_select_card({ name: entry.name, power: entry.power })}
              >
                <strong>{entry.name}</strong>
                <small>{m.pvp_force_value({ value: entry.power })}</small>
                <span className="arena-combat-select-label">
                  {entry.id === card?.id ? m.trade_used() : m.card_choose()}
                </span>
              </button>
              {isUsed && (
                <span className="arena-used-mark" aria-hidden="true">
                  ×
                </span>
              )}
            </div>
          )
        })}
      </div>
      <CombatActions
        energy={committed}
        availableEnergy={availableEnergy}
        power={card?.power ?? 0}
        locked={Boolean(match.choice)}
        pending={command.isPending}
        canSubmit={Boolean(card) && committed <= availableEnergy}
        onEnergyChange={setEnergy}
        onSubmit={seal}
      />
      {command.error && (
        <p role="alert" className="arena-error">
          {command.error.message}
        </p>
      )}
    </>
  )
}

function RoundSequence({
  match,
  round,
  userId,
  onNext,
}: {
  match: PvpMatchView
  round: PvpRound
  userId: string
  onNext: () => void
}) {
  const reduced = useReducedMotion()
  const [done, setDone] = useState(false)
  const [replay, setReplay] = useState(0)
  let title = m.pvp_round_draw()
  if (round.winnerId) title = round.winnerId === userId ? m.pvp_round_win() : m.pvp_round_loss()
  function sequenceEnd() {
    setDone(true)
  }
  function replayRound() {
    setDone(false)
    setReplay((value) => value + 1)
  }
  const ready = done || reduced === true
  return (
    <>
      <BattleArena
        key={replay}
        match={match}
        userId={userId}
        round={round}
        onSequenceEnd={sequenceEnd}
      />
      <div className="arena-result" data-ready={ready} aria-live="polite">
        <h2>{ready ? title : m.pvp_reveal_hint()}</h2>
        {match.status === 'active' && <ArenaDeadline expiresAt={match.expiresAt} />}
        <div>
          <Button variant="arena-outline" onClick={replayRound} disabled={!ready}>
            <RotateCcwIcon data-icon="inline-start" />
            {m.pvp_replay()}
          </Button>
          <Button variant="arena" onClick={onNext} disabled={!ready}>
            {round.number < match.rounds.length || match.status === 'active'
              ? m.pvp_next_round()
              : m.pvp_result_open()}
          </Button>
        </div>
      </div>
    </>
  )
}

function MatchResult({
  match,
  userId,
  onBoard,
}: {
  match: PvpMatchView
  userId: string
  onBoard: () => void
}) {
  let title = m.pvp_round_draw()
  if (match.status === 'cancelled') title = m.pvp_cancelled()
  else if (match.winnerId) title = match.winnerId === userId ? m.pvp_victory() : m.pvp_defeat()
  return (
    <div className="arena-result" role="status">
      <h2>{title}</h2>
      {match.eloChange !== null && (
        <p className="arena-result-elo">
          {match.eloChange > 0 ? '+' : ''}
          {match.eloChange} Elo
        </p>
      )}
      {match.reason === 'timeout' && <p>{m.pvp_timeout()}</p>}
      {match.reason === 'forfeit' && <p>{m.pvp_forfeit()}</p>}
      <Button variant="arena" onClick={onBoard}>
        {m.pvp_board_link()}
      </Button>
    </div>
  )
}

function ArenaDeadline({ expiresAt }: { expiresAt: string }) {
  const now = useSyncExternalStore(
    wallClock.subscribe,
    wallClock.getSnapshot,
    wallClock.getSnapshot,
  )
  const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000))
  return (
    <time dateTime={expiresAt} data-urgent={seconds <= 15}>
      {m.pvp_time_left({ seconds })}
    </time>
  )
}
