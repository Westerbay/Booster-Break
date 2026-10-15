import { useMemo, useState, type FormEvent } from 'react'
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import { BookOpenIcon, ChevronDownIcon, SearchIcon } from 'lucide-react'
import { getRarityRank, type CardFinish, type PokemonCardSummary } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import { matchesCardNameSearch } from '@/features/dashboard/lib/card-search'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { toast } from '@/features/toast/toast-store'
import { useCreateTradeAuctionMutationOption } from '@/lib/mutations/trade'
import { usePokemonCardsOfSetsQueryOptions, usePokemonSetsQueryOption } from '@/lib/queries/pokemon'
import { m } from '@/paraglide/messages'
import { MAX_ACTIVE_AUCTIONS_PER_USER, offerCardKey } from '../lib/trade-utils'
import { TradeCollectionCardItem } from './TradeCollectionCardItem'

const PAGE_SIZE = 16

const combineCardQueries = (results: UseQueryResult<PokemonCardSummary[]>[]) => ({
  data:
    results.length > 0 && results.every((result) => result.data)
      ? results.flatMap((result) => result.data ?? [])
      : undefined,
  isPending: results.length === 0 || results.some((result) => result.isPending),
})

type RequestCardSort = 'set' | 'name' | 'rarity'

interface PickerMenuProps {
  label: string
  formatValue?: (label: string) => string
  value: string
  options: readonly { value: string; label: string }[]
  onValueChange: (value: string) => void
}

function PickerMenu({ label, formatValue, value, options, onValueChange }: PickerMenuProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={label}
        className="flex h-9 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 sm:w-48 max-sm:h-11"
      >
        <span className="truncate">
          {selectedLabel ? (formatValue?.(selectedLabel) ?? selectedLabel) : label}
        </span>
        <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="max-h-72 w-auto min-w-(--anchor-width) max-w-72"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              closeOnClick
              label={option.label}
              className="cursor-pointer focus:bg-muted focus:text-foreground max-sm:min-h-11"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface TradeCreateRequestDialogProps {
  open: boolean
  activeRequests: number
  ownedCardKeys?: ReadonlySet<string>
  onClose: () => void
}

export function TradeCreateRequestDialog({
  open,
  activeRequests,
  ownedCardKeys,
  onClose,
}: TradeCreateRequestDialogProps) {
  const queryClient = useQueryClient()
  const [setId, setSetId] = useState('')
  const [rarity, setRarity] = useState('')
  const [sort, setSort] = useState<RequestCardSort>('set')
  const [onlyNotOwned, setOnlyNotOwned] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<PokemonCardSummary & { finish: CardFinish }>()

  const setsQuery = useQuery(usePokemonSetsQueryOption())
  const setIds = useMemo(
    () => (setId ? [setId] : (setsQuery.data ?? []).map((set) => set.id)),
    [setId, setsQuery.data],
  )
  const cardsQuery = useQueries({
    queries: usePokemonCardsOfSetsQueryOptions(setIds),
    combine: combineCardQueries,
  })

  const rarityOptions = useMemo(
    () =>
      [...new Set((cardsQuery.data ?? []).flatMap((card) => (card.rarity ? [card.rarity] : [])))]
        .sort((first, second) => getRarityRank(first) - getRarityRank(second))
        .map((value) => ({ value, label: formatRarity(value) })),
    [cardsQuery.data],
  )

  const cardVariants = useMemo(() => {
    const variants = (cardsQuery.data ?? [])
      .filter(
        (card) => matchesCardNameSearch(card, searchQuery) && (!rarity || card.rarity === rarity),
      )
      .flatMap((card) =>
        (card.finishes ?? ['normal']).map((finish) => ({ ...card, finish }) as const),
      )
      .filter((card) => !onlyNotOwned || !ownedCardKeys?.has(offerCardKey(card.id, card.finish)))

    if (sort === 'name') {
      return variants.sort((first, second) => first.name.localeCompare(second.name))
    }

    if (sort === 'rarity') {
      return variants.sort(
        (first, second) =>
          getRarityRank(second.rarity) - getRarityRank(first.rarity) ||
          first.name.localeCompare(second.name),
      )
    }

    return variants
  }, [cardsQuery.data, searchQuery, rarity, onlyNotOwned, ownedCardKeys, sort])

  const pageCount = Math.max(1, Math.ceil(cardVariants.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedVariants = cardVariants.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const updateFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const createRequest = useMutation(
    useCreateTradeAuctionMutationOption(queryClient, {
      onSuccess: () => {
        setSelected(undefined)
        onClose()
      },
      onError: (error) => {
        toast.show(error.message)
      },
    }),
  )

  const canSubmit = selected !== undefined && activeRequests < MAX_ACTIVE_AUCTIONS_PER_USER

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selected || !canSubmit) {
      return
    }

    createRequest.mutate({
      kind: 'request',
      offeredCardId: selected.id,
      offeredCardFinish: selected.finish,
    })
  }

  function openChanged(nextOpen: boolean) {
    if (!nextOpen) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={openChanged}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] min-w-0 max-w-4xl overflow-y-auto sm:max-w-4xl"
        closeLabel={m.pvp_close()}
      >
        <DialogTitle className="pr-12">{m.trade_create_request()}</DialogTitle>
        <form className="min-w-0 space-y-4" onSubmit={handleSubmit}>
          <p className="text-sm text-muted-foreground">{m.trade_request_hint()}</p>
          <p className="text-xs text-muted-foreground">
            {m.trade_request_creation_quota({
              used: activeRequests,
              max: MAX_ACTIVE_AUCTIONS_PER_USER,
            })}
          </p>
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            {m.trade_request_card_selection_step()}
          </p>
          <div className="flex h-9 min-w-40 items-center gap-2 rounded-md border bg-background px-2.5 transition-colors focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/15 max-sm:h-11">
            <SearchIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => updateFilter(setSearchQuery)(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base placeholder:text-xs focus:outline-none sm:text-sm"
              placeholder={m.trade_search_by_pokemon_label()}
              aria-label={m.trade_search_by_pokemon_label()}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <PickerMenu
              label={m.collection_filter_set_label()}
              value={setId}
              options={[
                { value: '', label: m.collection_filter_all_sets() },
                ...(setsQuery.data ?? []).map((set) => ({ value: set.id, label: set.name })),
              ]}
              onValueChange={(value) => {
                updateFilter(setSetId)(value)
                setRarity('')
              }}
            />
            <PickerMenu
              label={m.sort_rarity()}
              value={rarity}
              options={[{ value: '', label: m.card_filters_any_rarity() }, ...rarityOptions]}
              onValueChange={updateFilter(setRarity)}
            />
            <PickerMenu
              label={m.trade_request_sort_label()}
              formatValue={(value) => m.trade_request_sort_value({ value })}
              value={sort}
              options={[
                { value: 'set', label: m.collection_filter_set_label() },
                { value: 'name', label: m.sort_name() },
                { value: 'rarity', label: m.sort_rarity() },
              ]}
              onValueChange={(value) => updateFilter(setSort)(value as RequestCardSort)}
            />
            {ownedCardKeys ? (
              <Button
                type="button"
                variant={onlyNotOwned ? 'default' : 'outline'}
                className="h-9 max-sm:col-span-2 max-sm:h-11"
                aria-pressed={onlyNotOwned}
                onClick={() => updateFilter(setOnlyNotOwned)(!onlyNotOwned)}
              >
                <BookOpenIcon className="size-4" aria-hidden="true" />
                {m.trade_request_filter_not_owned_finishes()}
              </Button>
            ) : null}
          </div>

          <div className="grid min-h-[14rem] min-w-0 grid-cols-2 content-start justify-center gap-3 sm:flex sm:flex-wrap">
            {pagedVariants.length === 0 ? (
              <p className="col-span-full rounded-md bg-background p-3 text-sm text-muted-foreground">
                {cardsQuery.isPending ? m.trade_loading_cards() : m.trade_search_no_match()}
              </p>
            ) : (
              pagedVariants.map((card) => {
                const isSelected = selected?.id === card.id && selected.finish === card.finish

                return (
                  <TradeCollectionCardItem
                    key={offerCardKey(card.id, card.finish)}
                    card={card}
                    selected={isSelected}
                    onSelect={() => setSelected(card)}
                    className="min-w-0 transition enabled:hover:border-primary enabled:hover:bg-primary/5 max-sm:w-full sm:w-36"
                  />
                )
              })
            )}
          </div>

          {pageCount > 1 ? (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                className="cursor-pointer rounded-md border px-2 py-1 max-sm:min-h-11 max-sm:min-w-11"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                {m.packs_previous()}
              </button>
              <span className="whitespace-nowrap">
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                className="cursor-pointer rounded-md border px-2 py-1 max-sm:min-h-11 max-sm:min-w-11"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                {m.packs_next()}
              </button>
            </div>
          ) : null}

          <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
            {selected
              ? m.trade_request_selected_card({
                  card: `${selected.name} · ${formatCardFinish(selected.finish)}`,
                })
              : m.trade_request_pick_one_card()}
          </p>

          <button
            type="submit"
            className="h-10 w-full cursor-pointer rounded-lg game-primary-button bg-primary px-3 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-55 max-sm:min-h-11"
            disabled={!canSubmit || createRequest.isPending}
          >
            {createRequest.isPending ? m.trade_publishing() : m.trade_request_publish()}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
