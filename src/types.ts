/**
 * Canonical value shapes returned by every tool.
 *
 * The client normalizes raw API payloads into exactly these shapes, and each
 * tool declares a matching output schema, so the canonical value the model and
 * Code Mode see never drifts from the documented contract.
 *
 * @module dsh-plugin-market-intelligence/types
 */

/** One sample headline attached to a discovered source. */
export interface SampleIntel {
  title: string
  published_at: string
}

/** A trusted source discovered by `find_trusted_sources`. */
export interface SourceRecord {
  source_id: string
  name: string
  tscore: number
  category: string
  tier: number
  region: string
  language: string
  propaganda_risk: string
  state_affiliated: boolean
  sample_data: SampleIntel[]
}

/** Result of `find_trusted_sources`. */
export interface SourceSearchResult {
  count: number
  total: number
  sources: SourceRecord[]
}

/** One intelligence item returned by search tools. */
export interface IntelItem {
  title: string
  description: string
  source_id: string
  source_name: string
  tscore: number
  published_at: string
  url: string
  category: string
  region: string
  language: string
}

/** Result of `search_intelligence` and `search_with_cvc`. */
export interface SearchResult {
  query: string
  count: number
  truncated: boolean
  translated_keywords: string
  items: IntelItem[]
}

/** One bucket of `analyze_trend`. */
export interface TrendPoint {
  date: string
  count: number
  top_sources: string[]
}

/** Result of `analyze_trend`. */
export interface TrendResult {
  query: string
  granularity: 'day' | 'month'
  date_range: { start: string; end: string }
  summary: {
    total: number
    peak_date: string
    peak_count: number
    avg_per_bucket: number
    total_sources: number
  }
  trend: TrendPoint[]
}

/** One aggregated source row from `aggregate_by_source`. */
export interface SourceAggregate {
  source_id: string
  name: string
  count: number
  avg_tscore: number
  sample_titles: string[]
}

/** Result of `aggregate_by_source`. */
export interface AggregateResult {
  query: string
  total: number
  sources: SourceAggregate[]
}

/** One semantic hit from `semantic_search`. */
export interface SemanticHit extends IntelItem {
  similarity: number
}

/** Result of `semantic_search`. */
export interface SemanticResult {
  cvc_model_id: string
  mode: string
  fusion: { bm25_hits: number; vector_hits: number; degraded: boolean }
  count: number
  hits: SemanticHit[]
}

/** The credibility grade derived from a T-Score and source tier. */
export type CredibilityGrade = 'A' | 'B' | 'C' | 'D'
