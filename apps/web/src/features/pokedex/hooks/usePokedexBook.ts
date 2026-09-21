import { useRef, useState, type KeyboardEvent, type RefObject, type TouchEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PokedexSlot, PokedexSetSummary } from '@tcg-collection/shared'
import { pokedexBookQueryOptions } from '@/lib/queries/pokedex'
import { useBookSpread } from '../lib/book-layout'
import {
  bookPositionAt,
  resolveBookPosition,
  type BookLayout,
  type BookPosition,
} from '../lib/book-pagination'

export interface BookScene {
  layout: BookLayout
  set: PokedexSetSummary
  slots?: PokedexSlot[]
}
interface BookTurn {
  id: number
  from: BookScene
  direction: number
}

export function usePokedexBook(
  userId: string,
  set: PokedexSetSummary,
  hasSelectedSet: boolean,
  bookElementRef: RefObject<HTMLDivElement | null>,
) {
  const spread = useBookSpread()
  const [position, setPosition] = useState<BookPosition>({ kind: 'cover' })
  const [turn, setTurn] = useState<BookTurn>()
  const turnId = useRef(0)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const layout = resolveBookPosition(position, set.catalogCount, spread)
  const queryClient = useQueryClient()
  const query = useQuery(
    pokedexBookQueryOptions(queryClient, userId, set.id, layout.kind === 'cards'),
  )
  const pending = layout.kind === 'cards' && query.isPending
  const offset = (layout.cardPage - 1) * layout.pageSize
  const scene: BookScene = {
    layout,
    set: query.data?.set ?? set,
    slots: query.data?.slots.slice(offset, offset + layout.pageSize),
  }
  const compatibleTurn = turn?.from.layout.pageSize === layout.pageSize
  if (turn && !compatibleTurn) setTurn(undefined)
  const shownScene = pending && compatibleTurn ? turn.from : scene
  const animatedTurn =
    compatibleTurn && !pending && !query.error && turn.from.layout.index !== layout.index
      ? turn
      : undefined
  const lastIndex = layout.cardPageCount + 1
  const busy = Boolean(animatedTurn)

  function navigate(index: number) {
    if (busy) return
    if (!hasSelectedSet && index > 0) return
    const bounded = Math.max(0, Math.min(lastIndex, index))
    if (pending && bounded > 0) return
    if (bounded === layout.index) return
    bookElementRef.current?.focus({ preventScroll: true })
    turnId.current += 1
    setTurn({
      id: turnId.current,
      from: shownScene,
      direction: bounded > shownScene.layout.index ? 1 : -1,
    })
    setPosition(bookPositionAt(bounded, set.catalogCount, spread))
  }
  function previous() {
    navigate(layout.index - 1)
  }
  function next() {
    navigate(layout.index + 1)
  }
  function cover() {
    navigate(0)
  }
  function completeTurn(id: number) {
    setTurn((current) => (current?.id === id ? undefined : current))
  }
  function retry() {
    void query.refetch()
  }
  function warmNext() {
    if (hasSelectedSet && layout.kind === 'cover')
      void queryClient.prefetchQuery(pokedexBookQueryOptions(queryClient, userId, set.id, true))
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (!hasSelectedSet) return
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.target instanceof HTMLInputElement) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      previous()
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      next()
    }
    if (event.key === 'Home') {
      event.preventDefault()
      cover()
    }
    if (event.key === 'End') {
      event.preventDefault()
      navigate(lastIndex)
    }
  }
  function startTouch(event: TouchEvent<HTMLDivElement>) {
    if (!hasSelectedSet) return
    const point = event.touches[0]
    touch.current = point ? { x: point.clientX, y: point.clientY } : null
  }
  function endTouch(event: TouchEvent<HTMLDivElement>) {
    const point = event.changedTouches[0]
    const start = touch.current
    touch.current = null
    if (!point || !start) return
    const dx = point.clientX - start.x
    const dy = point.clientY - start.y
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return
    event.preventDefault()
    if (dx < 0) next()
    else previous()
  }

  return {
    spread,
    layout,
    scene,
    shownScene,
    turn: animatedTurn,
    pending,
    busy,
    error: query.error,
    lastIndex,
    navigate,
    previous,
    next,
    cover,
    completeTurn,
    retry,
    warmNext,
    keyboard,
    startTouch,
    endTouch,
  }
}
