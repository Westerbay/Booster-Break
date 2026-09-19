import type { PvpErrorCode } from '@tcg-collection/shared'

export class PvpError extends Error {
  constructor(readonly code: PvpErrorCode) {
    super(code)
    this.name = 'PvpError'
  }
}
