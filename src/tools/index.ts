/**
 * Tool registration for the market intelligence plugin.
 *
 * @module dsh-plugin-market-intelligence/tools
 */
import type { Context } from '@deepseek-ai/cordis'
import type { CaseeClient } from '../casee-client.js'
import type { Config } from '../config.js'
import { createAggregateBySourceTool } from './aggregate-by-source.js'
import { createAnalyzeTrendTool } from './analyze-trend.js'
import { createFindTrustedSourcesTool } from './find-trusted-sources.js'
import { createSearchIntelligenceTool } from './search-intelligence.js'
import { createSearchWithCvcTool } from './search-with-cvc.js'
import { createSemanticSearchTool } from './semantic-search.js'

/** The model-facing tool names this plugin registers, in a stable order. */
export const TOOL_NAMES = [
  'find_trusted_sources',
  'search_intelligence',
  'analyze_trend',
  'aggregate_by_source',
  'search_with_cvc',
  'semantic_search',
] as const

/**
 * Register every intelligence tool on the calling context's tool registry.
 * Registrations are Cordis effects, so they unwind when the plugin unloads.
 * @param ctx - context whose `tools` registry receives the tools.
 * @param client - authenticated CaSee client shared by all tools.
 * @param config - resolved plugin configuration.
 */
export function registerTools(ctx: Context, client: CaseeClient, config: Config): void {
  ctx.tools.register(createFindTrustedSourcesTool(client, config))
  ctx.tools.register(createSearchIntelligenceTool(client, config))
  ctx.tools.register(createAnalyzeTrendTool(client, config))
  ctx.tools.register(createAggregateBySourceTool(client, config))
  ctx.tools.register(createSearchWithCvcTool(client, config))
  ctx.tools.register(createSemanticSearchTool(client, config))
}
