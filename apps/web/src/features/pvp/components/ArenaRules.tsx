import { BookOpenIcon, ZapIcon } from 'lucide-react'
import { PVP_RULES } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { m } from '@/paraglide/messages'

export function ArenaRules() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="arena-outline" size="icon-lg" className="arena-book-trigger" />}
        aria-label={m.pvp_rulebook()}
        title={m.pvp_rulebook()}
      >
        <BookOpenIcon aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="arena-manual" closeLabel={m.pvp_close()}>
        <DialogHeader className="arena-manual-heading">
          <BookOpenIcon className="arena-manual-emblem" aria-hidden="true" />
          <DialogTitle>{m.pvp_rulebook()}</DialogTitle>
          <DialogDescription>{m.pvp_rulebook_intro()}</DialogDescription>
        </DialogHeader>
        <div className="arena-manual-pages">
          <section>
            <h3>
              <span aria-hidden="true">01</span>
              {m.pvp_pick_team()}
            </h3>
            <p>{m.pvp_rule_team({ count: PVP_RULES.teamSize, budget: PVP_RULES.teamBudget })}</p>
            <p className="arena-manual-note">
              {m.pvp_power_rules({
                low: PVP_RULES.lowPowerMaxHp,
                mediumMin: PVP_RULES.lowPowerMaxHp + 1,
                medium: PVP_RULES.mediumPowerMaxHp,
              })}
            </p>
          </section>
          <section>
            <h3>
              <span aria-hidden="true">02</span>
              {m.pvp_rule_energy_title()}
            </h3>
            <p>{m.pvp_rule_energy({ energy: PVP_RULES.energy, max: PVP_RULES.maxCommitment })}</p>
            <div className="arena-manual-intensities" aria-hidden="true">
              <span>
                {m.pvp_feint()}
                <b>
                  0<ZapIcon />
                </b>
              </span>
              <span>
                {m.pvp_impulse()}
                <b>
                  1<ZapIcon />
                </b>
              </span>
              <span>
                {m.pvp_assault()}
                <b>
                  2<ZapIcon />
                </b>
              </span>
              <span>
                {m.pvp_surcharge()}
                <b>
                  3<ZapIcon />
                </b>
              </span>
            </div>
          </section>
          <section>
            <h3>
              <span aria-hidden="true">03</span>
              {m.pvp_rule_duel_title()}
            </h3>
            <p>{m.pvp_rule_duel()}</p>
            <p className="arena-manual-example">{m.pvp_rule_example_detail()}</p>
          </section>
          <section>
            <h3>
              <span aria-hidden="true">04</span>
              {m.pvp_rule_elo_title()}
            </h3>
            <p>{m.pvp_rule_elo({ rating: PVP_RULES.initialElo })}</p>
            <p className="arena-manual-note">
              {m.pvp_timing_rules({
                minutes: PVP_RULES.invitationMinutes,
                seconds: PVP_RULES.roundSeconds,
              })}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
