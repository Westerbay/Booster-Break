import { describe, expect, test } from 'bun:test'
import { getRarityRank, pokemonRarityOrder, type PokemonCardSummary } from '@tcg-collection/shared'
import { getNewCardChance, getRarityChanceLabel, groupCardsByRarity } from './pack-rarity'

describe('pack rarity details', () => {
  test('orders Crown Zenith main rarities and separates every Galarian Gallery tier', () => {
    const cards = [
      makeCard('swsh12.5gg-GG67', 'GG67', 'Secret Rare'),
      makeCard('swsh12.5-010', '010', 'Rare'),
      makeCard('swsh12.5gg-GG35', 'GG35', 'Ultra Rare'),
      makeCard('swsh12.5-001', '001', 'Common'),
      makeCard('swsh12.5gg-GG26', 'GG26', 'Rare'),
      makeCard('swsh12.5-020', '020', 'Holo Rare V'),
      makeCard('swsh12.5-015', '015', 'Holo Rare'),
      makeCard('swsh12.5-030', '030', 'Radiant Rare'),
    ]

    expect(groupCardsByRarity(cards, 'swsh12.5').map(([rarity]) => rarity)).toEqual([
      'Common',
      'Rare',
      'Holo Rare',
      'Holo Rare V',
      'Radiant Rare',
      'Galarian Gallery',
      'Galarian Gallery Ultra Rare',
      'Galarian Gallery Secret Rare',
    ])
  })

  test('shows set-specific Crown Zenith and Mega Evolution rates', () => {
    expect(getRarityChanceLabel('Common', [], 'swsh12.5')).toContain('5')
    expect(getRarityChanceLabel('Galarian Gallery', [], 'swsh12.5')).toContain('22.4%')
    expect(getRarityChanceLabel('Special Illustration Rare', [], 'me04')).toContain('1.21%')
    expect(getRarityChanceLabel('Mega Hyper Rare', [], 'me05')).toContain('0.09%')
  })

  test('coalesces localized and capitalization aliases', () => {
    const cards = [
      makeCard('common-en', '001', 'Common'),
      makeCard('common-fr', '002', 'Commune'),
      makeCard('double-lower', '003', 'Double rare'),
      makeCard('double-title', '004', 'Double Rare'),
      makeCard('ace-spec-fr', '005', 'HIGH-TECH rare'),
      makeCard('sir-fr', '006', 'Illustration spéciale rare'),
      makeCard('mhr-fr', '007', 'Méga Hyper Rare'),
    ]
    const groups = groupCardsByRarity(cards)

    expect(groups.map(([rarity]) => rarity)).toEqual([
      'Common',
      'Double Rare',
      'ACE SPEC Rare',
      'Special Illustration Rare',
      'Mega Hyper Rare',
    ])
    expect(groups[0]?.[1]).toHaveLength(2)
    expect(groups[1]?.[1]).toHaveLength(2)
  })

  test('assigns a collection sort rank to every preview rarity', () => {
    for (const rarity of pokemonRarityOrder) {
      expect(getRarityRank(rarity)).not.toBe(999)
    }
  })

  test('estimates the chance of getting a new card from the owned cards', () => {
    const cards = [
      ...Array.from({ length: 10 }, (_, index) =>
        makeCard(`common-${index}`, `${index}`, 'Common'),
      ),
      ...Array.from({ length: 6 }, (_, index) =>
        makeCard(`uncommon-${index}`, `${index}`, 'Uncommon'),
      ),
      makeCard('rare', '999', 'Rare'),
    ]

    expect(getNewCardChance(cards, new Set(), 'me05')).toBe(100)
    expect(getNewCardChance(cards, new Set(cards.map((card) => card.id)), 'me05')).toBe(0)
    expect(
      getNewCardChance(cards, new Set(cards.slice(0, -1).map((card) => card.id)), 'me05'),
    ).toBeGreaterThan(0)
  })
})

const makeCard = (id: string, number: string, rarity: string): PokemonCardSummary => ({
  id,
  name: id,
  number,
  rarity,
  setId: 'swsh12.5',
})

describe('God Pack new card chance', () => {
  test('includes the God Pack chance when its pool can fill a booster', () => {
    const cards = Array.from({ length: 10 }, (_, index) =>
      makeCard(`illustration-${index}`, `${index}`, 'Illustration Rare'),
    )
    const ownedCardIds = new Set(cards.slice(0, -1).map((card) => card.id))

    expect(getNewCardChance(cards, ownedCardIds, 'sv01')).toBeGreaterThan(7.67 / 10)
  })

  test('does not add a God Pack chance when fewer than ten eligible cards exist', () => {
    const cards = Array.from({ length: 9 }, (_, index) =>
      makeCard(`illustration-${index}`, `${index}`, 'Illustration Rare'),
    )
    const ownedCardIds = new Set(cards.slice(0, -1).map((card) => card.id))

    expect(getNewCardChance(cards, ownedCardIds, 'sv01')).toBeCloseTo(7.67 / 9, 2)
  })

  test('includes Crown Zenith’s dedicated God Pack chance', () => {
    const galleryCards = [
      'GG26',
      'GG27',
      'GG28',
      'GG29',
      'GG30',
      'GG31',
      'GG32',
      'GG33',
      'GG34',
    ].map((number) => makeCard(`gallery-${number}`, number, 'Rare'))
    const cards = [
      ...galleryCards,
      makeCard('owned-v', '001', 'Holo Rare V'),
      makeCard('missing-v', '002', 'Holo Rare V'),
    ]
    const ownedCardIds = new Set([...galleryCards.map((card) => card.id), 'owned-v'])

    expect(getNewCardChance(cards, ownedCardIds, 'swsh12.5')).toBeGreaterThan(12.35 / 2)
  })
})
