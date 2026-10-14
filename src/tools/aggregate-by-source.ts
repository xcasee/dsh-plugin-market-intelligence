/**
 * `aggregate_by_source` — per-source coverage, stance and credibility.
 *
 * Like the trend view, this is aggregated locally from one wide `searchx`
 * page, because the REST API exposes search rather than aggregation.
 *
 * @module dsh-plugin-market-intelligence/tools/aggregate-by-source
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { CaseeClient } from '../casee-client.js'
import type { Config } from '../config.js'
import type { AggregateResult, SourceAggregate } from '../types.js'
import { clampLimit } from './shared.js'

const MAX_SAMPLE_TITLES = 2

function buildAggregates(result: { items: { source_id: string; source_name: string; tscore: number; title: string }[] }): SourceAggregate[] {
  const rows = new Map<string, { aggregate: SourceAggregate; sum: number }>()
  for (const item of result.items) {
    const key = item.source_id
    const existing = rows.get(key)
    if (existing) {
      existing.aggregate.count += 1
      existing.sum += item.tscore
      if (existing.aggregate.sample_titles.length < MAX_SAMPLE_TITLES) {
        existing.aggregate.sample_titles.push(item.title)
      }
      continue
    }
    rows.set(key, {
      aggregate: {
        source_id: item.source_id,
        name: item.source_name || item.source_id,
        count: 1,
        avg_tscore: item.tscore,
        sample_titles: [item.title],
      },
      sum: item.tscore,
    })
  }
  return [...rows.values()]
    .map(({ aggregate, sum }) => ({
      ...aggregate,
      avg_tscore: Number((sum / aggregate.count).toFixed(3)),
    }))
    .sort((a, b) => b.count - a.count || b.avg_tscore - a.avg_tscore)
}

/** Build the per-source aggregation tool for one client and configuration. */
export function createAggregateBySourceTool(client: CaseeClient, config: Config) {
  return defineTool({
    name: 'aggregate_by_source',
    description:
      'Group matching intelligence by source to see how many outlets cover a topic, each outlet\'s average credibility, and sample headlines. Use to compare media stance, coverage breadth and which sources dominate a story.',
    parameters: {
      q: { type: 'string', required: true, description: 'Query string (same syntax as search_intelligence).' },
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
      limit: {
        type: 'number',
        default: 100,
        description: `Maximum items aggregated (<= ${config.maxLimit}). Default 100.`,
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string' },
          total: { type: 'number' },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                source_id: { type: 'string' },
                name: { type: 'string' },
                count: { type: 'number' },
                avg_tscore: { type: 'number' },
                sample_titles: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      render: (_args, value) => {
        const result = value as unknown as AggregateResult
        if (result.sources.length === 0) {
          return [{ type: 'text', text: 'No sources matched. Broaden the query or window.' }]
        }
        const rows = result.sources
          .map(
            (source) =>
              `- ${source.name} (${source.source_id}): ${source.count} items, avg T=${source.avg_tscore.toFixed(2)}${source.sample_titles[0] ? `\n   e.g. ${source.sample_titles[0]}` : ''}`,
          )
          .join('\n')
        return [
          {
            type: 'text',
            text: `Source coverage of "${result.query}" — ${result.sources.length} sources, ${result.total} items\n${rows}`,
          },
        ]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const page = await client.searchIntelligence(
        {
          q: args.q,
          sourceIds: args.source_ids,
          minTscore: args.min_tscore ?? config.defaultMinTscore,
          days: args.days ?? config.defaultDays,
          limit: clampLimit(args.limit, 100, config.maxLimit),
        },
        exec.signal,
      )
      const result: AggregateResult = {
        query: args.q,
        total: page.items.length,
        sources: buildAggregates(page),
      }
      return result
    },
  })
}
