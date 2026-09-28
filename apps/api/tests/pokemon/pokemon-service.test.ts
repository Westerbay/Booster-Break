import { afterEach, describe, expect, setSystemTime, test } from 'bun:test'
import type { SupportedLocale } from '@tcg-collection/shared'
import type { AuthService } from '../../src/auth/auth-service'
import { SCHEDULED_BOOSTER_RELEASES } from '../../src/pokemon/pokemon-config'
import type { PokemonRepository } from '../../src/pokemon/pokemon-repository'
import { PokemonService } from '../../src/pokemon/pokemon-service'
import type { ScrydexSealedClient } from '../../src/pokemon/scrydex-sealed-client'
import type { TcgDexClient } from '../../src/pokemon/tcgdex-client'

const releaseAt = Date.parse(SCHEDULED_BOOSTER_RELEASES.me05)

const openPitchBlackAt = async (now: number) => {
  setSystemTime(new Date(now))
  let getSetCalled = false
  const pokemonRepository = {
    getSet: async () => {
      getSetCalled = true
      return undefined
    },
  } as unknown as PokemonRepository
  const pokemonClient = {} as TcgDexClient
  const service = new PokemonService({
    authService: {} as AuthService,
    localizedPokemonClients: {
      en: pokemonClient,
      fr: pokemonClient,
    } satisfies Record<SupportedLocale, TcgDexClient>,
    pokemonClient,
    pokemonRepository,
    sealedClient: {} as ScrydexSealedClient,
  })

  const result = await service.openPack(
    { id: 'user-1', pseudo: 'Player' },
    { setId: 'me05', locale: 'en' },
  )

  return { result, getSetCalled }
}

describe('PokemonService booster availability', () => {
  afterEach(() => {
    setSystemTime()
  })

  test('rejects a direct opening of an unreleased booster before loading the set or cooldown', async () => {
    const { result, getSetCalled } = await openPitchBlackAt(releaseAt - 1)

    expect(result).toEqual({
      error: 'pack_unavailable',
      message: 'This booster set is not available for opening yet.',
    })
    expect(getSetCalled).toBe(false)
  })

  test('lets the opening through to the set lookup once the booster has released', async () => {
    const { getSetCalled } = await openPitchBlackAt(releaseAt)

    expect(getSetCalled).toBe(true)
  })
})

describe('PokemonService release booster', () => {
  afterEach(() => {
    setSystemTime()
  })

  const openWithoutChargesAt = async (now: number, openedSetIds: string[], bonusBoosters = 0) => {
    setSystemTime(new Date(now))
    const recordCalls: unknown[] = []
    const pokemonRepository = {
      getSet: async () => ({ id: 'me05', name: 'Me05', series: 'Mega', total: 1, releaseDate: '' }),
      getBoosterCooldownAnchor: async () => new Date(now),
      getBonusBoosters: async () => bonusBoosters,
      listOpenedSetIds: async () => openedSetIds,
      listCards: async () => [{ id: 'me05-001', setId: 'me05', name: 'Probe', number: '001' }],
      recordPackOpening: async (...args: unknown[]) => {
        recordCalls.push(args[3])
        return { openingId: 'opening-1', newCardIds: [] }
      },
    } as unknown as PokemonRepository
    const pokemonClient = {} as TcgDexClient
    const service = new PokemonService({
      authService: {} as AuthService,
      localizedPokemonClients: { en: pokemonClient, fr: pokemonClient },
      pokemonClient,
      pokemonRepository,
      sealedClient: {} as ScrydexSealedClient,
    })
    const result = await service.openPack(
      { id: 'user-1', pseudo: 'Player' },
      { setId: 'me05', locale: 'en' },
    )

    return { result, recordCalls }
  }

  test('opens a released booster for free when the player has not opened it yet', async () => {
    const { result, recordCalls } = await openWithoutChargesAt(releaseAt, [])

    expect(result).toHaveProperty('openingId', 'opening-1')
    expect(recordCalls).toEqual([{ firstOpeningIsFree: true }])
  })

  test('keeps the cooldown once the free release booster was opened', async () => {
    const { result, recordCalls } = await openWithoutChargesAt(releaseAt, ['me05'])

    expect(result).toHaveProperty('error', 'pack_cooldown')
    expect(recordCalls).toEqual([])
  })

  test('lets a gifted booster through the cooldown', async () => {
    const { result, recordCalls } = await openWithoutChargesAt(releaseAt, ['me05'], 1)

    expect(result).toHaveProperty('openingId', 'opening-1')
    expect(recordCalls).toEqual([{ firstOpeningIsFree: false }])
  })
})
