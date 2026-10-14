/**
 * `analyze_trend` — bucket matching intelligence over time.
 *
 * The trend view is computed locally from a large `searchx` page: the REST API
 * exposes search, not trend, so this tool fetches a wide window and aggregates
 * it here. Buckets are daily, collapsing to monthly when the window is broad.
 *
 * @module dsh-plugin-market-intelligence/tools/analyze-trend
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { CaseeClient } from '../casee-client.js'
import type { Config } from '../config.js'
import type { IntelItem, TrendPoint, TrendResult } from '../types.js'
import { clampLimit, dateOnly } from './shared.js'

const DAILY_BUCKET_LIMIT = 45

function bucketKey(item: IntelItem, monthly: boolean): string {
  const day = dateOnly(item.published_at)
  return monthly ? day.slice(0, 7) : day
}

function buildTrend(items: IntelItem[]): TrendResult['trend'] {
  const days = new Set(items.map((item) => dateOnly(item.published_at)).filter(Boolean))
  const monthly = days.size > DAILY_BUCKET_LIMIT
  const buckets = new Map<string, IntelItem[]>()
  for (const item of items) {
    const key = bucketKey(item, monthly)
    if (!key) continue
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => {
      const counts = new Map<string, number>()
      for (const item of bucket) {
        const name = item.source_name || item.source_id
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      const topSources = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name)
      const point: TrendPoint = { date, count: bucket.length, top_sources: topSources }
      return point
    })
}

/** Build the trend-analysis tool for one client and configuration. */
export function createAnalyzeTrendTool(client: CaseeClient, config: Config) {
  return defineTool({
    name: 'analyze_trend',
    description:
      'Aggregate matching intelligence by day (or month for long windows) to find volume peaks, catalytic dates and the sources driving each peak. Use for questions about trends, momentum, heat and timing.',
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
      days: { type: 'number', default: 90, description: 'Window in days. Default 90.' },
      limit: {
        type: 'number',
        default: 200,
        description: `Maximum items aggregated (<= ${config.maxLimit}). Default 200.`,
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string' },
          granularity: { type: 'string', enum: ['day', 'month'] },
          date_range: {
            type: 'object',
            additionalProperties: false,
            properties: { start: { type: 'string' }, end: { type: 'string' } },
          },
          summary: {
            type: 'object',
            additionalProperties: false,
            properties: {
              total: { type: 'number' },
              peak_date: { type: 'string' },
              peak_count: { type: 'number' },
              avg_per_bucket: { type: 'number' },
              total_sources: { type: 'number' },
            },
          },
          trend: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                date: { type: 'string' },
                count: { type: 'number' },
                top_sources: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      render: (_args, value) => {
        const result = value as unknown as TrendResult
        if (result.trend.length === 0) {
          return [{ type: 'text', text: 'No trend data matched. Broaden the query or the window.' }]
        }
        const head = `Trend of "${result.query}" (${result.granularity} buckets, ${result.date_range.start} → ${result.date_range.end})\nTotal ${result.summary.total} items across ${result.summary.total_sources} sources; peak ${result.summary.peak_date} with ${result.summary.peak_count}.`
        const rows = result.trend
          .map((point) => `- ${point.date}: ${point.count}${point.top_sources.length ? ` (top: ${point.top_sources.join(', ')})` : ''}`)
          .join('\n')
        return [{ type: 'text', text: `${head}\n${rows}` }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const page = await client.searchIntelligence(
        {
          q: args.q,
          sourceIds: args.source_ids,
          minTscore: args.min_tscore ?? config.defaultMinTscore,
          days: args.days ?? 90,
          limit: clampLimit(args.limit, 200, config.maxLimit),
        },
        exec.signal,
      )
      const trend = buildTrend(page.items)
      const dates = page.items.map((item) => dateOnly(item.published_at)).filter(Boolean).sort()
      const peak = trend.reduce<TrendPoint | undefined>(
        (best, point) => (best === undefined || point.count > best.count ? point : best),
        undefined,
      )
      const result: TrendResult = {
        query: args.q,
        granularity: trend.some((point) => point.date.length === 7) ? 'month' : 'day',
        date_range: { start: dates[0] ?? '', end: dates[dates.length - 1] ?? '' },
        summary: {
          total: page.items.length,
          peak_date: peak?.date ?? '',
          peak_count: peak?.count ?? 0,
          avg_per_bucket: trend.length ? Number((page.items.length / trend.length).toFixed(2)) : 0,
          total_sources: new Set(page.items.map((item) => item.source_id)).size,
        },
        trend,
      }
      return result
    },
  })
}
