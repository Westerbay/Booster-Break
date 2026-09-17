const WEEK_MS = 7 * 24 * 60 * 60 * 1_000

export const NEW_PACK_EVENT = {
  setId: 'me05',
  startsAt: Date.parse('2026-09-18T00:00:00Z'),
} as const

export const isNewPackEventActive = (now: number): boolean =>
  now >= NEW_PACK_EVENT.startsAt && now < NEW_PACK_EVENT.startsAt + WEEK_MS
