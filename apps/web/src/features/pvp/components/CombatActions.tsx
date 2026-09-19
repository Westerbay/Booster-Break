import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Toggle } from '@base-ui/react/toggle'
import { FlameIcon, SwordsIcon, WindIcon, ZapIcon } from 'lucide-react'
import { PVP_RULES } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

export function CombatActions({
  energy,
  availableEnergy,
  power,
  locked,
  pending,
  canSubmit,
  onEnergyChange,
  onSubmit,
}: {
  energy: number
  availableEnergy: number
  power: number
  locked: boolean
  pending: boolean
  canSubmit: boolean
  onEnergyChange: (energy: number) => void
  onSubmit: () => void
}) {
  const actions = [
    { name: m.pvp_feint(), hint: m.pvp_feint_hint(), icon: WindIcon },
    { name: m.pvp_impulse(), hint: m.pvp_impulse_hint(), icon: ZapIcon },
    { name: m.pvp_assault(), hint: m.pvp_assault_hint(), icon: SwordsIcon },
    { name: m.pvp_surcharge(), hint: m.pvp_surcharge_hint(), icon: FlameIcon },
  ]
  const selected = [String(energy)]
  function change(values: string[]) {
    if (values[0] !== undefined) onEnergyChange(Number(values[0]))
  }
  return (
    <div className="arena-command" data-energy={energy}>
      <div className="arena-command-header">
        <h3>{locked ? m.pvp_sealed() : m.pvp_intensity()}</h3>
        <div className="arena-energy-bank">
          <span className="arena-crystals" aria-hidden="true">
            {Array.from({ length: PVP_RULES.energy }, (_, index) => (
              <i
                key={index}
                data-committed={index < energy}
                data-spent={index >= availableEnergy}
              />
            ))}
          </span>
          <strong>{m.pvp_reserve({ count: Math.max(0, availableEnergy - energy) })}</strong>
        </div>
      </div>
      <ToggleGroup
        className="arena-action-deck"
        value={selected}
        onValueChange={change}
        disabled={locked || pending}
        aria-label={m.pvp_intensity()}
      >
        {actions.map((action, cost) => {
          const Icon = action.icon
          return (
            <Toggle
              key={cost}
              className="arena-action"
              value={String(cost)}
              data-energy={cost}
              disabled={cost > availableEnergy}
              aria-label={`${action.name}, ${m.pvp_energy_cost({ count: cost })}`}
            >
              <span className="arena-action-cost">
                {cost}
                <ZapIcon aria-hidden="true" />
              </span>
              <span className="arena-action-sigil">
                <Icon aria-hidden="true" />
              </span>
              <strong>{action.name}</strong>
              <span>{action.hint}</span>
              <small>{m.pvp_force_value({ value: power + cost })}</small>
            </Toggle>
          )
        })}
      </ToggleGroup>
      <div className="arena-command-bottom">
        <div className="arena-force-preview" aria-live="polite">
          <b>{power + energy}</b>
          <span>
            <strong>{m.pvp_force()}</strong>
            <span>{m.pvp_force_detail({ base: power, energy })}</span>
            <small>{m.pvp_before_type()}</small>
          </span>
        </div>
        <Button
          variant="arena"
          size="lg"
          disabled={!canSubmit || locked || pending}
          onClick={onSubmit}
        >
          <span>{pending ? m.pvp_sending() : m.pvp_seal()}</span>
          <SwordsIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
