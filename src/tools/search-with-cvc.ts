/**
 * `search_with_cvc` — keyword search that also files hits into a CVC model.
 *
 * Identical to `search_intelligence`, plus a `cvc_model_id`: passing it makes
 * the platform archive the matched items into that model's vector index, so a
 * later `semantic_search` on the same model has corpus to work with.
 *
 * @module dsh-plugin-market-intelligence/tools/search-with-cvc
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { CaseeClient } from '../casee-client.js'
import type { Config } from '../config.js'
import type { SearchResult } from '../types.js'
import { CVC_MODEL_ID_PATTERN, assertCvcModelId, clampLimit, intelItemSchema, renderItems } from './shared.js'

/** Build the CVC-collecting search tool for one client and configuration. */
export function createSearchWithCvcTool(client: CaseeClient, config: Config) {
  return defineTool({
    name: 'search_with_cvc',
    description:
      'Same as search_intelligence, but when cvc_model_id is given the matched intelligence is asynchronously collected into that CVC model\'s vector index for later semantic_search. Use it to build a topic corpus from a broad first pass.',
    parameters: {
      q: { type: 'string', required: true, description: 'Query string (same syntax as search_intelligence).' },
      cvc_model_id: {
        type: 'string',
        description: `CVC model id to collect into; pattern ${CVC_MODEL_ID_PATTERN.source}. Omit to behave exactly like search_intelligence.`,
      },
      source_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Restrict to these source_id values.',
      },
      min_tscore: {
        type: 'number',
        default: config.defaultMinTscore,
        description: `Minimum item credibility. Default ${config.defaultMinTscore}.`,
      },
      days: {
        type: 'number',
        default: config.defaultDays,
        description: `Window in days. Default ${config.defaultDays}.`,
      },
      category: { type: 'string', description: 'Source category filter.' },
      region: { type: 'string', description: 'Source region filter.' },
      language: { type: 'string', description: 'Source language filter.' },
      limit: {
        type: 'number',
        default: 100,
        description: `Maximum items to return and collect (<= ${config.maxLimit}). Default 100.`,
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string' },
          count: { type: 'number' },
          truncated: { type: 'boolean' },
          translated_keywords: { type: 'string' },
          items: { type: 'array', items: intelItemSchema },
        },
      },
      render: (_args, value) => {
        const result = value as unknown as SearchResult
        const head = `Query: ${result.query}\nMatched: ${result.count}${result.truncated ? ' (truncated)' : ''}`
        const body = renderItems(result.items, 'No items matched. Broaden the query or window.')
        return [{ type: 'text', text: `${head}\n\n${body}` }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const cvcModelId = args.cvc_model_id
      if (cvcModelId) assertCvcModelId(cvcModelId, config.platformUrl)
      return client.searchIntelligence(
        {
          q: args.q,
          sourceIds: args.source_ids,
          minTscore: args.min_tscore ?? config.defaultMinTscore,
          days: args.days ?? config.defaultDays,
          category: args.category,
          region: args.region,
          language: args.language,
          limit: clampLimit(args.limit, 100, config.maxLimit),
          cvcModelId,
        },
        exec.signal,
      )
    },
  })
}
