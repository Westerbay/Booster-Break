import { expect, test } from 'bun:test'
import type { CombatCard } from '@tcg-collection/shared'
import { createBattle, commitChoice, battleForPlayer } from '../../src/pvp/pvp-battle'

const team: CombatCard[] = [1, 2, 3].map((power) => ({
  id: `card-${power}`,
  setId: 'test',
  number: String(power),
  name: `Card ${power}`,
  finish: 'normal',
  hp: 100 * power,
  power,
  types: ['Fire'],
  weaknesses: [],
}))

test('seals choices, reveals together, rejects reused cards and overspending, and replays retries once', () => {
  const state = createBattle(team)
  state.opponent.team = team
  const choice = { round: 1, cardId: 'card-3', energy: 3 }
  commitChoice(state, 'challenger', choice, 'alice', 'bob')
  const opponentView = battleForPlayer(state, 'opponent')
  expect(opponentView.choice).toBeNull()
  expect(opponentView.opponentReady).toBe(true)
  expect(opponentView.rounds).toEqual([])
  expect(opponentView).not.toHaveProperty('challenger')
  expect(() => commitChoice(state, 'challenger', { ...choice, energy: 2 }, 'alice', 'bob')).toThrow(
    'pvp_choice_locked',
  )
  commitChoice(state, 'opponent', { round: 1, cardId: 'card-1', energy: 0 }, 'alice', 'bob')
  expect(state.rounds).toHaveLength(1)
  expect(state.rounds[0]?.winnerId).toBe('alice')
  commitChoice(state, 'challenger', choice, 'alice', 'bob')
  expect(state.rounds).toHaveLength(1)
  expect(() =>
    commitChoice(state, 'challenger', { round: 2, cardId: 'card-3', energy: 0 }, 'alice', 'bob'),
  ).toThrow('pvp_invalid_choice')
  expect(() =>
    commitChoice(state, 'challenger', { round: 2, cardId: 'card-2', energy: 3 }, 'alice', 'bob'),
  ).toThrow('pvp_invalid_choice')
  commitChoice(state, 'challenger', { round: 2, cardId: 'card-2', energy: 2 }, 'alice', 'bob')
  commitChoice(state, 'opponent', { round: 2, cardId: 'card-2', energy: 0 }, 'alice', 'bob')
  expect(state.reason).toBe('rounds')
  expect(state.winnerId).toBe('alice')
})
