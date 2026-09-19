import { useRef, useState } from 'react'
import type { PokedexSetSummary } from '@tcg-collection/shared'
import { ArrowRightIcon, CheckIcon, LibraryBigIcon, PackageOpenIcon } from 'lucide-react'
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

interface PokedexSetPickerProps {
  sets: PokedexSetSummary[]
  onSetChange: (setId: string) => void
}

export function PokedexSetPicker({ sets, onSetChange }: PokedexSetPickerProps) {
  const [open, setOpen] = useState(false)
  const pendingSetId = useRef<string | undefined>(undefined)

  function selectSet(setId: string) {
    pendingSetId.current = setId
    setOpen(false)
  }
  function restoreFocus() {
    return !pendingSetId.current
  }
  function openChanged(nextOpen: boolean) {
    if (nextOpen) pendingSetId.current = undefined
    setOpen(nextOpen)
  }
  function openChangedComplete(nextOpen: boolean) {
    if (!nextOpen && pendingSetId.current) {
      onSetChange(pendingSetId.current)
    }
  }

  return (
    <Dialog open={open} onOpenChange={openChanged} onOpenChangeComplete={openChangedComplete}>
      <DialogTrigger render={<Button variant="arena" className="pokedex-cover-choose" />}>
        <LibraryBigIcon aria-hidden="true" />
        {m.pokedex_cover_choose()}
        <ArrowRightIcon aria-hidden="true" />
      </DialogTrigger>
      <DialogContent
        className="pokedex-set-dialog sm:max-w-[48rem]"
        closeLabel={m.pvp_close()}
        finalFocus={restoreFocus}
      >
        <DialogHeader className="pokedex-set-dialog-header">
          <DialogTitle>{m.pokedex_cover_choose()}</DialogTitle>
          <DialogDescription>{m.pokedex_picker_description()}</DialogDescription>
        </DialogHeader>
        <div className="pokedex-set-options">
          {sets.map((set) => (
            <PokedexSetChoice key={set.id} set={set} onSelect={selectSet} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface PokedexSetChoiceProps {
  set: PokedexSetSummary
  onSelect: (setId: string) => void
}

function PokedexSetChoice({ set, onSelect }: PokedexSetChoiceProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const imageUrl = set.boosterImageUrl ?? set.logoUrl ?? set.symbolUrl
  const complete = set.catalogCount > 0 && set.discoveredCount === set.catalogCount
  function choose() {
    onSelect(set.id)
  }
  function imageFailed() {
    setImageUnavailable(true)
  }

  return (
    <button className="pokedex-set-choice" type="button" onClick={choose}>
      <span className="pokedex-set-choice-art" aria-hidden="true">
        {imageUrl && !imageUnavailable ? (
          <img src={imageUrl} alt="" loading="lazy" onError={imageFailed} />
        ) : (
          <PackageOpenIcon />
        )}
      </span>
      <span className="pokedex-set-choice-name">{set.name}</span>
      <span className="pokedex-set-choice-progress">
        {complete && <CheckIcon aria-hidden="true" />}
        {m.pokedex_set_progress({ count: set.discoveredCount, total: set.catalogCount })}
      </span>
    </button>
  )
}
