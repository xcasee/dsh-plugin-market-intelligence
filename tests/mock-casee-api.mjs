// -*- coding: utf-8 -*-
/**
 * Mock CaSee REST API — an in-process stand-in for the platform's REST surface.
 *
 * It implements the three endpoints the plugin actually calls
 * (`GET /v1/sources/search`, `GET /v1/searchx`, `POST /v1/semantic-search`)
 * over the synthetic corpus, including the X-API-Key gate, the query-syntax
 * parser, the day-window cap and the per-minute rate limit. Running the real
 * plugin code against this server is what makes the simulation an end-to-end
 * test of the plugin rather than of a Python reimplementation.
 */
import { createServer } from 'node:http';
import { CORPUS, MAX_DAYS, RATE_LIMIT_PER_MIN, SOURCES, TODAY } from './fixtures.mjs';

const TOKEN_RE = /([+-]?)"([^"]+)"|([+-]?)([^\s()]+)/g;

/** Parse the Google-style `q` into must / should / exclude synonym groups. */
export function parseQuery(q) {
  const cleaned = (q || '')
    .replaceAll('+ (', '+')
    .replaceAll('- (', '-')
    .replaceAll('+(', '+')
    .replaceAll('-(', '-')
    .replaceAll('(', ' ')
    .replaceAll(')', ' ');
  const must = [];
  const should = [];
  const exclude = [];
  for (const m of cleaned.matchAll(TOKEN_RE)) {
    const phrase = m[2];
    const word = m[4];
    const sign = m[1] || m[3] || '';
    const token = phrase !== undefined ? phrase : word;
    if (!token) continue;
    const group = token.split('|');
    (sign === '-' ? exclude : sign === '+' ? must : should).push(group);
  }
  return { must, should, exclude };
}

function matches(text, groups) {
  return groups.every((group) => group.some((t) => t && text.toLowerCase().includes(t.toLowerCase())));
}

function splitSet(value) {
  return new Set((value || '').split(',').map((s) => s.trim()).filter(Boolean));
}

function dayWindow(item, days) {
  const limit = new Date(`${TODAY}T23:59:59Z`).getTime() - (days || 30) * 86400000;
  return new Date(item.published_at).getTime() >= limit;
}

function asItem(item) {
  return {
    news_id: item.news_id,
    title: item.title,
    description: item.description,
    summary: item.summary,
    source_id: item.source_id,
    source_name: item.source_name,
    tscore: item.tscore,
    published_at: item.published_at,
    url: item.url,
    category: item.category,
    region: item.region,
    language: item.language,
  };
}

/** Start the mock server. Resolves to its base URL plus a handle for assertions. */
export async function startMockCaseeApi() {
  const state = {
    requests: [],
    counts: new Map(),
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    state.requests.push(`${req.method} ${url.pathname}`);

    const minute = Math.floor(Date.now() / 60000);
    const key = `${minute}`;
    const used = (state.counts.get(key) ?? 0) + 1;
    state.counts.set(key, used);

    const send = (status, payload, headers = {}) => {
      const body = JSON.stringify(payload);
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
      res.end(body);
    };

    if (req.headers['x-api-key'] !== 'sim-key') {
      return send(401, { error: 'Authentication required', code: -32001 });
    }
    if (used > RATE_LIMIT_PER_MIN) {
      return send(429, { error: 'Too many requests' });
    }

    if (req.method === 'GET' && url.pathname === '/v1/sources/search') {
      const category = splitSet(url.searchParams.get('category'));
      const region = splitSet(url.searchParams.get('region'));
      const language = splitSet(url.searchParams.get('language'));
      const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
      const minTscore = Number(url.searchParams.get('min_tscore') ?? 0.1);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const sampleSize = Number(url.searchParams.get('sample_size') ?? 2);

      const sources = SOURCES.filter((s) => {
        if (category.size && !category.has(s.category)) return false;
        if (region.size && !region.has(s.region)) return false;
        if (language.size && !language.has(s.language)) return false;
        if (keyword && !s.name.toLowerCase().includes(keyword)) return false;
        return s.tscore >= minTscore;
      })
        .slice(0, limit)
        .map((s) => ({
          ...s,
          sample_data: CORPUS.filter((i) => i.source_id === s.source_id)
            .slice(0, sampleSize)
            .map((i) => ({ title: i.title, published_at: i.published_at })),
        }));

      return send(200, { count: sources.length, total: sources.length, sources });
    }

    if (req.method === 'GET' && url.pathname === '/v1/searchx') {
      const q = url.searchParams.get('q') || '';
      const sourceIds = splitSet(url.searchParams.get('source_ids'));
      const category = splitSet(url.searchParams.get('category'));
      const region = splitSet(url.searchParams.get('region'));
      const language = splitSet(url.searchParams.get('language'));
      const minTscore = Number(url.searchParams.get('min_tscore') ?? 0);
      const days = Number(url.searchParams.get('days') ?? 30);
      const limit = Number(url.searchParams.get('limit') ?? 20);

      if (days > MAX_DAYS) {
        return send(400, { error: `days 超出服务端上限：${days} > ${MAX_DAYS}` });
      }

      const { must, should, exclude } = parseQuery(q);
      let hits = CORPUS.filter((item) => {
        const text = `${item.title} ${item.summary} ${item.tags.join(' ')}`;
        if (!matches(text, must)) return false;
        if (exclude.length && matches(text, exclude)) return false;
        if (should.length && !matches(text, should)) return false;
        return true;
      });
      if (sourceIds.size) hits = hits.filter((i) => sourceIds.has(i.source_id));
      if (category.size) hits = hits.filter((i) => category.has(i.category));
      if (region.size) hits = hits.filter((i) => region.has(i.region));
      if (language.size) hits = hits.filter((i) => language.has(i.language));
      hits = hits.filter((i) => dayWindow(i, days) && i.tscore >= minTscore);
      hits = hits.sort((a, b) => b.published_at.localeCompare(a.published_at));

      const page = hits.slice(0, limit).map(asItem);
      return send(200, {
        search_metadata: { id: 'sim-mk-req', status: 'Success' },
        search_parameters: { q, days, limit },
        search_information: {
          total_results: page.length,
          returned: page.length,
          raw_hits: hits.length,
          truncated: hits.length > limit,
        },
        translated_keywords: /[\u4e00-\u9fff]/.test(q) ? 'auto-translated (simulated)' : '',
        count: page.length,
        items: page,
      });
    }

    if (req.method === 'POST' && url.pathname === '/v1/semantic-search') {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        let body = {};
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          return send(400, { error: 'invalid JSON body' });
        }
        const conceptMap = {
          卡脖子: ['supplier_power', 'scarcity'],
          稀缺: ['scarcity'],
          国产替代: ['unmet_need', 'order'],
          泡沫: ['bubble', 'overheat'],
          价格战: ['price_war'],
          壁垒: ['barrier_ip', 'barrier_scale'],
          禁令: ['policy_redline', 'veto'],
          过热: ['overheat', 'funding'],
        };
        const wanted = new Set();
        for (const [term, tags] of Object.entries(conceptMap)) {
          if ((body.q || '').includes(term)) tags.forEach((t) => wanted.add(t));
        }
        const hits = CORPUS.filter((item) => item.tags.some((t) => wanted.has(t)));
        const topK = Number(body.top_k ?? 20);
        return send(200, {
          search_information: {
            fusion: {
              bm25_hits: Math.floor(hits.length / 2),
              vector_hits: hits.length,
              degraded: false,
            },
            clue_only: true,
          },
          count: Math.min(hits.length, topK),
          organic_results: hits.slice(0, topK).map((item) => ({
            ...asItem(item),
            similarity: Number((0.9 - item.tags.length * 0.05).toFixed(3)),
          })),
        });
      });
      return undefined;
    }

    return send(404, { error: 'not found', path: url.pathname });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    requests: state.requests,
    countOf(path) {
      return state.requests.filter((r) => r.endsWith(path)).length;
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
