import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { PokedexSetSummary, PokemonCardSummary } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { CardImageDialog } from '@/features/dashboard/components/CardImageDialog'
import { m } from '@/paraglide/messages'
import { usePokedexBook, type BookScene } from '../hooks/usePokedexBook'
import { PokedexBookPage } from './PokedexBookPage'
import { PokedexCoverTurn } from './PokedexCoverTurn'
import { PokedexPageTurn } from './PokedexPageTurn'
import { PokedexBookLoading } from './PokedexBookLoading'

interface PokedexBookProps {
  userId: string
  set: PokedexSetSummary
  hasSelectedSet: boolean
  sets: PokedexSetSummary[]
  onSetChange: (setId: string) => void
}

export function PokedexBook({ userId, set, hasSelectedSet, sets, onSetChange }: PokedexBookProps) {
  const bookElementRef = useRef<HTMLDivElement>(null)
  const book = usePokedexBook(userId, set, hasSelectedSet, bookElementRef)
  const reducedMotion = useReducedMotion()
  const [selectedCard, setSelectedCard] = useState<PokemonCardSummary>()
  const closed = book.shownScene.layout.kind === 'cover'
  const coverTurn =
    book.turn && (book.turn.from.layout.kind !== 'cards' || book.scene.layout.kind !== 'cards')
      ? book.turn
      : undefined
  const leafTurn = coverTurn ? undefined : book.turn
  const opening = coverTurn?.from.layout.kind !== 'cards'
  const sheetScene = opening && coverTurn ? coverTurn.from : book.scene
  const underScene = !opening && coverTurn ? coverTurn.from : book.scene
  const edge = sheetScene.layout.kind === 'summary' ? 'back' : 'front'
  const inset = book.spread && book.shownScene.layout.kind !== 'cards' ? '25%' : '0%'
  const frameBounds = { left: inset, right: inset }
  const frameTransition = {
    duration: reducedMotion ? 0 : 0.68,
    ease: [0.3, 0.05, 0.25, 1] as const,
  }
  const controlsVisible = hasSelectedSet && !book.turn && !book.pending
  const pageLabel = getPageLabel()

  function renderPage(scene: BookScene, side: 'left' | 'right', decorative = false) {
    return (
      <PokedexBookPage
        scene={scene}
        side={side}
        sets={sets}
        hasSelectedSet={hasSelectedSet}
        decorative={decorative}
        onSetChange={chooseSet}
        onOpen={openBook}
        onReturnToCover={book.cover}
        onSelect={setSelectedCard}
      />
    )
  }
  function renderScene(scene: BookScene) {
    if (scene.layout.kind !== 'cards') {
      return <div className="pokedex-endpaper-slot">{renderPage(scene, 'left')}</div>
    }
    let leftScene = scene
    let rightScene = scene
    if (book.spread && leafTurn) {
      if (leafTurn.direction > 0) leftScene = leafTurn.from
      else rightScene = leafTurn.from
    }
    let turningFront = null
    let turningBack = null
    if (leafTurn) {
      const forward = leafTurn.direction > 0
      turningFront = renderPage(leafTurn.from, book.spread && forward ? 'right' : 'left', true)
      turningBack = renderPage(book.scene, book.spread && !forward ? 'right' : 'left', true)
    }
    return (
      <>
        <div className="pokedex-spread">
          {renderPage(leftScene, 'left')}
          {book.spread && renderPage(rightScene, 'right')}
          {leafTurn && (
            <PokedexPageTurn
              key={leafTurn.id}
              id={leafTurn.id}
              front={turningFront}
              back={turningBack}
              direction={leafTurn.direction}
              onComplete={book.completeTurn}
            />
          )}
        </div>
        <div className="pokedex-rings" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </>
    )
  }
  function chooseSet(setId: string) {
    onSetChange(setId)
    const target = sets.find((candidate) => candidate.id === setId)
    if (target) book.open(target)
  }
  function openBook() {
    book.open(set)
  }
  function getPageLabel() {
    const { layout } = book
    if (layout.kind === 'cover') return m.pokedex_front_page()
    if (layout.kind === 'summary') return m.pokedex_back_page()
    if (layout.firstLeaf !== layout.lastLeaf)
      return m.pokedex_spread_label({
        first: layout.firstLeaf,
        last: layout.lastLeaf,
        total: layout.totalLeaves,
      })
    return m.pokedex_page_label({ page: layout.firstLeaf, total: layout.totalLeaves })
  }
  function closeCard() {
    setSelectedCard(undefined)
  }

  return (
    <>
      <div
        ref={bookElementRef}
        className="pokedex-book"
        data-spread={book.spread}
        data-section={book.shownScene.layout.kind}
        tabIndex={-1}
        onKeyDown={book.keyboard}
      >
        {!closed && <h1 className="sr-only">{m.nav_pokedex()}</h1>}
        <motion.div
          className="pokedex-book-frame"
          initial={false}
          animate={frameBounds}
          transition={frameTransition}
          aria-hidden="true"
        >
          <div className="pokedex-book-corner pokedex-book-corner-start" />
          <div className="pokedex-book-corner pokedex-book-corner-end" />
        </motion.div>
        <div
          className="pokedex-book-stage"
          aria-busy={book.busy || book.pending}
          inert={Boolean(book.turn)}
          onTouchStart={book.startTouch}
          onTouchEnd={book.endTouch}
        >
          {coverTurn ? (
            <PokedexCoverTurn
              key={coverTurn.id}
              id={coverTurn.id}
              opening={opening}
              edge={edge}
              spread={book.spread}
              sheet={renderPage(sheetScene, 'left', true)}
              onComplete={book.completeTurn}
            >
              {renderScene(underScene)}
            </PokedexCoverTurn>
          ) : (
            renderScene(book.shownScene)
          )}
          {book.pending && <PokedexBookLoading set={set} />}
          {book.error && book.layout.kind === 'cards' && (
            <div className="pokedex-query-error" role="alert">
              <p>{book.error.message}</p>
              <Button onClick={book.retry} variant="outline">
                {m.pvp_retry()}
              </Button>
            </div>
          )}
        </div>
        <nav
          className="pokedex-book-controls"
          aria-label={m.pokedex_navigation()}
          data-visible={controlsVisible}
          aria-hidden={!controlsVisible}
          inert={!controlsVisible}
        >
          {book.layout.index > 0 && (
            <Button
              variant="ghost"
              disabled={book.busy}
              onClick={book.previous}
              aria-label={m.pokedex_previous()}
            >
              <ChevronLeftIcon aria-hidden="true" />
              <span>{m.pvp_previous()}</span>
            </Button>
          )}
          <span className="sr-only" aria-live="polite">
            {book.pending ? m.pokedex_loading() : pageLabel}
          </span>
          {hasSelectedSet && !closed && book.layout.index < book.lastIndex && (
            <Button
              variant="ghost"
              disabled={book.busy || book.pending}
              data-direction="next"
              onClick={book.next}
              onPointerEnter={book.warmNext}
              onFocus={book.warmNext}
              aria-label={m.pokedex_next()}
            >
              <span>{m.pvp_next()}</span>
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          )}
        </nav>
      </div>
      {selectedCard && (
        <CardImageDialog key={selectedCard.id} card={selectedCard} onClose={closeCard} />
      )}
    </>
  )
}
