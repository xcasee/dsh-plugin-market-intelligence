// -*- coding: utf-8 -*-
/**
 * Simulation pipeline — drives the BUILT PLUGIN (lib/) against the mock REST
 * API and records everything the report builder and the assertions need.
 *
 * Two layers are verified independently:
 *   1. transport/tool layer — the real `createXxxTool` implementations, the
 *      real `CaseeClient`, real query strings, real pagination and filters;
 *   2. methodology layer — `logic.mjs` over the labelled corpus, which is how
 *      the MCE scores and the Go/Watch/No-Go expectations are reproduced.
 */
import { CaseeClient } from '../lib/casee-client.js';
import { createAggregateBySourceTool } from '../lib/tools/aggregate-by-source.js';
import { createAnalyzeTrendTool } from '../lib/tools/analyze-trend.js';
import { createFindTrustedSourcesTool } from '../lib/tools/find-trusted-sources.js';
import { createSearchIntelligenceTool } from '../lib/tools/search-intelligence.js';
import { createSearchWithCvcTool } from '../lib/tools/search-with-cvc.js';
import { createSemanticSearchTool } from '../lib/tools/semantic-search.js';
import { CORPUS, TRACKS, TRACK_META } from './fixtures.mjs';
import * as ml from './logic.mjs';

const USER_PROFILE = {
  company: '精密零部件制造商（微米级加工、小批量量产能力强）',
  self: { tech: 4, capital: 3, channel: 2, customer: 3 },
};

const CONFIG = {
  apiBaseUrl: '',
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

const EXEC = { signal: new AbortController().signal };

/** Call a tool definition exactly the way the registry would, returning its canonical value. */
async function callTool(definition, args) {
  return definition.execute(args, EXEC);
}

/** First text block of a tool's model-facing render, proving the render path runs. */
function rendered(definition, args, value) {
  return definition.output.render(args, value)[0].text;
}

export async function runPipeline(mockBaseUrl) {
  const client = new CaseeClient({
    baseUrl: mockBaseUrl,
    apiKeyEnv: CONFIG.apiKeyEnv,
    timeoutMs: CONFIG.timeoutMs,
    requestIntervalMs: CONFIG.requestIntervalMs,
    platformUrl: CONFIG.platformUrl,
    apiKey: 'sim-key',
  });

  const tools = {
    findSources: createFindTrustedSourcesTool(client, CONFIG),
    search: createSearchIntelligenceTool(client, CONFIG),
    trend: createAnalyzeTrendTool(client, CONFIG),
    aggregate: createAggregateBySourceTool(client, CONFIG),
    searchCvc: createSearchWithCvcTool(client, CONFIG),
    semantic: createSemanticSearchTool(client, CONFIG),
  };

  const callLog = [];
  const calls = new Map();
  const record = (name) => {
    callLog.push(name);
    calls.set(name, (calls.get(name) ?? 0) + 1);
  };

  // ---- Round 0: global concept collection + semantic exploration -------------
  record('search_with_cvc');
  const collected = await callTool(tools.searchCvc, {
    q: '+(机器人|AI|丝杠|情绪识别)',
    cvc_model_id: 'cvc_humanoidtrack01',
    days: 365,
    limit: 100,
  });

  record('semantic_search');
  const semantic = await callTool(tools.semantic, {
    cvc_model_id: 'cvc_humanoidtrack01',
    q: '核心零部件卡脖子 国产替代 稀缺窗口 泡沫',
    mode: 'semantic',
    top_k: 12,
  });

  // Clues only: re-verify each semantic hit on the keyword path.
  const verifiedClues = [];
  for (const clue of semantic.hits.slice(0, 6)) {
    record('search_intelligence:verify-clue');
    const revisited = await callTool(tools.search, {
      q: `+${clue.title.slice(0, 4)}`,
      days: 365,
      min_tscore: 0,
      limit: 30,
    });
    if (revisited.items.some((i) => i.title === clue.title)) verifiedClues.push(clue.title);
  }

  // ---- Source discovery (three groups, reused by every track) ---------------
  record('find_trusted_sources:authority');
  const authority = await callTool(tools.findSources, { category: 'wire,mainstream', min_tscore: 0.6, limit: 20 });
  record('find_trusted_sources:industry');
  const industry = await callTool(tools.findSources, { category: 'market,tech', min_tscore: 0.5, limit: 20 });
  record('find_trusted_sources:supplement');
  const supplement = await callTool(tools.findSources, { min_tscore: 0.3, limit: 20 });

  const sourceIds = [...new Set(
    [...authority.sources, ...industry.sources, ...supplement.sources].map((s) => s.source_id),
  )].sort();
  const authorityIds = authority.sources.map((s) => s.source_id);

  // ---- Global trend + source aggregation ------------------------------------
  const trends = {};
  for (const track of TRACKS) {
    record('analyze_trend');
    trends[track] = await callTool(tools.trend, { q: `+(${TRACK_META[track].kw})`, days: 365, min_tscore: 0 });
  }

  record('aggregate_by_source');
  const aggregate = await callTool(tools.aggregate, { q: '+(机器人|AI|丝杠)', days: 365, limit: 200 });

  // ---- Per-track analysis ---------------------------------------------------
  const grades = { A: 0, B: 0, C: 0, D: 0 };
  for (const item of CORPUS) grades[ml.gradeOf(item)] += 1;

  const fit = ml.fitScore(USER_PROFILE.self);
  const trackResults = {};

  for (const track of TRACKS) {
    const meta = TRACK_META[track];
    const items = CORPUS.filter((i) => i.track === track);
    const kw = meta.kw;

    const dimensionQueries = [
      `+(${kw}) +(规模|market|CAGR|增长|出货|亿元)`,
      `+(${kw}) +(政策|补贴|标准|禁止|整治|policy|subsidy|ban)`,
      `+(${kw}) +(份额|CR4|集中度|玩家|龙头|排名|share)`,
      `+(${kw}) +(壁垒|良率|专利|认证|产能|交期|barrier|funding|融资)`,
      `+(${kw}) +(订单|客户|需求|价格战|降价|招标|demand)`,
    ];
    const scans = [];
    for (const q of dimensionQueries) {
      record('search_intelligence');
      scans.push(await callTool(tools.search, { q, source_ids: sourceIds, days: 365, limit: 50 }));
    }

    record('search_intelligence:authority-verify');
    const verify = await callTool(tools.search, {
      q: `+(${kw})`,
      source_ids: authorityIds,
      days: 365,
      min_tscore: 0.6,
      limit: 20,
    });

    const ma = ml.assessAttractiveness(items);
    const ce = ml.assessEntry(items);
    const wo = ml.assessWindow(items);
    const vetoes = ml.vetoGates(items);
    const confidence = ml.confidenceLevel(items);
    const score = ml.mei(ma.weighted_100, ce.weighted_100, wo.weighted_100, fit.value);
    const [band, reason] = ml.decisionBand(score, vetoes, confidence);
    const finalBand = ml.applyConfidenceCap(band, confidence);
    const shares = ml.extractShares(items);

    trackResults[track] = {
      meta,
      items,
      n: items.length,
      scans,
      verify,
      ma,
      ce,
      wo,
      vetoes,
      confidence,
      mei: score,
      band: finalBand,
      band_reason: reason,
      forces: ml.fiveForces(items),
      layers: ml.playerLayers(items),
      barriers: ml.barrierDimensions(items),
      shares,
      concentration: ml.concentration(shares),
      trend: trends[track],
    };
  }

  // ---- Render-path proof (a couple of tools' model-facing text) -------------
  const renders = {
    findSources: rendered(tools.findSources, { min_tscore: 0.6 }, authority),
    search: rendered(tools.search, { q: '+(丝杠) +(规模)' }, trackResults.screw.scans[0]),
    trend: rendered(tools.trend, { q: '+丝杠' }, trends.screw),
    semantic: rendered(tools.semantic, { q: 'x', cvc_model_id: 'cvc_humanoidtrack01' }, semantic),
  };

  return {
    user: USER_PROFILE,
    fit,
    sourceGroups: {
      authority: authority.count,
      industry: industry.count,
      supplement: supplement.count,
    },
    sourceIds,
    trends,
    aggregate,
    grades,
    tracks: trackResults,
    semantic,
    semanticVerified: verifiedClues,
    collectedCount: collected.count,
    renders,
    callLog,
    counts: Object.fromEntries(calls),
  };
}
