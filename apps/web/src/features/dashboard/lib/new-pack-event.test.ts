import { describe, expect, test } from 'bun:test'

import { isNewPackEventActive, NEW_PACK_EVENT } from './new-pack-event'

const DAY_MS = 24 * 60 * 60 * 1_000

describe('isNewPackEventActive', () => {
  test('is active for exactly one week from the start', () => {
    expect(isNewPackEventActive(NEW_PACK_EVENT.startsAt - 1)).toBe(false)
    expect(isNewPackEventActive(NEW_PACK_EVENT.startsAt)).toBe(true)
    expect(isNewPackEventActive(NEW_PACK_EVENT.startsAt + 7 * DAY_MS - 1)).toBe(true)
    expect(isNewPackEventActive(NEW_PACK_EVENT.startsAt + 7 * DAY_MS)).toBe(false)
  })
})
