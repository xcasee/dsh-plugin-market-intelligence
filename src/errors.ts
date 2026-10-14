/**
 * Error vocabulary for the CaSee intelligence client.
 *
 * Every failure the model can meaningfully act on carries a stable `code` and
 * a human-readable `hint`, so the tool layer can render remediation guidance
 * (configure the key, broaden the query, slow down) instead of a bare stack.
 *
 * @module dsh-plugin-market-intelligence/errors
 */

/** Structured failure raised by {@link CaseeClient} and the tool layer. */
export class CaseeApiError extends Error {
  /** Stable machine-readable code, e.g. `AUTH_REQUIRED`, `RATE_LIMITED`. */
  readonly code: string
  /** HTTP status when the failure came from a response. */
  readonly status?: number
  /** Actionable remediation text shown to the model. */
  readonly hint?: string

  constructor(message: string, options: { code: string; status?: number; hint?: string }) {
    super(message)
    this.name = 'CaseeApiError'
    this.code = options.code
    this.status = options.status
    this.hint = options.hint
  }
}

/** Whether an unknown thrown value is our structured error. */
export function isCaseeApiError(value: unknown): value is CaseeApiError {
  return value instanceof CaseeApiError
}
