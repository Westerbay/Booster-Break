import type { AnimationEvent, CSSProperties } from 'react'
import type { CombatCard, PvpMatchView, PvpRound } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'
import { CardPreview } from '@/features/dashboard/components/CardPreview'
import { BattleCardImage } from './BattleCardImage'
import { TrainerAvatar } from '@/features/trainers/components/TrainerAvatar'
import { ArenaBackdrop } from '@/components/game/ArenaBackdrop'

interface BattleArenaProps {
  match: PvpMatchView
  userId: string
  card?: CombatCard
  round?: PvpRound
  animate?: boolean
  onSequenceEnd?: () => void
}

const elements: Record<string, string> = {
  Fire: 'fire',
  Water: 'water',
  Lightning: 'lightning',
  Grass: 'grass',
  Psychic: 'psychic',
  Darkness: 'psychic',
  Dragon: 'lightning',
}

export function BattleArena({
  match,
  userId,
  card,
  round,
  animate = true,
  onSequenceEnd,
}: BattleArenaProps) {
  const challenger = match.challenger.userId === userId
  const self = challenger ? match.challenger : match.opponent
  const enemy = challenger ? match.opponent : match.challenger
  const own = challenger ? round?.challenger : round?.opponent
  const other = challenger ? round?.opponent : round?.challenger
  const ownCard = own?.card ?? card
  const winner = round?.winnerId === userId ? 'self' : 'enemy'
  const tie = round?.winnerId === null
  const attacker = winner === 'self' ? own?.card : other?.card
  const element = elements[attacker?.types[0] ?? ''] ?? 'neutral'
  const rounds = match.rounds.filter((entry) => entry.number <= (round?.number ?? match.round))
  const ownScore = rounds.filter((entry) => entry.winnerId === userId).length
  const otherScore = rounds.filter((entry) => entry.winnerId === enemy.userId).length
  function sequenceEnded(event: AnimationEvent<HTMLDivElement>) {
    if (event.animationName === 'arena-sequence' && event.target === event.currentTarget)
      onSequenceEnd?.()
  }
  return (
    <div
      className="arena-stage"
      data-playing={Boolean(round) && animate}
      data-winner={tie ? 'tie' : winner}
      data-element={element}
      onAnimationEnd={sequenceEnded}
    >
      <ArenaBackdrop />
      <div className="arena-stage-top">
        <div>
          <span className="arena-eyebrow">{m.pvp_lobby_title()}</span>
          <h2>{m.pvp_surcharge()}</h2>
        </div>
        <span className="arena-round-label">
          {m.pvp_round({ round: Math.min(round?.number ?? match.round, 3) })}
        </span>
      </div>
      <div className="arena-fighters">
        <div className="arena-fighter-identity">
          <TrainerAvatar name={self.name} avatarUrl={self.avatarUrl} />
          <div>
            <strong>
              {self.name} · {m.pvp_you()}
            </strong>
            <span>{self.elo} Elo</span>
          </div>
        </div>
        <b aria-label={`${ownScore} : ${otherScore}`}>
          {ownScore} : {otherScore}
        </b>
        <div className="arena-fighter-identity">
          <TrainerAvatar name={enemy.name} avatarUrl={enemy.avatarUrl} />
          <div>
            <strong>{enemy.name}</strong>
            <span>{enemy.elo} Elo</span>
          </div>
        </div>
      </div>
      <div className="arena-world">
        <div className="arena-fighter-card arena-self">
          <div className="arena-card-object">
            {ownCard ? (
              <CardPreview card={ownCard}>
                <BattleCardImage key={`${ownCard.id}-${ownCard.finish}`} card={ownCard} />
              </CardPreview>
            ) : (
              <span className="arena-card-back">
                <b>BB</b>
              </span>
            )}
            <span className="arena-power-chip">{own?.strength ?? ownCard?.power ?? '?'}</span>
          </div>
          <div className="arena-fighter-meta">
            <strong>{ownCard?.name ?? m.pvp_pick_card()}</strong>
            {own && (
              <span>
                {own.card.power} + {own.energy}
                {own.typeBonus > 0 && (
                  <>
                    {' '}
                    + {own.typeBonus}
                    <small>{m.pvp_type_bonus()}</small>
                  </>
                )}
              </span>
            )}
          </div>
        </div>
        <span className="arena-versus" aria-hidden="true">
          VS
        </span>
        <div className="arena-fighter-card arena-enemy">
          <div className="arena-card-object">
            {other ? (
              <CardPreview card={other.card}>
                <BattleCardImage key={`${other.card.id}-${other.card.finish}`} card={other.card} />
              </CardPreview>
            ) : (
              <span className="arena-card-back">
                <b>BB</b>
                <small>{m.pvp_hidden()}</small>
              </span>
            )}
            <span className="arena-power-chip">{other?.strength ?? '?'}</span>
          </div>
          <div className="arena-fighter-meta">
            <strong>{other?.card.name ?? m.pvp_hidden()}</strong>
            {other && (
              <span>
                {other.card.power} + {other.energy}
                {other.typeBonus > 0 && (
                  <>
                    {' '}
                    + {other.typeBonus}
                    <small>{m.pvp_type_bonus()}</small>
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
      {round && animate && !tie && (
        <div className="arena-effects" aria-hidden="true">
          <div className="arena-charge-ring" />
          <div className="arena-projectile" />
          <div className="arena-impact" />
          {Array.from({ length: 18 }, (_, index) => {
            const style: CSSProperties & { '--angle': string; '--distance': string } = {
              '--angle': `${index * 20}deg`,
              '--distance': `${65 + (index % 5) * 22}px`,
            }
            return <i className="arena-spark" key={index} style={style} />
          })}
          <span className="arena-ko">K.O.</span>
        </div>
      )}
    </div>
  )
}
