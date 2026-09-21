const pokedexSetStorageKey = 'booster-break-pokedex-set'

export const getStoredPokedexSetId = (): string | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.sessionStorage.getItem(pokedexSetStorageKey) ?? undefined
}

export const setStoredPokedexSetId = (setId: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(pokedexSetStorageKey, setId)
}
