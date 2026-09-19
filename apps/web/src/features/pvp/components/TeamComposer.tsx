import { useState } from 'react'
import { SwordsIcon, XIcon, ZapIcon } from 'lucide-react'
import { PVP_RULES, type CombatCard, type PvpTeamSelection } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { CombatCardPicker } from './CombatCardPicker'
import { CardPreview } from '@/features/dashboard/components/CardPreview'
import { BattleCardImage } from './BattleCardImage'

export function TeamComposer({
  userId,
  busy,
  error,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  userId: string
  busy: boolean
  error?: Error | null
  confirmLabel: string
  onConfirm: (team: PvpTeamSelection[]) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<CombatCard[]>([])
  const power = selected.reduce((total, card) => total + card.power, 0)
  const valid = selected.length === PVP_RULES.teamSize && power <= PVP_RULES.teamBudget
  function submit() {
    onConfirm(selected.map((card) => ({ cardId: card.id, finish: card.finish })))
  }
  function toggle(card: CombatCard) {
    setSelected((current) => {
      if (current.some((item) => item.id === card.id))
        return current.filter((item) => item.id !== card.id)
      if (
        current.length >= PVP_RULES.teamSize ||
        current.reduce((sum, item) => sum + item.power, 0) + card.power > PVP_RULES.teamBudget
      )
        return current
      return [...current, card]
    })
  }
  return (
    <div className="arena-team-builder">
      <div className="arena-section-title arena-team-heading">
        <div>
          <h2>{m.pvp_pick_team()}</h2>
          <p>{m.pvp_picker_description()}</p>
        </div>
        <div className="arena-team-budget" aria-live="polite">
          <span>{m.pvp_team_budget({ count: selected.length, power })}</span>
          <span className="arena-budget-track" aria-hidden="true">
            {Array.from({ length: PVP_RULES.teamBudget }, (_, index) => (
              <i key={index} data-spent={index < power} />
            ))}
          </span>
        </div>
      </div>
      <div className="arena-team-slots">
        {Array.from({ length: PVP_RULES.teamSize }, (_, index) => {
          const card = selected[index]
          function remove() {
            if (card) toggle(card)
          }
          return (
            <figure className="arena-team-position" key={index} data-filled={Boolean(card)}>
              <div className="arena-team-slot">
                {card ? (
                  <>
                    <CardPreview card={card}>
                      <BattleCardImage key={`${card.id}-${card.finish}`} card={card} />
                    </CardPreview>
                    <Button
                      variant="arena-outline"
                      size="icon-lg"
                      className="arena-team-remove"
                      onClick={remove}
                      disabled={busy}
                      aria-label={m.pvp_remove_card({ name: card.name })}
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                    <span
                      className="arena-team-power"
                      aria-label={m.pvp_card_power({ power: card.power, hp: card.hp })}
                    >
                      <ZapIcon aria-hidden="true" />
                      {card.power}
                    </span>
                  </>
                ) : (
                  <span className="arena-slot-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                )}
              </div>
              {card && <figcaption>{card.name}</figcaption>}
            </figure>
          )
        })}
      </div>
      <div className="arena-team-search">
        <CombatCardPicker userId={userId} selected={selected} busy={busy} onToggle={toggle} />
      </div>
      {error && (
        <p role="alert" className="arena-error">
          {error.message}
        </p>
      )}
      <div className="arena-composer-actions">
        <Button variant="arena-outline" onClick={onCancel} disabled={busy}>
          {m.pvp_back()}
        </Button>
        <Button variant="arena" size="lg" onClick={submit} disabled={!valid || busy}>
          <SwordsIcon data-icon="inline-start" />
          {busy ? m.pvp_sending() : confirmLabel}
        </Button>
      </div>
    </div>
  )
}
