import { expect, test } from 'bun:test'
import { readCombatTraits, resolveRound, validateTeam, eloDelta } from '../../src/pvp/pvp-rules'
import type { CombatCard } from '@tcg-collection/shared'

test('printed HP changes strength while finishes do not, and non-Pokémon cannot battle', () => {
  expect(
    readCombatTraits(JSON.stringify({ category: 'Pokemon', hp: 90, types: ['Fire'] })),
  ).toMatchObject({ hp: 90, power: 1, types: ['Fire'] })
  expect(
    readCombatTraits(JSON.stringify({ category: 'Pokemon', hp: 150, types: ['Water'] })),
  ).toMatchObject({ power: 2 })
  expect(
    readCombatTraits(
      JSON.stringify({ category: 'Pokemon', hp: 330, types: ['Fire'], variants: { holo: true } }),
    ),
  ).toMatchObject({ power: 3 })
  expect(readCombatTraits(JSON.stringify({ category: 'Trainer', hp: 90 }))).toBeNull()
  expect(readCombatTraits('{bad')).toBeNull()
  expect(readCombatTraits(JSON.stringify({ category: 'Pokemon' }))).toBeNull()
})

const card = (id: string, power: number, types = ['Fire'], weaknesses = ['Water']): CombatCard => ({
  id,
  setId: 'test',
  number: id,
  name: id,
  finish: 'normal',
  hp: power * 100,
  power,
  types,
  weaknesses,
})

test('three distinct cards share a six-point budget; energy and weakness can overcome raw power', () => {
  expect(() => validateTeam([card('a', 3), card('b', 2), card('c', 1)])).not.toThrow()
  expect(() => validateTeam([card('a', 3), card('b', 3), card('c', 1)])).toThrow()
  expect(() => validateTeam([card('a', 1), card('a', 1), card('c', 1)])).toThrow()
  const result = resolveRound(1, 'alice', card('a', 3), 0, 'bob', card('b', 1, ['Water'], []), 2)
  expect(result).toMatchObject({
    winnerId: 'bob',
    challenger: { strength: 3 },
    opponent: { strength: 4, typeBonus: 1 },
  })
  expect(eloDelta(1200, 1200, 1)).toBe(12)
  expect(eloDelta(1200, 1200, 0.5)).toBe(0)
  expect(eloDelta(1000, 1600, 1)).toBeGreaterThan(eloDelta(1600, 1000, 1))
})
