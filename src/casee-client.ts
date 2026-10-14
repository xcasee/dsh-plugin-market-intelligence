/**
 * CaSee Intelligence REST client.
 *
 * The public CaSee platform exposes the same intelligence corpus over REST as
 * it does over MCP; this client is the single place that translates the
 * documented REST contract into the canonical value shapes the tools declare.
 * Response parsing is deliberately defensive: field aliases observed across
 * deployments are folded into one shape, so a payload that names a timestamp
 * `date` rather than `published_at` still yields a well-formed item.
 *
 * @module dsh-plugin-market-intelligence/casee-client
 */
import { CaseeApiError } from './errors.js'
import type {
  IntelItem,
  SearchResult,
  SemanticHit,
  SemanticResult,
  SourceRecord,
  SourceSearchResult,
} from './types.js'

/** Construction inputs for {@link CaseeClient}. */
export interface CaseeClientOptions {
  /** REST base URL, e.g. `http://121.43.113.132:8000`. */
  baseUrl: string
  /** Environment variable holding the API key. */
  apiKeyEnv: string
  /** Per-request timeout in milliseconds. */
  timeoutMs: number
  /** Minimum spacing between requests in milliseconds; 0 disables pacing. */
  requestIntervalMs: number
  /** Public site URL surfaced in remediation hints. */
  platformUrl: string
  /** Explicit key override (tests and advanced embedders); wins over the env var. */
  apiKey?: string
}

/** Parameters accepted by `search_intelligence` / `search_with_cvc`. */
export interface SearchParams {
  q: string
  sourceIds?: string[]
  mustKeywords?: string
  shouldKeywords?: string
  notKeywords?: string
  minTscore?: number
  days?: number
  startDate?: string
  endDate?: string
  category?: string
  region?: string
  language?: string
  limit?: number
  cvcModelId?: string
}

/** Parameters accepted by `find_trusted_sources`. */
export interface SourceParams {
  keyword?: string
  category?: string
  region?: string
  language?: string
  minTscore?: number
  sampleSize?: number
  limit?: number
}

/** Parameters accepted by `semantic_search`. */
export interface SemanticParams {
  cvcModelId: string
  q: string
  mode?: string
  topK?: number
  timeRange?: string
  days?: number
  category?: string
  region?: string
  language?: string
  minTscore?: number
}

type QueryValue = string | number | boolean | undefined
type RawObject = Record<string, unknown>

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  return fallback
}

function asObject(value: unknown): RawObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawObject) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** First defined value among several accepted aliases. */
function pick(source: RawObject, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

/** The result of one authenticated REST call. */
export class CaseeClient {
  private readonly baseUrl: string
  private readonly apiKeyEnv: string
  private readonly timeoutMs: number
  private readonly requestIntervalMs: number
  private readonly platformUrl: string
  private readonly explicitKey?: string
  private nextAllowedAt = 0
  /** Source names learned from prior discoveries, used to label search hits. */
  private readonly sourceNames = new Map<string, string>()

  constructor(options: CaseeClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiKeyEnv = options.apiKeyEnv
    this.timeoutMs = options.timeoutMs
    this.requestIntervalMs = options.requestIntervalMs
    this.platformUrl = options.platformUrl
    if (options.apiKey !== undefined) this.explicitKey = options.apiKey
  }

  /** Whether a usable API key is currently configured. */
  hasApiKey(): boolean {
    return this.resolveApiKey() !== undefined
  }

  private resolveApiKey(): string | undefined {
    if (this.explicitKey && this.explicitKey.trim()) return this.explicitKey.trim()
    const value = process.env[this.apiKeyEnv]
    return value && value.trim() ? value.trim() : undefined
  }

  /**
   * Discover trusted sources by category, region, language and credibility.
   * @param params - filter inputs; every field is optional.
   * @param signal - caller cancellation.
   * @returns normalized sources plus the total reported by the API.
   */
  async findTrustedSources(params: SourceParams, signal?: AbortSignal): Promise<SourceSearchResult> {
    const data = await this.request<RawObject>('/v1/sources/search', {
      method: 'GET',
      query: {
        keyword: params.keyword,
        category: params.category,
        region: params.region,
        language: params.language,
        min_tscore: params.minTscore,
        sample_size: params.sampleSize,
        limit: params.limit,
      },
      signal,
    })
    const sources = asArray(pick(data, 'sources', 'items', 'results')).map((entry) =>
      this.normalizeSource(asObject(entry)),
    )
    for (const source of sources) this.sourceNames.set(source.source_id, source.name)
    return {
      count: asNumber(pick(data, 'count'), sources.length),
      total: asNumber(pick(data, 'total'), sources.length),
      sources,
    }
  }

  /**
   * Run a Google-style keyword search over the trusted corpus.
   * @param params - query and filters.
   * @param signal - caller cancellation.
   * @returns normalized items, honoring the API's on-demand translation.
   */
  async searchIntelligence(params: SearchParams, signal?: AbortSignal): Promise<SearchResult> {
    const data = await this.request<RawObject>('/v1/searchx', {
      method: 'GET',
      query: {
        q: params.q,
        source_ids: params.sourceIds?.length ? params.sourceIds.join(',') : undefined,
        must_keywords: params.mustKeywords,
        should_keywords: params.shouldKeywords,
        not_keywords: params.notKeywords,
        min_tscore: params.minTscore,
        days: params.days,
        start_date: params.startDate,
        end_date: params.endDate,
        category: params.category,
        region: params.region,
        language: params.language,
        limit: params.limit,
        cvc_model_id: params.cvcModelId,
      },
      signal,
    })
    return this.toSearchResult(params.q, data)
  }

  /**
   * Run a BM25 + vector + RRF semantic query against one CVC model.
   * @param params - concept query and filters.
   * @param signal - caller cancellation.
   * @returns semantic hits plus the fusion diagnostics.
   */
  async semanticSearch(params: SemanticParams, signal?: AbortSignal): Promise<SemanticResult> {
    const data = await this.request<RawObject>('/v1/semantic-search', {
      method: 'POST',
      body: {
        cvc_model_id: params.cvcModelId,
        q: params.q,
        mode: params.mode,
        top_k: params.topK,
        time_range: params.timeRange,
        days: params.days,
        category: params.category,
        region: params.region,
        language: params.language,
        min_tscore: params.minTscore,
      },
      signal,
    })
    const info = asObject(pick(data, 'search_information'))
    const fusion = asObject(pick(info, 'fusion'))
    const rawHits = asArray(pick(data, 'organic_results', 'items', 'results'))
    const hits: SemanticHit[] = rawHits.map((entry) => {
      const raw = asObject(entry)
      return {
        ...this.normalizeItem(raw),
        similarity: asNumber(pick(raw, 'similarity', 'score', 'vector_score'), 0),
      }
    })
    return {
      cvc_model_id: params.cvcModelId,
      mode: params.mode ?? 'hybrid',
      fusion: {
        bm25_hits: asNumber(pick(fusion, 'bm25_hits'), 0),
        vector_hits: asNumber(pick(fusion, 'vector_hits'), hits.length),
        degraded: asBoolean(pick(fusion, 'degraded'), false),
      },
      count: asNumber(pick(data, 'count'), hits.length),
      hits,
    }
  }

  private toSearchResult(query: string, data: RawObject): SearchResult {
    const rawItems = asArray(pick(data, 'items', 'organic_results', 'results'))
    const items = rawItems.map((entry) => this.normalizeItem(asObject(entry)))
    const info = asObject(pick(data, 'search_information'))
    const count = asNumber(pick(data, 'count'), items.length)
    const raw = asNumber(pick(info, 'raw_hits'), items.length)
    return {
      query,
      count,
      truncated: asBoolean(pick(info, 'truncated'), raw > items.length),
      translated_keywords: asString(pick(data, 'translated_keywords')),
      items,
    }
  }

  private normalizeSource(raw: RawObject): SourceRecord {
    const sourceId = asString(pick(raw, 'source_id', 'sourceId', 'id'))
    return {
      source_id: sourceId,
      name: asString(pick(raw, 'name', 'source_name', 'title'), sourceId),
      tscore: asNumber(pick(raw, 'tscore', 'score', 'trust_score', 'trustScore'), 0),
      category: asString(pick(raw, 'category')),
      tier: asNumber(pick(raw, 'tier'), 3),
      region: asString(pick(raw, 'region')),
      language: asString(pick(raw, 'language')),
      propaganda_risk: asString(pick(raw, 'propaganda_risk', 'propagandaRisk')),
      state_affiliated: asBoolean(pick(raw, 'state_affiliated', 'stateAffiliated'), false),
      sample_data: asArray(pick(raw, 'sample_data', 'samples')).map((entry) => {
        const sample = asObject(entry)
        return {
          title: asString(pick(sample, 'title')),
          published_at: asString(pick(sample, 'published_at', 'date')),
        }
      }),
    }
  }

  private normalizeItem(raw: RawObject): IntelItem {
    const sourceId = asString(pick(raw, 'source_id', 'sourceId', 'source'))
    const sourceName =
      asString(pick(raw, 'source_name', 'sourceName', 'publisher')) ||
      this.sourceNames.get(sourceId) ||
      sourceId
    return {
      title: asString(pick(raw, 'title', 'headline', 'name')),
      description: asString(pick(raw, 'description', 'summary', 'abstract', 'snippet')),
      source_id: sourceId,
      source_name: sourceName,
      tscore: asNumber(pick(raw, 'tscore', 'score', 'trust_score', 'trustScore'), 0),
      published_at: asString(pick(raw, 'published_at', 'publishedAt', 'date', 'datetime', 'time')),
      url: asString(pick(raw, 'url', 'link', 'resolved_url')),
      category: asString(pick(raw, 'category')),
      region: asString(pick(raw, 'region')),
      language: asString(pick(raw, 'language')),
    }
  }

  private async pace(): Promise<void> {
    if (this.requestIntervalMs <= 0) return
    const now = Date.now()
    const wait = this.nextAllowedAt - now
    this.nextAllowedAt = Math.max(now, this.nextAllowedAt) + this.requestIntervalMs
    if (wait > 0) await delay(wait)
  }

  private async request<T>(
    path: string,
    init: { method: 'GET' | 'POST'; query?: Record<string, QueryValue>; body?: unknown; signal?: AbortSignal },
  ): Promise<T> {
    const apiKey = this.resolveApiKey()
    if (!apiKey) {
      throw new CaseeApiError(
        `CaSee API key is not configured (environment variable ${this.apiKeyEnv} is empty).`,
        {
          code: 'AUTH_REQUIRED',
          hint: `Register a free account at ${this.platformUrl} to get an API key, then export ${this.apiKeyEnv}=<key> and restart dsh.`,
        },
      )
    }

    const url = new URL(this.baseUrl + path)
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }

    await this.pace()

    const timeoutSignal = AbortSignal.timeout(this.timeoutMs)
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal

    let response: Response
    try {
      response = await fetch(url, {
        method: init.method,
        headers: {
          'X-API-Key': apiKey,
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
        signal,
      })
    } catch (error) {
      if (init.signal?.aborted) {
        throw new CaseeApiError('The request was cancelled.', { code: 'ABORTED' })
      }
      if (timeoutSignal.aborted) {
        throw new CaseeApiError(`The CaSee API did not respond within ${this.timeoutMs} ms.`, {
          code: 'TIMEOUT',
          hint: 'Retry, or raise timeoutMs in the plugin config for slow deployments.',
        })
      }
      throw new CaseeApiError(`Could not reach the CaSee API at ${this.baseUrl}.`, {
        code: 'NETWORK_ERROR',
        hint: 'Verify apiBaseUrl and that the host is reachable from this machine.',
      })
    }

    if (!response.ok) {
      throw this.errorForStatus(response.status)
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new CaseeApiError('The CaSee API returned a response that is not valid JSON.', {
        code: 'BAD_RESPONSE',
        status: response.status,
      })
    }
  }

  private errorForStatus(status: number): CaseeApiError {
    if (status === 401) {
      return new CaseeApiError('The CaSee API rejected the API key.', {
        code: 'AUTH_REQUIRED',
        status,
        hint: `Check the ${this.apiKeyEnv} value (no stray spaces), or claim a new key at ${this.platformUrl}.`,
      })
    }
    if (status === 403) {
      return new CaseeApiError('The API key is not permitted to access this resource.', {
        code: 'FORBIDDEN',
        status,
        hint: `Confirm the key's plan covers this endpoint at ${this.platformUrl}.`,
      })
    }
    if (status === 429) {
      return new CaseeApiError('The CaSee API rate limit was exceeded.', {
        code: 'RATE_LIMITED',
        status,
        hint: 'Slow down (stay under ~100 requests per minute) and retry.',
      })
    }
    if (status >= 500) {
      return new CaseeApiError(`The CaSee API failed with status ${status}.`, {
        code: 'SERVER_ERROR',
        status,
        hint: 'Retry shortly; if it persists the platform may be degraded.',
      })
    }
    return new CaseeApiError(`The CaSee API returned status ${status}.`, {
      code: 'HTTP_ERROR',
      status,
    })
  }
}
