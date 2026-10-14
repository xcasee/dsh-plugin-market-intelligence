/**
 * dsh-plugin-market-intelligence — a DeepSeek Harness bundle that turns the
 * CaSee (凯见) intelligence corpus into a market intelligence analysis expert.
 *
 * The plugin registers six model-facing tools, one expert persona section and
 * one bundled skill. It is a global host row: register it once and every agent
 * in the composition can use it.
 *
 * @module dsh-plugin-market-intelligence
 */
import type { Context } from '@deepseek-ai/cordis'
import { CaseeClient } from './casee-client.js'
import { Config } from './config.js'
import { registerPrompt } from './prompt.js'
import { registerSkill } from './skill.js'
import { registerTools } from './tools/index.js'

/** Cordis plugin display name. */
export const name = 'market-intelligence'

/** The tool registry must exist before {@link apply} runs. */
export const inject = ['tools']

export { Config }
export type { Config as MarketIntelligenceConfig } from './config.js'
export { CaseeClient } from './casee-client.js'
export type { CaseeClientOptions, SearchParams, SemanticParams, SourceParams } from './casee-client.js'
export { CaseeApiError, isCaseeApiError } from './errors.js'
export { TOOL_NAMES } from './tools/index.js'
export { PROMPT_SECTION } from './prompt.js'
export { SKILL_NAME } from './skill.js'

/**
 * Wire the plugin into a composition.
 *
 * Tools register directly on the guaranteed tool registry. The persona and the
 * skill are optional capabilities: each is registered through `ctx.inject`, so
 * the plugin still loads in a composition that mounts only some of them, and
 * the registration unwinds automatically when the plugin unloads.
 *
 * @param ctx - the mounting context.
 * @param config - validated configuration (schema defaults applied).
 */
export function apply(ctx: Context, config: Config): void {
  const client = new CaseeClient({
    baseUrl: config.apiBaseUrl,
    apiKeyEnv: config.apiKeyEnv,
    timeoutMs: config.timeoutMs,
    requestIntervalMs: config.requestIntervalMs,
    platformUrl: config.platformUrl,
  })

  registerTools(ctx, client, config)

  if (config.registerPrompt) {
    ctx.inject(['systemPrompt'], (scoped) => {
      registerPrompt(scoped, config)
    })
  }

  if (config.registerSkill) {
    ctx.inject(['skills'], (scoped) => {
      registerSkill(scoped, config)
    })
  }
}
