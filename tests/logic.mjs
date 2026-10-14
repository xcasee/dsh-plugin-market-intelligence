// -*- coding: utf-8 -*-
/**
 * Market methodology — a pure, auditable rules implementation of the
 * Market/Competition/Entry (MCE) model the skill documents.
 *
 *   evidence grade : T-Score + source tier → A/B/C/D
 *   MA 市场吸引力   : 规模/增长/政策/利润/需求（每分挂证据，无证据 = 0）
 *   CE 竞争可进入性 : 密度/价格战/壁垒可逾越/供方/买方（反向口径）
 *   WO 机会窗口     : 政策催化/资本阶段/供给稀缺/技术拐点
 *   FIT 自身契合    : 用户输入四轴
 *   MEI = .35·MA + .35·CE + .15·WO + .15·FIT；否决闸门优先；低置信封顶
 */

export function gradeOf(item) {
  const t = Number(item.tscore ?? 0);
  const tier = item.tier ?? 3;
  if (t >= 0.8 && tier <= 1) return 'A';
  if (t >= 0.6) return 'B';
  if (t >= 0.4) return 'C';
  return 'D';
}

export function abCoverage(items) {
  if (!items.length) return 0;
  return items.filter((i) => ['A', 'B'].includes(gradeOf(i))).length / items.length;
}

export function confidenceLevel(items) {
  const cov = abCoverage(items);
  if (cov >= 0.8) return '高';
  if (cov >= 0.5) return '中';
  return '低';
}

export const cite = (item) => `〔${gradeOf(item)}·${item.source_name}·${item.published_at.slice(0, 10)}〕`;

const hasTag = (item, ...tags) => tags.some((t) => item.tags.includes(t));
const ids = (items) => items.map((i) => i.news_id);
const independentSources = (items) => new Set(items.map((i) => i.source_id)).size;

// ---------------------------------------------------------------------------
// MA 市场吸引力（权重 22/23/20/15/20）
// ---------------------------------------------------------------------------
export const MA_WEIGHTS = { size: 0.22, growth: 0.23, policy: 0.2, margin: 0.15, demand: 0.2 };

function scoreSize(items) {
  const withFigure = items.filter((i) => hasTag(i, 'market_size') && hasTag(i, 'figure'));
  const independent = independentSources(withFigure);
  if (independent >= 2 && withFigure.length >= 2) return [5, ids(withFigure)];
  if (independent === 1 && withFigure.length) return [3, ids(withFigure)];
  const ms = items.filter((i) => i.tags.includes('market_size'));
  if (ms.length) return [2, ids(ms)];
  return [0, []];
}

function scoreGrowth(items) {
  const gr = items.filter((i) => hasTag(i, 'growth', 'cagr'));
  const figs = gr.filter((i) => i.tags.includes('figure'));
  const independent = independentSources(gr);
  if (independent >= 2 && figs.length) return [5, ids(gr)];
  if (independent >= 2) return [3, ids(gr)];
  if (independent === 1 && figs.length) return [3, ids(gr)];
  if (gr.length) return [2, ids(gr)];
  return [0, []];
}

function scorePolicy(items) {
  const red = items.filter((i) => hasTag(i, 'policy_redline', 'veto'));
  if (red.length) return [1, ids(red)];
  const green = items.filter((i) => i.tags.includes('green') || i.tags.includes('policy_support'));
  if (independentSources(green) >= 2) return [5, ids(green)];
  if (green.length) return [4, ids(green)];
  const yellow = items.filter((i) => i.tags.includes('yellow'));
  if (yellow.length) return [2, ids(yellow)];
  return [0, []];
}

function scoreMargin(items) {
  if (items.some((i) => i.tags.includes('price_war'))) {
    return [1, ids(items.filter((i) => hasTag(i, 'price_war', 'margin')))];
  }
  const margin = items.filter((i) => i.tags.includes('margin'));
  if (margin.length) return [4, ids(margin)];
  return [0, []];
}

function scoreDemand(items) {
  const strong = items.filter((i) => hasTag(i, 'order', 'unmet_need', 'scarcity'));
  const dem = items.filter((i) => i.tags.includes('demand'));
  if (strong.length >= 2 || (strong.length && dem.length >= 2)) return [5, ids([...strong, ...dem])];
  if (dem.length >= 2) return [4, ids(dem)];
  if (dem.length === 1) return [2, ids(dem)];
  return [0, []];
}

export function assessAttractiveness(items) {
  const fns = { size: scoreSize, growth: scoreGrowth, policy: scorePolicy, margin: scoreMargin, demand: scoreDemand };
  const scores = {};
  const evidence = {};
  for (const [key, fn] of Object.entries(fns)) {
    const [score, ev] = fn(items);
    scores[key] = score;
    evidence[key] = ev;
  }
  const weighted100 = Object.keys(MA_WEIGHTS).reduce(
    (sum, key) => sum + (scores[key] / 5) * MA_WEIGHTS[key],
    0,
  ) * 100;
  return { scores, evidence, weighted_100: Number(weighted100.toFixed(1)) };
}

// ---------------------------------------------------------------------------
// 否决闸门
// ---------------------------------------------------------------------------
export function vetoGates(items) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const tags = new Set(item.tags);
    let domain = null;
    if (tags.has('policy_redline') && tags.has('veto')) domain = '政策法律禁入';
    else if (tags.has('veto')) domain = '强制资质/合规否决';
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    out.push({ domain, news_id: item.news_id, title: item.title, cite: cite(item) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CE 竞争可进入性（高分 = 容易进入）
// ---------------------------------------------------------------------------
export const CE_WEIGHTS = { density: 0.25, price_war: 0.15, surmount: 0.25, supplier: 0.15, buyer: 0.2 };
export const BARRIER_TAGS = ['barrier_scale', 'barrier_capital', 'barrier_switching', 'barrier_channel', 'barrier_ip', 'barrier_cert'];
export const PLAYER_TAGS = ['rivalry', 'player_leader', 'player_challenger', 'player_niche', 'new_entrant', 'incumbent', 'funding'];

const scoreDensity = (items) => {
  const n = items.filter((i) => hasTag(i, ...PLAYER_TAGS)).length;
  if (n >= 9) return 1;
  if (n >= 6) return 2;
  if (n >= 4) return 3;
  if (n >= 2) return 4;
  if (n === 1) return 5;
  return 0;
};

const scorePriceWar = (items) => {
  if (items.some((i) => i.tags.includes('price_war'))) return 1;
  if (items.some((i) => i.tags.includes('margin'))) return 4;
  return 0;
};

const scoreSurmount = (items) => {
  const types = new Set();
  for (const i of items) for (const t of BARRIER_TAGS) if (i.tags.includes(t)) types.add(t);
  const n = types.size;
  if (n >= 5) return 1;
  if (n === 4) return 2;
  if (n === 3) return 3;
  if (n >= 1) return 4;
  return 5;
};

const scoreSupplier = (items) => {
  const n = items.filter((i) => i.tags.includes('supplier_power')).length;
  if (n >= 2) return 1;
  if (n === 1) return 2;
  if (items.some((i) => hasTag(i, 'unmet_need', 'scarcity')) && !n) return 4;
  return 0;
};

const scoreBuyer = (items) => {
  const n = items.filter((i) => i.tags.includes('buyer_power')).length;
  if (n >= 2) return 1;
  if (n === 1) return 2;
  if (items.some((i) => i.tags.includes('demand'))) return 4;
  return 0;
};

export function assessEntry(items) {
  const scores = {
    density: scoreDensity(items),
    price_war: scorePriceWar(items),
    surmount: scoreSurmount(items),
    supplier: scoreSupplier(items),
    buyer: scoreBuyer(items),
  };
  const evidence = {
    density: ids(items.filter((i) => hasTag(i, ...PLAYER_TAGS))),
    price_war: ids(items.filter((i) => hasTag(i, 'price_war', 'margin'))),
    surmount: ids(items.filter((i) => hasTag(i, ...BARRIER_TAGS))),
    supplier: ids(items.filter((i) => hasTag(i, 'supplier_power', 'unmet_need', 'scarcity'))),
    buyer: ids(items.filter((i) => hasTag(i, 'buyer_power', 'demand'))),
  };
  const weighted100 = Object.keys(CE_WEIGHTS).reduce(
    (sum, key) => sum + (scores[key] / 5) * CE_WEIGHTS[key],
    0,
  ) * 100;
  return { scores, evidence, weighted_100: Number(weighted100.toFixed(1)) };
}

export function barrierDimensions(items) {
  const names = {
    barrier_scale: '规模经济',
    barrier_capital: '资本需求',
    barrier_switching: '客户转换成本',
    barrier_channel: '渠道控制',
    barrier_ip: '技术与专利',
    barrier_cert: '政策资质与认证',
  };
  return Object.entries(names).map(([key, cn]) => {
    const hits = items.filter((i) => i.tags.includes(key));
    return {
      key,
      cn,
      strength: hits.length >= 2 ? '高' : hits.length ? '中' : '低',
      evidence: hits.slice(0, 3).map((i) => ({ news_id: i.news_id, cite: cite(i) })),
    };
  });
}

// ---------------------------------------------------------------------------
// 波特五力（威胁 1–5，越大越强；无证据 = 0）
// ---------------------------------------------------------------------------
export function fiveForces(items) {
  const rivalryHits = items.filter((i) => i.tags.includes('rivalry'));
  let rivalry = 0;
  if (items.some((i) => i.tags.includes('price_war'))) rivalry = 5;
  else if (rivalryHits.length >= 3) rivalry = 4;
  else if (rivalryHits.length) rivalry = 3;

  const entrantN = items.filter((i) => hasTag(i, 'funding', 'new_entrant')).length;
  const entrant = entrantN >= 5 ? 5 : entrantN >= 3 ? 4 : entrantN >= 1 ? 3 : 0;
  const substitution = items.some((i) => i.tags.includes('substitution')) ? 3 : 0;
  const supN = items.filter((i) => i.tags.includes('supplier_power')).length;
  const supplier = supN >= 2 ? 4 : supN === 1 ? 3 : 0;
  const buyN = items.filter((i) => i.tags.includes('buyer_power')).length;
  const buyer = buyN >= 2 ? 4 : buyN === 1 ? 3 : 0;
  return { rivalry, entrant, substitution, supplier, buyer };
}

// ---------------------------------------------------------------------------
// 玩家分层
// ---------------------------------------------------------------------------
const LAYER_DEF = [
  ['leader', '领导者', ['player_leader']],
  ['challenger', '挑战者', ['player_challenger']],
  ['niche', '补缺/转型者', ['player_niche']],
  ['entrant', '潜在进入者', ['new_entrant']],
];

export function playerLayers(items) {
  const out = {};
  for (const [key, cn, tags] of LAYER_DEF) {
    const hits = items.filter((i) => hasTag(i, ...tags));
    out[key] = {
      cn,
      items: hits.slice(0, 4).map((i) => ({ news_id: i.news_id, title: i.title, cite: cite(i) })),
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// 份额抽取 / CR4 / HHI（口径纪律：只用情报文本明示的份额）
// ---------------------------------------------------------------------------
const SHARE_RE = /([\u4e00-\u9fffA-Za-z][\u4e00-\u9fffA-Za-z0-9 ·]{1,13}?)份额约\s*(\d{1,2}(?:\.\d+)?)\s*%/g;
const OVERSEAS_RE = /(海外[\u4e00-\u9fffA-Za-z0-9 ·]{0,10})仍占约\s*(\d{1,2}(?:\.\d+)?)\s*%/g;

export function extractShares(items) {
  const shares = [];
  for (const item of items) {
    if (!item.tags.includes('share')) continue;
    for (const m of item.summary.matchAll(SHARE_RE)) {
      shares.push({ player: m[1].trim().replace(/[，,]/g, ''), share: Number(m[2]), news_id: item.news_id, cite: cite(item) });
    }
    for (const m of item.summary.matchAll(OVERSEAS_RE)) {
      shares.push({ player: `${m[1].trim()}（聚合）`, share: Number(m[2]), news_id: item.news_id, cite: cite(item), aggregate: true });
    }
  }
  return shares;
}

export function concentration(shares) {
  const named = shares.filter((s) => !s.aggregate);
  if (!named.length) {
    return { status: 'missing', note: '公开情报未披露玩家份额，CR4/HHI 待行研/官方补充' };
  }
  const values = named.map((s) => s.share).sort((a, b) => b - a);
  const cr4 = Number(values.slice(0, 4).reduce((a, b) => a + b, 0).toFixed(1));
  const hhi = Math.round(values.reduce((sum, v) => sum + v * v, 0));
  const covered = Number(values.reduce((a, b) => a + b, 0).toFixed(1));
  const stage = cr4 < 40 ? '分散竞争' : cr4 < 60 ? '中度集中' : '寡头/高度集中';
  return {
    status: 'ok',
    cr4,
    hhi,
    covered,
    stage,
    players: named,
    note: `基于公开披露的 ${named.length} 个玩家（合计 ${covered}%），为下限口径，非完整市场统计`,
  };
}

// ---------------------------------------------------------------------------
// WO 机会窗口
// ---------------------------------------------------------------------------
export function assessWindow(items) {
  const red = items.filter((i) => hasTag(i, 'policy_redline', 'veto'));
  const cat = items.filter((i) => hasTag(i, 'catalyst', 'standard', 'subsidy', 'policy_support'));
  const catalyst = red.length ? 1 : cat.length >= 2 ? 5 : cat.length ? 3 : 0;

  const funding = items.filter((i) => i.tags.includes('funding'));
  const overheat = items.filter((i) => i.tags.includes('overheat'));
  let capital = 0;
  if (overheat.length || funding.length >= 6) capital = 1;
  else if (funding.length >= 3) capital = 3;
  else if (funding.length >= 1) capital = 5;

  const scarcity = items.filter((i) => i.tags.includes('scarcity'));
  const scarcityScore = scarcity.length ? 5 : 0;
  const inflection = items.filter((i) => hasTag(i, 'standard', 'catalyst'));
  const inflectionScore = inflection.length ? 4 : 0;

  const scores = { catalyst, capital, scarcity: scarcityScore, inflection: inflectionScore };
  const evidence = {
    catalyst: ids(red.length ? red : cat),
    capital: ids(funding),
    scarcity: ids(scarcity),
    inflection: ids(inflection),
  };
  const weighted100 = (Object.values(scores).reduce((a, b) => a + b, 0) / 4 / 5) * 100;
  return { scores, evidence, weighted_100: Number(weighted100.toFixed(1)) };
}

// ---------------------------------------------------------------------------
// FIT + MEI + 决策
// ---------------------------------------------------------------------------
export function fitScore(selfScores) {
  const axes = {};
  for (const key of ['tech', 'capital', 'channel', 'customer']) {
    axes[key] = Math.max(0, Math.min(5, Number(selfScores[key] ?? 0)));
  }
  const value = (Object.values(axes).reduce((a, b) => a + b, 0) / 4 / 5) * 100;
  return { value: Number(value.toFixed(1)), axes };
}

export const mei = (ma, ce, wo, fit) => Number((ma * 0.35 + ce * 0.35 + wo * 0.15 + fit * 0.15).toFixed(1));

export function decisionBand(score, vetoes, confidence) {
  if (vetoes.length) return ['No-Go', `触发否决闸门（${vetoes[0].domain}），不做加权`];
  if (score >= 75 && confidence !== '低') return ['Go', '赛道进入指数≥75：批准受控进入，锁定预算、负责人与止损线'];
  if (score >= 60) return ['Niche Go', '以细分场景/核心零部件/链主配套方式切入，先验证后加码'];
  if (score >= 45) return ['Watch', '进入观察名单，定义重评触发器'];
  return ['No-Go', '赛道进入指数低于 45，暂停并保留依据'];
}

export function applyConfidenceCap(band, confidence) {
  return confidence === '低' && band === 'Go' ? 'Niche Go' : band;
}
