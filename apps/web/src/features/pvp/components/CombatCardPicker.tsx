import { useDeferredValue, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilterIcon, SearchIcon, XIcon, ZapIcon } from 'lucide-react'
import {
  pokemonRarityOrder,
  PVP_RULES,
  type CombatCard,
  type PvpCardFilters,
} from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CardPreview } from '@/features/dashboard/components/CardPreview'
import { CollectionCardItem } from '@/features/dashboard/components/CollectionCardItem'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { pvpCardsOptions } from '@/lib/queries/pvp'
import { BattleCardImage } from './BattleCardImage'
import { m } from '@/paraglide/messages'

export function CombatCardPicker({
  userId,
  selected,
  busy,
  onToggle,
}: {
  userId: string
  selected: CombatCard[]
  busy: boolean
  onToggle: (card: CombatCard) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<PvpCardFilters>({})
  const deferredSearch = useDeferredValue(search)
  const cards = useQuery({
    ...pvpCardsOptions(userId, page, deferredSearch, filters),
    enabled: open,
  })
  const power = selected.reduce((total, card) => total + card.power, 0)
  const filterCount = Number(Boolean(filters.rarity)) + Number(Boolean(filters.finish))
  function searchCards(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value)
    setPage(1)
  }
  function rarityChanged(rarity: string) {
    setFilters((current) => ({ ...current, rarity: rarity || undefined }))
    setPage(1)
  }
  function finishChanged(finish: string) {
    if (finish === '' || finish === 'normal' || finish === 'holo' || finish === 'reverse_holo') {
      setFilters((current) => ({ ...current, finish: finish || undefined }))
      setPage(1)
    }
  }
  function resetFilters() {
    setFilters({})
    setSearch('')
    setPage(1)
  }
  function previous() {
    setPage((value) => value - 1)
  }
  function next() {
    setPage((value) => value + 1)
  }
  function retry() {
    void cards.refetch()
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="arena-outline" size="lg" />} disabled={busy}>
        <SearchIcon data-icon="inline-start" />
        {m.pvp_search_cards()}
      </DialogTrigger>
      <DialogContent className="arena-card-picker" closeLabel={m.pvp_close()}>
        <DialogHeader className="arena-picker-heading">
          <DialogTitle>{m.pvp_pick_team()}</DialogTitle>
          <DialogDescription>{m.pvp_picker_description()}</DialogDescription>
        </DialogHeader>
        <div className="arena-picker-tools">
          <label className="arena-picker-search">
            <span>{m.pvp_search_cards()}</span>
            <span className="arena-picker-search-field">
              <SearchIcon aria-hidden="true" />
              <input
                type="search"
                value={search}
                maxLength={100}
                onChange={searchCards}
                placeholder={m.trade_search_by_pokemon_placeholder()}
              />
            </span>
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="arena-outline" className="min-h-11" />}>
              <FilterIcon data-icon="inline-start" />
              {m.card_filters_label()}
              {filterCount > 0 && ` (${filterCount})`}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{m.pvp_filter_finish()}</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filters.finish ?? ''} onValueChange={finishChanged}>
                  <DropdownMenuRadioItem value="">{m.pvp_all_finishes()}</DropdownMenuRadioItem>
                  {['normal', 'holo', 'reverse_holo'].map((finish) => (
                    <DropdownMenuRadioItem key={finish} value={finish}>
                      {formatCardFinish(finish)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{m.sort_rarity()}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  className="max-h-48 overflow-y-auto"
                  value={filters.rarity ?? ''}
                  onValueChange={rarityChanged}
                >
                  <DropdownMenuRadioItem value="">
                    {m.card_filters_any_rarity()}
                  </DropdownMenuRadioItem>
                  {pokemonRarityOrder.map((rarity) => (
                    <DropdownMenuRadioItem key={rarity} value={rarity}>
                      {formatRarity(rarity)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {filterCount > 0 && (
          <div className="arena-picker-filters">
            {filters.rarity && <span>{formatRarity(filters.rarity)}</span>}
            {filters.finish && (
              <span>
                {filters.rarity ? '· ' : ''}
                {formatCardFinish(filters.finish)}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {m.card_filters_reset()}
            </Button>
          </div>
        )}
        <div className="arena-picker-inventory" aria-busy={cards.isFetching}>
          {cards.isPending && (
            <div role="status">
              <p className="sr-only">{m.pvp_loading()}</p>
              <div className="arena-picker-grid" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="arena-picker-skeleton" />
                ))}
              </div>
            </div>
          )}
          {cards.error && (
            <div role="alert" className="flex flex-col items-center gap-3 py-8">
              <p>{cards.error.message}</p>
              <Button onClick={retry}>{m.pvp_retry()}</Button>
            </div>
          )}
          <div className="arena-picker-grid">
            {cards.data?.cards.map((card) => {
              const chosen = selected.some(
                (item) => item.id === card.id && item.finish === card.finish,
              )
              const duplicate = selected.some((item) => item.id === card.id) && !chosen
              const disabled =
                busy ||
                duplicate ||
                (!chosen &&
                  (selected.length >= PVP_RULES.teamSize ||
                    power + card.power > PVP_RULES.teamBudget))
              function select() {
                onToggle(card)
              }
              return (
                <CollectionCardItem
                  key={`${card.id}-${card.finish}`}
                  card={card}
                  className="arena-picker-card"
                  artwork={<BattleCardImage card={card} />}
                  previewable
                  selected={chosen}
                  disabled={disabled}
                  onSelect={select}
                  selectionLabel={
                    chosen
                      ? m.pvp_remove_card({ name: card.name })
                      : m.pvp_select_card({ name: card.name, power: card.power })
                  }
                  badge={chosen ? m.trade_used() : undefined}
                >
                  <p className="arena-picker-power">
                    <ZapIcon aria-hidden="true" />
                    {m.pvp_card_power({ power: card.power, hp: card.hp })}
                  </p>
                </CollectionCardItem>
              )
            })}
          </div>
          {cards.data && !cards.data.cards.length && (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
              <p>{m.pvp_no_eligible_cards()}</p>
              {(filterCount > 0 || search) && (
                <Button variant="outline" onClick={resetFilters}>
                  {m.card_filters_reset()}
                </Button>
              )}
            </div>
          )}
        </div>
        {(page > 1 || cards.data?.hasMore) && (
          <nav className="arena-picker-pagination" aria-label={m.pvp_search_cards()}>
            <Button variant="outline" disabled={page === 1 || cards.isFetching} onClick={previous}>
              {m.pvp_previous()}
            </Button>
            <span>{page}</span>
            <Button
              variant="outline"
              disabled={!cards.data?.hasMore || cards.isFetching}
              onClick={next}
            >
              {m.pvp_next()}
            </Button>
          </nav>
        )}
        <div className="arena-picker-selection">
          {selected.length > 0 && (
            <div className="arena-picker-selected-cards">
              {selected.map((card) => {
                function remove() {
                  onToggle(card)
                }
                return (
                  <div key={card.id} className="arena-picker-selected-card">
                    <CardPreview card={card} className="arena-picker-miniature">
                      <BattleCardImage card={card} />
                    </CardPreview>
                    <Button
                      variant="arena-outline"
                      size="sm"
                      onClick={remove}
                      disabled={busy}
                      aria-label={m.pvp_remove_card({ name: card.name })}
                    >
                      <span className="arena-picker-selected-name">{card.name}</span>
                      <XIcon data-icon="inline-end" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
          <div className="arena-picker-confirm">
            <div className="arena-team-budget" aria-live="polite">
              <span>{m.pvp_team_budget({ count: selected.length, power })}</span>
              <span className="arena-budget-track" aria-hidden="true">
                {Array.from({ length: PVP_RULES.teamBudget }, (_, index) => (
                  <i key={index} data-spent={index < power} />
                ))}
              </span>
            </div>
            <DialogClose render={<Button variant="arena" />}>{m.pvp_picker_done()}</DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
