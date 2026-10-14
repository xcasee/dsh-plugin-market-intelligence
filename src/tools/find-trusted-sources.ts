/**
 * `find_trusted_sources` — discover credible sources before searching.
 *
 * @module dsh-plugin-market-intelligence/tools/find-trusted-sources
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { CaseeClient } from '../casee-client.js'
import type { Config } from '../config.js'
import type { SourceSearchResult } from '../types.js'
import { clampLimit, sourceRecordSchema, tscoreBadge } from './shared.js'

/**
 * Build the source-discovery tool bound to one client and configuration.
 * @param client - authenticated CaSee client.
 * @param config - resolved plugin configuration.
 */
export function createFindTrustedSourcesTool(client: CaseeClient, config: Config) {
  return defineTool({
    name: 'find_trusted_sources',
    description:
      'Discover trusted intelligence sources by category, region, language and credibility. Call this first to obtain source_ids that scope a later search_intelligence to a vetted subset of the 500+ source corpus.',
    parameters: {
      keyword: { type: 'string', description: 'Fuzzy match on source_id / name / description.' },
      category: {
        type: 'string',
        description: 'Comma-separated categories: wire (agencies), mainstream, tech, market, ai.',
      },
      region: { type: 'string', description: 'Region filter, e.g. china, us, europe.' },
      language: { type: 'string', description: 'Language filter, e.g. zh, en, ja.' },
      min_tscore: {
        type: 'number',
        default: config.defaultMinTscore,
        description: `Minimum source credibility (0-1). Default ${config.defaultMinTscore}.`,
      },
      sample_size: { type: 'number', default: 2, description: 'Sample items returned per source.' },
      limit: {
        type: 'number',
        default: 20,
        description: `Maximum sources to return (<= ${config.maxLimit}). Default 20.`,
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          count: { type: 'number' },
          total: { type: 'number' },
          sources: { type: 'array', items: sourceRecordSchema },
        },
      },
      render: (_args, value) => {
        const result = value as unknown as SourceSearchResult
        if (result.sources.length === 0) {
          return [
            {
              type: 'text',
              text: 'No sources matched. Broaden category/region, or lower min_tscore.',
            },
          ]
        }
        const lines = result.sources.map((source) => {
          const badge = tscoreBadge(source.tscore)
          const flags = [
            source.category || 'n/a',
            source.region || 'n/a',
            source.language || 'n/a',
            source.state_affiliated ? 'state-affiliated' : '',
            source.propaganda_risk ? `propaganda:${source.propaganda_risk}` : '',
          ]
            .filter(Boolean)
            .join(' · ')
          const sample = source.sample_data[0]?.title ? `\n   e.g. ${source.sample_data[0].title}` : ''
          return `- ${badge} ${source.name} (${source.source_id}) T=${source.tscore.toFixed(2)} [${flags}]${sample}`
        })
        return [
          {
            type: 'text',
            text: `Trusted sources: ${result.count} of ${result.total}\n${lines.join('\n')}\n\nUse these source_id values in search_intelligence to keep retrieval within vetted sources.`,
          },
        ]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      return client.findTrustedSources(
        {
          keyword: args.keyword,
          category: args.category,
          region: args.region,
          language: args.language,
          minTscore: args.min_tscore ?? config.defaultMinTscore,
          sampleSize: args.sample_size ?? 2,
          limit: clampLimit(args.limit, 20, config.maxLimit),
        },
        exec.signal,
      )
    },
  })
}
