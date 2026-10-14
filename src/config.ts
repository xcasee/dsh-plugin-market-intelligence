/**
 * Plugin configuration.
 *
 * Per the Harness design rule, every value two deployments could want to set
 * differently is a schema field with a default, so a profile can change it
 * from `cordis.patch.yml` without editing code.
 *
 * @module dsh-plugin-market-intelligence/config
 */
import Schema from '@deepseek-ai/schemastery'

/** Report output language policy. `auto` follows the user's language. */
export type OutputLanguage = 'auto' | 'zh' | 'en'

/** Plugin configuration resolved from the loader row. */
export interface Config {
  /** CaSee Intelligence REST base URL (no trailing slash required). */
  apiBaseUrl: string
  /** Environment variable name the API key is read from at request time. */
  apiKeyEnv: string
  /** Default retrieval window in days for tools that expose `days`. */
  defaultDays: number
  /** Default minimum T-Score for tools that expose `min_tscore`. */
  defaultMinTscore: number
  /** Hard cap on `limit` requested from the API in one call. */
  maxLimit: number
  /** Per-request network timeout in milliseconds. */
  timeoutMs: number
  /** Minimum spacing between outbound requests in milliseconds; 0 disables pacing. */
  requestIntervalMs: number
  /** Register the bundled `market-intelligence` skill into the skill registry. */
  registerSkill: boolean
  /** Register the expert persona section into the system prompt. */
  registerPrompt: boolean
  /** Public CaSee site used for report CTAs and key onboarding. */
  platformUrl: string
  /** Report output language policy. */
  outputLanguage: OutputLanguage
}

/** Runtime schema for {@link Config}; validates and fills defaults at load. */
export const Config: Schema<Config> = Schema.object({
  apiBaseUrl: Schema.string().default('http://121.43.113.132:8000'),
  apiKeyEnv: Schema.string().default('CASEE_API_KEY'),
  defaultDays: Schema.number().default(30),
  defaultMinTscore: Schema.number().default(0.6),
  maxLimit: Schema.number().default(200),
  timeoutMs: Schema.number().default(30000),
  requestIntervalMs: Schema.number().default(200),
  registerSkill: Schema.boolean().default(true),
  registerPrompt: Schema.boolean().default(true),
  platformUrl: Schema.string().default('https://casee.me'),
  outputLanguage: Schema.union(['auto', 'zh', 'en']).default('auto'),
})
