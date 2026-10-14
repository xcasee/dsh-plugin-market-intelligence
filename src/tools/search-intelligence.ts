/**
 * `search_intelligence` — Google-style keyword search over the trusted corpus.
 *
 * @module dsh-plugin-market-intelligence/tools/search-intelligence
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { CaseeClient } from '../casee-client.js'
import type { Config } from '../config.js'
import type { SearchResult } from '../types.js'
import { clampLimit, intelItemSchema, renderItems } from './shared.js'

/** Build the primary keyword-search tool for one client and configuration. */
export function createSearchIntelligenceTool(client: CaseeClient, config: Config) {
  return defineTool({
    name: 'search_intelligence',
    description:
      'Search real, sourced market and competitive intelligence with Google-style query syntax. Operators: +word (AND), -word (NOT), a|b (synonym OR), "exact phrase", (grouping). Chinese keywords are auto-translated. Scope the search with source_ids from find_trusted_sources to suppress full-corpus noise.',
    parameters: {
      q: {
        type: 'string',
        required: true,
        description: 'Query string, e.g. +(Tesla|BYD) +(EV|battery) +(China|Europe) -rumor',
      },
      source_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Restrict results to these source_id values (from find_trusted_sources).',
      },
      must_keywords: { type: 'string', description: 'Comma-separated AND keywords.' },
      should_keywords: { type: 'string', description: 'Comma-separated OR keywords.' },
      not_keywords: { type: 'string', description: 'Comma-separated NOT keywords.' },
      min_tscore: {
        type: 'number',
        default: config.defaultMinTscore,
        description: `Minimum item credibility 0-1. Default ${config.defaultMinTscore}; use 0.8 for decision-grade data.`,
      },
      days: {
        type: 'number',
        default: config.defaultDays,
        description: `Time window in days. Default ${config.defaultDays}; use 90/180 for deeper analysis.`,
      },
      start_date: { type: 'string', description: 'Inclusive start date YYYY-MM-DD (alternative to days).' },
      end_date: { type: 'string', description: 'Inclusive end date YYYY-MM-DD (alternative to days).' },
      category: { type: 'string', description: 'Source category filter: wire,mainstream,tech,market,ai.' },
      region: { type: 'string', description: 'Source region filter.' },
      language: { type: 'string', description: 'Source language filter.' },
      limit: {
        type: 'number',
        default: 20,
        description: `Maximum items to return (<= ${config.maxLimit}). Default 20.`,
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
        const head = `Query: ${result.query}\nMatched: ${result.count}${result.truncated ? ' (truncated)' : ''}${result.translated_keywords ? `\nTranslated keywords: ${result.translated_keywords}` : ''}`
        const body = renderItems(
          result.items,
          'No items matched. Broaden the keywords, increase days, or lower min_tscore.',
        )
        return [{ type: 'text', text: `${head}\n\n${body}` }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const useRange = Boolean(args.start_date || args.end_date)
      const result = await client.searchIntelligence(
        {
          q: args.q,
          sourceIds: args.source_ids,
          mustKeywords: args.must_keywords,
          shouldKeywords: args.should_keywords,
          notKeywords: args.not_keywords,
          minTscore: args.min_tscore ?? config.defaultMinTscore,
          days: useRange ? undefined : (args.days ?? config.defaultDays),
          startDate: args.start_date,
          endDate: args.end_date,
          category: args.category,
          region: args.region,
          language: args.language,
          limit: clampLimit(args.limit, 20, config.maxLimit),
        },
        exec.signal,
      )
      return result
    },
  })
}
