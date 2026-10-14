/**
 * `semantic_search` — concept-level, cross-lingual retrieval over a CVC model.
 *
 * @module dsh-plugin-market-intelligence/tools/semantic-search
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { CaseeClient } from '../casee-client.js'
import type { Config } from '../config.js'
import type { SemanticResult } from '../types.js'
import { CVC_MODEL_ID_PATTERN, assertCvcModelId, clampLimit, renderItems } from './shared.js'

/** Build the semantic-search tool for one client and configuration. */
export function createSemanticSearchTool(client: CaseeClient, config: Config) {
  return defineTool({
    name: 'semantic_search',
    description:
      'Run a concept-level semantic query (BM25 + vector + RRF) against one CVC model. Use for cross-lingual or loosely-worded needs such as "competitors\' electrification strategy in Southeast Asia". Treat hits as leads and re-verify material facts with search_intelligence.',
    parameters: {
      cvc_model_id: {
        type: 'string',
        required: true,
        description: `CVC model id, pattern ${CVC_MODEL_ID_PATTERN.source}, e.g. cvc_battery_anxiety.`,
      },
      q: { type: 'string', required: true, description: 'Natural-language concept query.' },
      mode: {
        type: 'string',
        enum: ['hybrid', 'semantic', 'keyword'],
        default: 'hybrid',
        description: 'hybrid (BM25+vector+RRF) | semantic (concept exploration) | keyword (exact).',
      },
      top_k: {
        type: 'number',
        default: 20,
        description: `Maximum hits (<= ${config.maxLimit}). Default 20.`,
      },
      time_range: { type: 'string', description: 'Preset window: 1d | 7d | 1m | 3m (alternative to days).' },
      days: { type: 'number', description: 'Custom window in days; 0 means no time limit.' },
      category: { type: 'string', description: 'Source category filter.' },
      region: { type: 'string', description: 'Source region filter.' },
      language: { type: 'string', description: 'Source language filter.' },
      min_tscore: {
        type: 'number',
        default: config.defaultMinTscore,
        description: `Minimum credibility. Default ${config.defaultMinTscore}.`,
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          cvc_model_id: { type: 'string' },
          mode: { type: 'string' },
          fusion: {
            type: 'object',
            additionalProperties: false,
            properties: {
              bm25_hits: { type: 'number' },
              vector_hits: { type: 'number' },
              degraded: { type: 'boolean' },
            },
          },
          count: { type: 'number' },
          hits: {
            type: 'array',
            items: {
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
                similarity: { type: 'number' },
              },
            },
          },
        },
      },
      render: (_args, value) => {
        const result = value as unknown as SemanticResult
        const head = `Semantic (${result.mode}) on ${result.cvc_model_id}: ${result.count} hits; fusion bm25=${result.fusion.bm25_hits} vector=${result.fusion.vector_hits}${result.fusion.degraded ? ' (degraded)' : ''}`
        const body = renderItems(
          result.hits,
          'No semantic hits. Collect more corpus with search_with_cvc first, then retry.',
        )
        return [{ type: 'text', text: `${head}\n\n${body}` }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      assertCvcModelId(args.cvc_model_id, config.platformUrl)
      const result = await client.semanticSearch(
        {
          cvcModelId: args.cvc_model_id,
          q: args.q,
          mode: args.mode ?? 'hybrid',
          topK: clampLimit(args.top_k, 20, config.maxLimit),
          timeRange: args.time_range,
          days: args.days,
          category: args.category,
          region: args.region,
          language: args.language,
          minTscore: args.min_tscore ?? config.defaultMinTscore,
        },
        exec.signal,
      )
      return result
    },
  })
}
