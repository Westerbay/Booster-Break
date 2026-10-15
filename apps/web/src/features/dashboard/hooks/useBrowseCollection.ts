import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CollectionSort, CollectionSource } from '@tcg-collection/shared'

import {
  usePokemonCollectionAllQueryOption,
  usePokemonCollectionQueryOption,
} from '@/lib/queries/pokemon'
import { matchesCardNameSearch } from '../lib/card-search'

const PAGE_SIZE = 24

export function useBrowseCollection(source?: CollectionSource) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<CollectionSort>('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSetId, setSelectedSetId] = useState<string>()
  const [minimumQuantity, setMinimumQuantity] = useState(1)
  const [minimumRarity, setMinimumRarity] = useState<string>()

  const isSearching = searchQuery.trim().length > 0
  const collection = useQuery(
    usePokemonCollectionQueryOption(
      {
        page,
        pageSize: PAGE_SIZE,
        sort,
        source,
        setId: selectedSetId,
        minimumQuantity,
        minimumRarity,
      },
      {
        keepPreviousData: true,
        enabled: !isSearching,
      },
    ),
  )
  const searchableCollection = useQuery(
    usePokemonCollectionAllQueryOption(
      {
        sort,
        source,
        setId: selectedSetId,
        minimumQuantity,
        minimumRarity,
      },
      {
        enabled: isSearching,
      },
    ),
  )
  const sets = collection.data?.sets ?? searchableCollection.data?.sets ?? []
  const rarityOptions = collection.data?.rarities ?? searchableCollection.data?.rarities ?? []
  const searchMatches = useMemo(
    () =>
      (searchableCollection.data?.cards ?? []).filter((card) =>
        matchesCardNameSearch(card, searchQuery),
      ),
    [searchQuery, searchableCollection.data?.cards],
  )
  const searchPageCount = Math.max(1, Math.ceil(searchMatches.length / PAGE_SIZE))
  const searchPage = Math.min(Math.max(page, 1), searchPageCount)
  const searchCards = useMemo(() => {
    const start = (searchPage - 1) * PAGE_SIZE

    return searchMatches.slice(start, start + PAGE_SIZE)
  }, [searchMatches, searchPage])

  const changeAndResetPage =
    <T>(setValue: (value: T) => void) =>
    (value: T) => {
      setValue(value)
      setPage(1)
    }

  return {
    cards: isSearching ? searchCards : (collection.data?.cards ?? []),
    isPending: isSearching ? searchableCollection.isPending : collection.isPending,
    page: isSearching ? searchPage : (collection.data?.pagination.page ?? page),
    pageCount: isSearching ? searchPageCount : (collection.data?.pagination.pageCount ?? 1),
    total: isSearching ? searchMatches.length : (collection.data?.pagination.total ?? 0),
    totalCards: isSearching
      ? searchMatches.reduce((count, card) => count + card.quantity, 0)
      : (collection.data?.pagination.totalCards ?? 0),
    sets,
    sort,
    searchQuery,
    selectedSetId,
    minimumQuantity,
    minimumRarity,
    rarityOptions,
    onSortChange: changeAndResetPage(setSort),
    onSearchChange: changeAndResetPage(setSearchQuery),
    onSetChange: changeAndResetPage(setSelectedSetId),
    onMinimumQuantityChange: changeAndResetPage(setMinimumQuantity),
    onMinimumRarityChange: changeAndResetPage(setMinimumRarity),
    onPageChange: setPage,
  }
}
