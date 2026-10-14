// -*- coding: utf-8 -*-
/**
 * Simulation entry point.
 *
 *   node tests/run.mjs
 *
 * Boots the mock CaSee REST API, drives the built plugin through the full
 * market-intelligence pipeline, asserts the tool layer and the methodology,
 * and writes the two deliverables plus a machine-readable result dump.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaseeClient } from '../lib/casee-client.js';
import { CaseeApiError } from '../lib/errors.js';
import { createSearchIntelligenceTool } from '../lib/tools/search-intelligence.js';
import { createSemanticSearchTool } from '../lib/tools/semantic-search.js';
import { CORPUS } from './fixtures.mjs';
import { startMockCaseeApi } from './mock-casee-api.mjs';
import { runPipeline } from './pipeline.mjs';
import { buildHtml, buildMarkdown } from './report-builder.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');

const BASE_CONFIG = {
  apiKeyEnv: 'CASEE_API_KEY',
  defaultDays: 30,
  defaultMinTscore: 0.6,
  maxLimit: 200,
  timeoutMs: 15000,
  requestIntervalMs: 0,
  registerSkill: false,
  registerPrompt: false,
  platformUrl: 'https://casee.me',
  outputLanguage: 'auto',
};

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
}

async function expectError(name, fn, expectedCode) {
  try {
    await fn();
    check(name, false, `expected ${expectedCode}, but the call succeeded`);
  } catch (error) {
    const code = error instanceof CaseeApiError ? error.code : `not-CaseeApiError:${error?.name}`;
    check(name, code === expectedCode, `expected ${expectedCode}, got ${code} (${error?.message})`);
  }
}

async function main() {
  const mock = await startMockCaseeApi();
  const result = await runPipeline(mock.baseUrl);

  // ---- Methodology expectations (see the score breakdown in logic.mjs) ------
  check('screw → Niche Go', result.tracks.screw.band === 'Niche Go', `got ${result.tracks.screw.band} (MEI ${result.tracks.screw.mei})`);
  check('humanoid → Watch', result.tracks.humanoid.band === 'Watch', `got ${result.tracks.humanoid.band} (MEI ${result.tracks.humanoid.mei})`);
  check('emotion → No-Go via veto', result.tracks.emotion.band === 'No-Go' && result.tracks.emotion.vetoes.length > 0, `got ${result.tracks.emotion.band}, vetoes=${result.tracks.emotion.vetoes.length}`);
  check('MEI ordering screw > humanoid', result.tracks.screw.mei > result.tracks.humanoid.mei, `${result.tracks.screw.mei} vs ${result.tracks.humanoid.mei}`);
  check('screw MEI ≈ 73.6', Math.abs(result.tracks.screw.mei - 73.6) <= 0.5, `got ${result.tracks.screw.mei}`);
  check('confidence computed for all tracks', ['screw', 'humanoid', 'emotion'].every((k) => ['高', '中', '低'].includes(result.tracks[k].confidence)));

  // ---- Tool layer: source discovery ----------------------------------------
  check('find_trusted_sources(authority) returns sources', result.sourceGroups.authority > 0, `count=${result.sourceGroups.authority}`);
  check('no source below the requested min_tscore', (await sourceCheck(mock.baseUrl)), 'all returned sources met min_tscore');

  // ---- Tool layer: search + filters ----------------------------------------
  const screwScan = result.tracks.screw.scans[0];
  check('search_intelligence returns items', screwScan.items.length > 0, `items=${screwScan.items.length}`);
  check('search_intelligence honors min_tscore default', screwScan.items.every((i) => i.tscore >= 0.6), 'all items ≥ 0.6');
  check('search_intelligence carries source names', screwScan.items.every((i) => i.source_name && i.source_id), 'source_id + source_name present');
  check('search_intelligence reports truncation state', typeof screwScan.truncated === 'boolean');

  const highOnly = await searchWithMin(mock.baseUrl, 0.8);
  check('min_tscore=0.8 filter applied', highOnly.length > 0 && highOnly.every((i) => i.tscore >= 0.8), `items=${highOnly.length}`);

  // ---- Tool layer: trend + aggregation -------------------------------------
  const trend = result.tracks.screw.trend;
  check('analyze_trend returns buckets', trend.trend.length > 0, `buckets=${trend.trend.length} (${trend.granularity})`);
  check('analyze_trend summary is coherent', trend.summary.total === trend.trend.reduce((n, p) => n + p.count, 0), `total=${trend.summary.total}`);
  // 15 labelled screw items plus one cross-matching whole-robot item that also
  // mentions 丝杠 — a faithful result of searching a shared corpus by keywords.
  check('analyze_trend keeps daily buckets while distinct days ≤ 45', trend.granularity === 'day' && trend.trend.length === 16, `got ${trend.granularity} with ${trend.trend.length} buckets`);

  const agg = result.aggregate;
  check('aggregate_by_source returns sources', agg.sources.length > 0, `sources=${agg.sources.length}`);
  check('aggregate sorted by count desc', agg.sources.every((s, idx) => idx === 0 || agg.sources[idx - 1].count >= s.count));
  check('aggregate avg_tscore within [0,1]', agg.sources.every((s) => s.avg_tscore >= 0 && s.avg_tscore <= 1));

  // ---- Tool layer: semantic path -------------------------------------------
  check('search_with_cvc collected items', result.collectedCount > 0, `collected=${result.collectedCount}`);
  check('semantic_search returns hits with fusion', result.semantic.hits.length > 0 && result.semantic.fusion.vector_hits > 0, `hits=${result.semantic.hits.length}`);
  check('semantic hits carry similarity', result.semantic.hits.every((h) => typeof h.similarity === 'number'));
  check('semantic clues were re-verified on the keyword path', result.semanticVerified.length > 0, `verified=${result.semanticVerified.length}`);

  // ---- Tool layer: model-facing render -------------------------------------
  check('render(find_trusted_sources) produced a source list', result.renders.findSources.includes('Trusted sources:'));
  check('render(search_intelligence) produced a ranked list', /Matched: \d+/.test(result.renders.search));
  check('render(analyze_trend) produced trend prose', result.renders.trend.includes('Trend of'));
  check('render(semantic_search) produced fusion prose', result.renders.semantic.includes('Semantic ('));

  // ---- Negative paths -------------------------------------------------------
  await expectError('missing API key → AUTH_REQUIRED', async () => {
    const anon = new CaseeClient({ ...BASE_CONFIG, baseUrl: mock.baseUrl, apiKeyEnv: 'CASEE_KEY_THAT_DOES_NOT_EXIST' });
    await createSearchIntelligenceTool(anon, { ...BASE_CONFIG, apiBaseUrl: mock.baseUrl }).execute({ q: '+丝杠' }, { signal: new AbortController().signal });
  }, 'AUTH_REQUIRED');

  await expectError('malformed cvc_model_id → INVALID_ARGUMENT', async () => {
    const client = new CaseeClient({ ...BASE_CONFIG, baseUrl: mock.baseUrl, apiKey: 'sim-key' });
    await createSemanticSearchTool(client, { ...BASE_CONFIG, apiBaseUrl: mock.baseUrl }).execute(
      { cvc_model_id: 'BAD', q: 'x' },
      { signal: new AbortController().signal },
    );
  }, 'INVALID_ARGUMENT');

  await expectError('days over server cap → HTTP_ERROR', async () => {
    const client = new CaseeClient({ ...BASE_CONFIG, baseUrl: mock.baseUrl, apiKey: 'sim-key' });
    await createSearchIntelligenceTool(client, { ...BASE_CONFIG, apiBaseUrl: mock.baseUrl }).execute(
      { q: '+丝杠', days: 5000 },
      { signal: new AbortController().signal },
    );
  }, 'HTTP_ERROR');

  // ---- Artifacts ------------------------------------------------------------
  mkdirSync(OUT, { recursive: true });
  const markdown = buildMarkdown(result);
  const html = buildHtml(result);
  writeFileSync(join(OUT, 'market-track-landscape-report.md'), markdown, 'utf8');
  writeFileSync(join(OUT, 'market-track-landscape-report.html'), html, 'utf8');
  writeFileSync(join(OUT, 'sim-result.json'), JSON.stringify(stripForJson(result), null, 2), 'utf8');

  check('HTML is a single self-contained file', html.startsWith('<!doctype html>') && html.includes('Powered by CaSee'));
  check('HTML has every chart container wired', ['chart-trend', 'chart-source', 'chart-grade', 'chart-radar'].every((id) => html.includes(`id="${id}"`) && html.includes(`mk('${id}'`)));
  check('HTML carries no mermaid', !/mermaid/i.test(html));
  check('Markdown summary carries citations', /〔[ABCD]·/.test(markdown));

  await mock.close();

  // ---- Report ---------------------------------------------------------------
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;
  console.log('\n=== 市场情报分析专家 DSH 插件 · 仿真测试 ===');
  for (const c of checks) console.log(`${c.ok ? '  PASS' : '  FAIL'}  ${c.name}${c.detail && !c.ok ? `  — ${c.detail}` : ''}`);
  console.log('\n--- 赛道结论 ---');
  for (const key of ['screw', 'humanoid', 'emotion']) {
    const t = result.tracks[key];
    console.log(
      `  ${t.meta.cn.padEnd(14, ' ')} MA=${String(t.ma.weighted_100).padStart(5)} CE=${String(t.ce.weighted_100).padStart(5)} WO=${String(t.wo.weighted_100).padStart(5)} MEI=${String(t.mei).padStart(5)} 置信度=${t.confidence} 结论=${t.band}`,
    );
  }
  console.log('\n--- 工具调用统计 ---');
  console.log(`  ${Object.entries(result.counts).map(([k, v]) => `${k}×${v}`).join(', ')}`);
  console.log(`  实际 HTTP 请求：sources/search×${mock.countOf('/v1/sources/search')}, searchx×${mock.countOf('/v1/searchx')}, semantic-search×${mock.countOf('/v1/semantic-search')}`);
  console.log(`\n产物：${OUT}`);
  console.log(`\n结果：${passed}/${checks.length} 通过${failed ? `，${failed} 失败` : ''}`);

  if (failed) process.exitCode = 1;
}

/** Confirm every source returned by the authority query respects its own min_tscore. */
async function sourceCheck(baseUrl) {
  const client = new CaseeClient({ ...BASE_CONFIG, baseUrl, apiKey: 'sim-key' });
  const { createFindTrustedSourcesTool } = await import('../lib/tools/find-trusted-sources.js');
  const sources = await createFindTrustedSourcesTool(client, { ...BASE_CONFIG, apiBaseUrl: baseUrl }).execute(
    { category: 'wire,mainstream', min_tscore: 0.6, limit: 20 },
    { signal: new AbortController().signal },
  );
  return sources.sources.length > 0 && sources.sources.every((s) => s.tscore >= 0.6);
}

/** Run a high-credibility search and return its items. */
async function searchWithMin(baseUrl, minTscore) {
  const client = new CaseeClient({ ...BASE_CONFIG, baseUrl, apiKey: 'sim-key' });
  const result = await createSearchIntelligenceTool(client, { ...BASE_CONFIG, apiBaseUrl: baseUrl }).execute(
    { q: '+丝杠', min_tscore: minTscore, days: 365, limit: 50 },
    { signal: new AbortController().signal },
  );
  return result.items;
}

/** Drop the rendered strings so the JSON dump stays readable. */
function stripForJson(result) {
  return {
    scenario: '人形机器人相关三条赛道进入评估（仿真）',
    corpusSize: CORPUS.length,
    fit: result.fit,
    sourceGroups: result.sourceGroups,
    grades: result.grades,
    semanticVerified: result.semanticVerified,
    counts: result.counts,
    tracks: Object.fromEntries(
      Object.entries(result.tracks).map(([key, t]) => [
        key,
        {
          name: t.meta.cn,
          n: t.n,
          ma: t.ma.weighted_100,
          ce: t.ce.weighted_100,
          wo: t.wo.weighted_100,
          mei: t.mei,
          confidence: t.confidence,
          band: t.band,
          band_reason: t.band_reason,
          scores: { ma: t.ma.scores, ce: t.ce.scores, wo: t.wo.scores },
          forces: t.forces,
          vetoes: t.vetoes,
          concentration: t.concentration,
          trend: { granularity: t.trend.granularity, summary: t.trend.summary },
        },
      ]),
    ),
  };
}

main().catch((error) => {
  console.error('simulation failed:', error);
  process.exitCode = 1;
});
