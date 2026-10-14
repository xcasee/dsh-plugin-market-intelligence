/**
 * Shared helpers and reusable schema fragments for the intelligence tools.
 *
 * @module dsh-plugin-market-intelligence/tools/shared
 */
import type { ValueSchemaSpec } from '@deepseek-ai/dsh-tools'
import { CaseeApiError } from '../errors.js'
import type { CredibilityGrade, IntelItem } from '../types.js'

/** Grammar the CaSee API enforces for CVC model identifiers. */
export const CVC_MODEL_ID_PATTERN = /^cvc_[a-z0-9]{8,32}$/

/**
 * Reject a malformed CVC model id before it reaches the network, with a hint
 * that explains how to mint one.
 * @param id - candidate model id.
 * @param platformUrl - public CaSee site for the onboarding hint.
 */
export function assertCvcModelId(id: string, platformUrl: string): void {
  if (!CVC_MODEL_ID_PATTERN.test(id)) {
    throw new CaseeApiError(`Invalid cvc_model_id "${id}".`, {
      code: 'INVALID_ARGUMENT',
      hint: `Must match ^cvc_[a-z0-9]{8,32}$ (e.g. cvc_battery_anxiety). Create models at ${platformUrl} → CVC / semantic library.`,
    })
  }
}

/** Clamp a requested page size into `[1, max]`, falling back when absent. */
export function clampLimit(value: number | undefined, fallback: number, max: number): number {
  const requested = value === undefined ? fallback : Math.floor(value)
  if (!Number.isFinite(requested)) return Math.min(fallback, max)
  return Math.max(1, Math.min(requested, max))
}

/** Derive the ABCD credibility grade from a T-Score and source tier. */
export function gradeOf(tscore: number, tier: number): CredibilityGrade {
  if (tscore >= 0.8 && tier <= 1) return 'A'
  if (tscore >= 0.6) return 'B'
  if (tscore >= 0.4) return 'C'
  return 'D'
}

/** Colored indicator used in rendered text so grades scan at a glance. */
export function tscoreBadge(tscore: number): string {
  if (tscore >= 0.8) return '🟢'
  if (tscore >= 0.6) return '🟡'
  if (tscore >= 0.4) return '🔴'
  return '⚪'
}

/** `2026-09-01T...` -> `2026-09-01`; empty stays empty. */
export function dateOnly(value: string): string {
  return value ? value.slice(0, 10) : ''
}

/** One intelligence item's canonical output schema. */
export const intelItemSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    source_id: { type: 'string' },
    source_name: { type: 'string' },
    tscore: { type: 'number' },
    published_at: { type: 'string' },
    url: { type: 'string' },
    category: { type: 'string' },
    region: { type: 'string' },
    language: { type: 'string' },
  },
} as const satisfies ValueSchemaSpec

/** One trusted source's canonical output schema. */
export const sourceRecordSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    source_id: { type: 'string' },
    name: { type: 'string' },
    tscore: { type: 'number' },
    category: { type: 'string' },
    tier: { type: 'number' },
    region: { type: 'string' },
    language: { type: 'string' },
    propaganda_risk: { type: 'string' },
    state_affiliated: { type: 'boolean' },
    sample_data: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          published_at: { type: 'string' },
        },
      },
    },
  },
} as const satisfies ValueSchemaSpec

/** Render a compact, traceable item list for the model. */
export function renderItems(items: IntelItem[], emptyHint: string): string {
  if (items.length === 0) return emptyHint
  return items
    .map((item, index) => {
      const grade = gradeOf(item.tscore, 3)
      const when = dateOnly(item.published_at)
      const url = item.url ? `\n   ${item.url}` : ''
      return `${index + 1}. [${grade}|T ${item.tscore.toFixed(2)}] ${item.title}\n   〔${item.source_name}〕${when}${url}\n   ${item.description.slice(0, 240)}`
    })
    .join('\n')
}
