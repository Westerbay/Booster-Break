import { useMemo, useRef, useState } from 'react'
import {
  ArrowDownWideNarrowIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LibraryBigIcon,
  SearchIcon,
} from 'lucide-react'
import type {
  CollectionSetOption,
  CollectionSort,
  UserCollectionCard,
} from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'
import { CardImageDialog } from './CardImageDialog'
import { CollectionCardItem } from './CollectionCardItem'
import { CardListFiltersMenu } from './CardListFiltersMenu'

interface CollectionPanelProps {
  cards: UserCollectionCard[]
  isPending: boolean
  page: number
  pageCount: number
  total: number
  totalCards: number
  sort: CollectionSort
  searchQuery: string
  sets: CollectionSetOption[]
  selectedSetId?: string
  minimumQuantity: number
  minimumRarity?: string
  rarityOptions: string[]
  onSortChange: (sort: CollectionSort) => void
  onSearchChange: (query: string) => void
  onSetChange: (setId: string | undefined) => void
  onMinimumQuantityChange: (quantity: number) => void
  onMinimumRarityChange: (rarity: string | undefined) => void
  onPageChange: (page: number) => void
}

const getSortActions = (): Array<{ label: string; value: CollectionSort }> => [
  {
    label: m.sort_recent(),
    value: 'recent',
  },
  {
    label: m.sort_quantity(),
    value: 'quantity',
  },
  {
    label: m.sort_name(),
    value: 'name',
  },
  {
    label: m.sort_rarity(),
    value: 'rarity',
  },
]

export function CollectionPanel({
  cards,
  isPending,
  page,
  pageCount,
  total,
  totalCards,
  sort,
  searchQuery,
  sets,
  selectedSetId,
  minimumQuantity,
  minimumRarity,
  rarityOptions,
  onSortChange,
  onSearchChange,
  onSetChange,
  onMinimumQuantityChange,
  onMinimumRarityChange,
  onPageChange,
}: CollectionPanelProps) {
  const { locale } = useLocale()
  const [selectedCard, setSelectedCard] = useState<UserCollectionCard>()
  const previewTrigger = useRef<HTMLButtonElement>(null)
  const sortActions = getSortActions()
  const activeSortLabel =
    sortActions.find((action) => action.value === sort)?.label ?? m.sort_recent()
  const numberFormatter = new Intl.NumberFormat(locale)
  const isSearching = searchQuery.trim().length > 0
  const hasFilters = Boolean(selectedSetId || minimumRarity || minimumQuantity > 1)
  const emptyMessage = isSearching
    ? m.trade_search_no_match()
    : hasFilters
      ? m.collection_filters_empty()
      : m.collection_empty()
  const setNameById = useMemo(() => new Map(sets.map((set) => [set.id, set.name])), [sets])
  const activeSet = sets.find((set) => set.id === selectedSetId)
  const setTriggerLabel = activeSet
    ? `${activeSet.name} (${activeSet.count})`
    : m.collection_filter_all_sets()

  return (
    <>
      <section
        aria-labelledby="collection-title"
        className="game-panel game-index-panel game-collection w-full min-w-0 max-w-6xl"
      >
        <header className="game-index-heading game-collection-heading">
          <div className="game-index-emblem" aria-hidden="true">
            <LibraryBigIcon />
          </div>
          <div className="game-index-heading-copy">
            <h1 id="collection-title">{m.collection_title()}</h1>
          </div>
          {!isPending && (
            <dl className="game-collection-stats">
              <div>
                <dt>{m.collection_copies_label()}</dt>
                <dd>{numberFormatter.format(totalCards)}</dd>
              </div>
              <div>
                <dt>{m.collection_variants_label()}</dt>
                <dd>{numberFormatter.format(total)}</dd>
              </div>
            </dl>
          )}
        </header>

        <div className="game-collection-toolbar">
          <label className="game-collection-search">
            <SearchIcon aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={m.collection_search_label()}
              aria-label={m.trade_search_by_pokemon_aria()}
            />
          </label>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              aria-label={`${m.collection_filter_set_label()}. ${setTriggerLabel}`}
              title={setTriggerLabel}
              className="game-collection-set"
            >
              <span className="min-w-0 wrap-anywhere text-left">{setTriggerLabel}</span>
              <ChevronDownIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="max-h-72 min-w-48 max-w-64"
            >
              <DropdownMenuRadioGroup
                value={selectedSetId ?? ''}
                onValueChange={(value) => onSetChange(value || undefined)}
              >
                <DropdownMenuRadioItem value="" closeOnClick className="min-h-11 cursor-pointer">
                  {m.collection_filter_all_sets()}
                </DropdownMenuRadioItem>
                {sets.map((set) => (
                  <DropdownMenuRadioItem
                    key={set.id}
                    value={set.id}
                    closeOnClick
                    className="min-h-11 cursor-pointer"
                  >
                    {set.name} ({set.count})
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <CardListFiltersMenu
            minimumQuantity={minimumQuantity}
            minimumRarity={minimumRarity}
            rarityOptions={rarityOptions}
            onMinimumQuantityChange={onMinimumQuantityChange}
            onMinimumRarityChange={onMinimumRarityChange}
          />

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger aria-label={`${m.collection_sort_label()}. ${activeSortLabel}`}>
              <ArrowDownWideNarrowIcon aria-hidden="true" />
              <span className="mr-auto truncate">{activeSortLabel}</span>
              <ChevronDownIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-36">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => {
                  const action = sortActions.find((option) => option.value === value)
                  if (action) onSortChange(action.value)
                }}
              >
                {sortActions.map((action) => (
                  <DropdownMenuRadioItem
                    key={action.value}
                    value={action.value}
                    closeOnClick
                    className="min-h-11 cursor-pointer"
                  >
                    {action.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="game-collection-results" aria-busy={isPending}>
          {isPending ? (
            <div className="game-collection-grid" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="game-collection-placeholder" />
              ))}
            </div>
          ) : cards.length > 0 ? (
            <div className="game-collection-grid">
              {cards.map((card) => (
                <CollectionCardItem
                  key={`${card.id}-${card.finish ?? 'normal'}`}
                  card={card}
                  setName={setNameById.get(card.setId)}
                  onPreview={(trigger) => {
                    previewTrigger.current = trigger
                    setSelectedCard(card)
                  }}
                  className="game-collection-card w-full"
                />
              ))}
            </div>
          ) : (
            <p className="game-collection-empty">{emptyMessage}</p>
          )}

          {pageCount > 1 && (
            <nav className="game-collection-pagination" aria-label={m.collection_pages_label()}>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={page <= 1 || isPending}
                onClick={() => onPageChange(Math.max(page - 1, 1))}
              >
                <ChevronLeftIcon aria-hidden="true" />
                {m.packs_previous()}
              </Button>
              <p>{m.collection_page_label({ page, total: pageCount })}</p>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={page >= pageCount || isPending}
                onClick={() => onPageChange(Math.min(page + 1, pageCount))}
              >
                {m.packs_next()}
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </nav>
          )}
        </div>
      </section>
      {selectedCard ? (
        <CardImageDialog
          card={selectedCard}
          onClose={() => setSelectedCard(undefined)}
          finalFocus={previewTrigger}
        />
      ) : null}
    </>
  )
}
