// -*- coding: utf-8 -*-
/**
 * Report builder — turns the pipeline result into the two deliverables the
 * skill mandates: a Markdown summary and a single-file CaSee dark-dashboard
 * HTML report. The CSS, skeleton and ECharts recipes follow
 * `assets/skills/market-intelligence/analysis/report_style.md`.
 */
import { CORPUS } from './fixtures.mjs';
import { gradeOf } from './logic.mjs';

const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const tagClass = (tscore) => (tscore >= 0.8 ? 't-hi' : tscore >= 0.6 ? 't-mid' : 't-low');
const badge = (tscore) => `<span class="tag ${tagClass(tscore)}">T ${Number(tscore).toFixed(2)}</span>`;
const citeText = (item) => `〔${gradeOf(item)}·${item.source_name}·${item.published_at.slice(0, 10)}〕`;
const BAND_CLASS = { Go: 't-hi', 'Niche Go': 't-mid', Watch: 't-mid', 'No-Go': 't-low' };

/** Aggregate the corpus-level cover metrics. */
function headline(result) {
  const total = CORPUS.length;
  const high = CORPUS.filter((i) => ['A', 'B'].includes(gradeOf(i))).length;
  const avg = CORPUS.reduce((sum, i) => sum + i.tscore, 0) / total;
  const sources = new Set(CORPUS.map((i) => i.source_id)).size;
  return {
    total,
    high,
    highPct: `${((high / total) * 100).toFixed(0)}%`,
    avg: avg.toFixed(2),
    sources,
    range: {
      start: CORPUS.map((i) => i.published_at.slice(0, 10)).sort()[0],
      end: CORPUS.map((i) => i.published_at.slice(0, 10)).sort().at(-1),
    },
  };
}

/** Bucketed series for the trend chart (bar counts + a moving-average line). */
function trendSeries(trend) {
  const labels = trend.trend.map((p) => p.date);
  const counts = trend.trend.map((p) => p.count);
  const window = trend.granularity === 'month' ? 3 : 7;
  const ma = counts.map((_, index) => {
    const from = Math.max(0, index - window + 1);
    const slice = counts.slice(from, index + 1);
    return Number((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2));
  });
  return { labels, counts, ma, window, granularity: trend.granularity };
}

const SECTIONS = [
  ['00', '结论先行'],
  ['01', '市场定义与口径'],
  ['02', '规模与增长'],
  ['03', 'PESTEL 宏观环境'],
  ['04', '需求与客户信号'],
  ['05', '竞争格局'],
  ['06', '集中度'],
  ['07', '波特五力'],
  ['08', '进入壁垒'],
  ['09', '趋势与催化'],
  ['10', '信源画像'],
  ['11', '机会窗口与建议'],
  ['12', '风险与盲区'],
];

/** Build the Markdown summary deliverable. */
export function buildMarkdown(result) {
  const head = headline(result);
  const lines = [];
  lines.push('# 市场情报分析报告：人形机器人相关三条赛道进入评估');
  lines.push('');
  lines.push(`> 一句话结论：行星滚柱丝杠赛道进入指数最高（${result.tracks.screw.mei}）判定 **${result.tracks.screw.band}**；人形机器人整机判定 **${result.tracks.humanoid.band}**；校园情绪识别触发政策否决闸门，判定 **${result.tracks.emotion.band}**。`);
  lines.push('');
  lines.push(`样本量 N=${head.total} 条（${head.range.start} — ${head.range.end}），活跃信源 ${head.sources} 个，高可信（A/B）占比 ${head.highPct}，平均 T-Score ${head.avg}。`);
  lines.push('');
  lines.push('## 关键发现');
  lines.push('');
  for (const track of ['screw', 'humanoid', 'emotion']) {
    const t = result.tracks[track];
    lines.push(`### ${t.meta.cn}（${t.band}）`);
    lines.push(`- 进入指数 MEI=${t.mei}（市场吸引力 ${t.ma.weighted_100} / 竞争可进入性 ${t.ce.weighted_100} / 机会窗口 ${t.wo.weighted_100} / 自身契合 ${result.fit.value}），置信度 ${t.confidence}。`);
    for (const item of [...t.items].sort((a, b) => b.tscore - a.tscore).slice(0, 3)) {
      lines.push(`- [${gradeOf(item)}] ${item.title} ${citeText(item)} ${item.url}`);
    }
    if (t.vetoes.length) lines.push(`- ⛔ 否决闸门：${t.vetoes[0].domain}（${t.vetoes[0].title}）`);
    lines.push('');
  }
  lines.push('## 图表结论（文字化）');
  lines.push(`- 声量趋势：${result.tracks.screw.meta.cn}峰值出现在 ${result.tracks.screw.trend.summary.peak_date}（${result.tracks.screw.trend.summary.peak_count} 条）。`);
  lines.push(`- 信源分布：Top 信源 ${result.aggregate.sources[0]?.name}（${result.aggregate.sources[0]?.count} 条，均值 T ${result.aggregate.sources[0]?.avg_tscore}）。`);
  lines.push(`- 证据等级：A ${result.grades.A} / B ${result.grades.B} / C ${result.grades.C} / D ${result.grades.D}。`);
  lines.push('');
  lines.push(`> 完整报告（CaSee 深色看板 + ECharts）见 market-track-landscape-report.html。`);
  lines.push('> 关键业务决策请在本平台数据之外独立验证。');
  return lines.join('\n');
}

/** Build the single-file HTML report deliverable. */
export function buildHtml(result) {
  const head = headline(result);
  const sources = CORPUS.slice().sort((a, b) => b.tscore - a.tscore);
  const screw = result.tracks.screw;
  const humanoid = result.tracks.humanoid;
  const emotion = result.tracks.emotion;
  const trend = trendSeries(screw.trend);
  const topSources = result.aggregate.sources.slice(0, 10);
  const radarAxes = ['现有竞争', '新进入者', '替代品', '供方议价', '买方议价'];
  const radarKeys = ['rivalry', 'entrant', 'substitution', 'supplier', 'buyer'];

  const toc = SECTIONS.map(([no, title]) => `<li><a href="#sec-${no}">${no} ${esc(title)}</a></li>`).join('');

  const decisionRows = ['screw', 'humanoid', 'emotion']
    .map((key) => {
      const t = result.tracks[key];
      return `<tr><td>${esc(t.meta.cn)}</td><td>${t.ma.weighted_100}</td><td>${t.ce.weighted_100}</td><td>${t.wo.weighted_100}</td><td><b>${t.mei}</b></td><td>${esc(t.confidence)}</td><td><span class="tag ${BAND_CLASS[t.band]}">${t.band}</span></td></tr>`;
    })
    .join('');

  const gradeRows = screw.items
    .slice()
    .sort((a, b) => b.tscore - a.tscore)
    .slice(0, 6)
    .map((i) => `<tr><td>${esc(i.title)}</td><td>${esc(i.source_name)}</td><td>${i.published_at.slice(0, 10)}</td><td>${badge(i.tscore)}</td><td>${gradeOf(i)}</td></tr>`)
    .join('');

  const sourceRows = topSources
    .map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.source_id)}</td><td>${s.count}</td><td>${badge(s.avg_tscore)}</td><td>${esc(s.sample_titles[0] ?? '')}</td></tr>`)
    .join('');

  const barrierRows = screw.barriers
    .map((b) => `<tr><td>${esc(b.cn)}</td><td>${esc(b.strength)}</td><td>${b.evidence.map((e) => esc(e.cite)).join(' ') || '⬜'}</td></tr>`)
    .join('');

  const layerRows = Object.values(screw.layers)
    .map((layer) => `<tr><td>${esc(layer.cn)}</td><td>${layer.items.map((i) => esc(i.title)).join('<br/>') || '⬜'}</td></tr>`)
    .join('');

  const forceRows = ['screw', 'humanoid', 'emotion']
    .map((key) => {
      const f = result.tracks[key].forces;
      return `<tr><td>${esc(result.tracks[key].meta.cn)}</td><td>${f.rivalry}</td><td>${f.entrant}</td><td>${f.substitution}</td><td>${f.supplier}</td><td>${f.buyer}</td></tr>`;
    })
    .join('');

  const vetoBlock = emotion.vetoes.length
    ? `<div class="keybox"><h3>⛔ 否决闸门（优先于加权）</h3><p>${esc(emotion.vetoes[0].domain)}：${esc(emotion.vetoes[0].title)} ${esc(emotion.vetoes[0].cite)}。存在该闸门时不做加权评分，直接 No-Go。</p></div>`
    : '';

  const sourceList = sources
    .map((i) => `<li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a> 〔${esc(i.source_name)}〕${i.published_at.slice(0, 10)} <span class="tag ${tagClass(i.tscore)}">T ${i.tscore.toFixed(2)} · ${gradeOf(i)}</span></li>`)
    .join('');

  const trendData = JSON.stringify({ labels: trend.labels, counts: trend.counts, ma: trend.ma, window: trend.window });
  const sourceData = JSON.stringify({ names: topSources.map((s) => s.name), counts: topSources.map((s) => s.count) });
  const gradeData = JSON.stringify([result.grades.A, result.grades.B, result.grades.C, result.grades.D]);
  const radarData = JSON.stringify(
    ['screw', 'humanoid', 'emotion'].map((key) => ({
      name: result.tracks[key].meta.cn,
      value: radarKeys.map((k) => result.tracks[key].forces[k]),
    })),
  );

  return `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>市场情报分析报告：人形机器人相关三条赛道 · CaSee 凯见</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
<style>
:root{--bg:#0a0a0a;--panel:#121212;--panel-2:#171717;--line:#242424;--line-2:#2e2e2e;--fg:#e8e8e8;--fg-2:#b4b4b4;--fg-3:#7c7c7c;--blue:#5b8def;--blue-2:#7aa5f5;--blue-dim:#1e2a44;--hi:#22c55e;--mid:#f59e0b;--low:#ef4444;--radius:12px;--radius-sm:8px;--maxw:1080px}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 "Noto Sans SC",system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--blue);text-decoration:none}a:hover{color:var(--blue-2)}
.appbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(10,10,10,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.brand{font-weight:700;letter-spacing:.5px}.brand span{color:var(--blue);margin-left:4px}
.cta{padding:8px 16px;border:1px solid var(--blue);border-radius:999px;font-size:13px;background:var(--blue-dim)}
.cover{max-width:var(--maxw);margin:0 auto;padding:64px 24px 32px}
.kicker{display:inline-block;font-size:12px;color:var(--fg-3);border:1px solid var(--line-2);border-radius:999px;padding:4px 12px;margin-bottom:20px}
.cover h1{font-size:clamp(28px,4vw,44px);line-height:1.25;margin:0 0 16px;background:linear-gradient(92deg,#fff 20%,var(--blue) 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
.cover-abstract{color:var(--fg-2);max-width:760px;margin:0 0 28px}
.cover-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.ccard{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:16px}
.ccard-k{display:block;font-size:12px;color:var(--fg-3);margin-bottom:6px}.ccard-v{font-size:24px;font-weight:700}
.cover-meta{font-size:12px;color:var(--fg-3)}
.toc{position:sticky;top:57px;z-index:40;max-width:var(--maxw);margin:0 auto;padding:10px 24px;background:rgba(10,10,10,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);overflow-x:auto}
.toc ol{display:flex;gap:16px;list-style:none;margin:0;padding:0;white-space:nowrap}
.toc a{font-size:13px;color:var(--fg-3)}.toc a.active{color:var(--blue);font-weight:600}
main{max-width:var(--maxw);margin:0 auto;padding:24px}
.sec{padding:40px 0;border-bottom:1px solid var(--line)}.sec.alt{background:linear-gradient(180deg,rgba(255,255,255,.012),transparent)}
.sec-head{display:flex;align-items:baseline;gap:14px;margin-bottom:8px}
.sec-no{font-size:13px;color:var(--blue);font-variant-numeric:tabular-nums;letter-spacing:1px}
.sec-head h2{font-size:22px;margin:0}.sec-lead{color:var(--fg-3);font-size:13px;margin:0 0 22px}
.sec-cta{display:inline-block;margin-top:14px;font-size:13px;color:var(--blue)}
h3.blk{font-size:16px;margin:26px 0 10px;padding-left:10px;border-left:3px solid var(--blue)}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}
.metric{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px}
.metric .k{font-size:12px;color:var(--fg-3)}.metric .v{font-size:22px;font-weight:700;margin-top:4px}.metric .d{font-size:12px;color:var(--fg-3);margin-top:4px}
.keybox{background:var(--blue-dim);border:1px solid #2a3d63;border-radius:var(--radius);padding:18px 20px;margin:18px 0}
.keybox h3{margin:0 0 8px;font-size:14px;color:var(--blue-2)}.keybox p{margin:0;color:var(--fg)}
.tbl-wrap{overflow-x:auto;margin:16px 0}
table.tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:560px}
table.tbl th,table.tbl td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}
table.tbl th{color:var(--fg-3);font-weight:600;background:var(--panel-2)}
table.tbl tr:hover td{background:rgba(255,255,255,.02)}
.tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-variant-numeric:tabular-nums}
.t-hi{color:var(--hi);border:1px solid rgba(34,197,94,.4);background:rgba(34,197,94,.08)}
.t-mid{color:var(--mid);border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.08)}
.t-low{color:var(--low);border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08)}
.chart{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:12px;margin:16px 0}
.chart .chart-cap{font-size:12px;color:var(--fg-3);margin:0 0 8px}.chart .canvas{width:100%;height:340px}
.swot{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.swot>div{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px}
.swot h4{margin:0 0 8px;font-size:13px;color:var(--blue-2)}.swot ul{margin:0;padding-left:18px;color:var(--fg-2);font-size:13px}
.tl{position:relative;margin:16px 0 16px 8px;padding-left:22px;border-left:1px solid var(--line-2);list-style:none}
.tl li{position:relative;padding:0 0 16px}.tl li::before{content:"";position:absolute;left:-28px;top:6px;width:10px;height:10px;border-radius:50%;background:var(--blue)}
.tl .tl-d{font-size:12px;color:var(--fg-3)}
.matrix2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.matrix2>div{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;min-height:96px}
.footer{max-width:var(--maxw);margin:0 auto;padding:40px 24px 64px}
.src-list{color:var(--fg-2);font-size:13px;line-height:1.9}
.fnote{font-size:12px;color:var(--fg-3);margin-top:16px}.powered{font-size:12px;color:var(--fg-3);margin-top:8px}
@media(max-width:720px){.cover-cards{grid-template-columns:repeat(2,1fr)}.swot,.matrix2{grid-template-columns:1fr}}
</style>
</head><body>
<header class="appbar">
  <div class="brand">CaSee<span>凯见</span></div>
  <a class="cta" href="https://casee.me" target="_blank" rel="noopener">登录 CaSee 凯见 →</a>
</header>

<section class="cover">
  <a class="kicker" href="https://casee.me" target="_blank" rel="noopener">CaSee 情报平台 · 市场情报分析</a>
  <h1>人形机器人相关三条赛道：市场格局与进入机会评估</h1>
  <p class="cover-abstract">基于 CaSee 情报平台可信信源，对行星滚柱丝杠、人形机器人整机、校园情绪识别 AI 三条赛道做规模、政策、竞争结构、需求与机会窗口的综合评估。样本量 N=${head.total} 条，窗口 ${head.range.start} — ${head.range.end}，含 A/B 级证据占比 ${head.highPct}。</p>
  <div class="cover-cards">
    <div class="ccard"><span class="ccard-k">情报总量</span><b class="ccard-v">${head.total}</b></div>
    <div class="ccard"><span class="ccard-k">高可信占比</span><b class="ccard-v">${head.highPct}</b></div>
    <div class="ccard"><span class="ccard-k">平均 T-Score</span><b class="ccard-v">${head.avg}</b></div>
    <div class="ccard"><span class="ccard-k">活跃信源数</span><b class="ccard-v">${head.sources}</b></div>
  </div>
  <div class="cover-meta">报告时点 ${head.range.end} · 分析模型 DeepSeek Harness · 数据来源 CaSee 情报平台（仿真语料）</div>
</section>

<nav class="toc"><ol>${toc}</ol></nav>

<main>
  <section id="sec-00" class="sec">
    <div class="sec-head"><span class="sec-no">00</span><h2>结论先行</h2></div>
    <p class="sec-lead">口径：N=${head.total} 条情报，窗口 ${head.range.start} — ${head.range.end}；置信度按 A/B 证据覆盖率判定；存在否决闸门时不做加权。</p>
    <div class="metrics">
      <div class="metric"><div class="k">最高进入指数</div><div class="v">${screw.mei}</div><div class="d">${esc(screw.meta.cn)}</div></div>
      <div class="metric"><div class="k">结论</div><div class="v"><span class="tag ${BAND_CLASS[screw.band]}">${screw.band}</span></div><div class="d">置信度 ${esc(screw.confidence)}</div></div>
      <div class="metric"><div class="k">否决赛道</div><div class="v"><span class="tag ${BAND_CLASS['No-Go']}">No-Go</span></div><div class="d">${esc(emotion.meta.cn)}</div></div>
      <div class="metric"><div class="k">自身契合度</div><div class="v">${result.fit.value}</div><div class="d">技术 ${result.fit.axes.tech}/资本 ${result.fit.axes.capital}/渠道 ${result.fit.axes.channel}/客户 ${result.fit.axes.customer}</div></div>
    </div>
    <div class="keybox"><h3>核心判断（三句话）</h3>
      <p>1）行星滚柱丝杠处于「政策支持 + 供给稀缺 + 高壁垒」的黄金窗口，MEI=${screw.mei}，建议 ${screw.band}；2）人形机器人整机资本过热、价格战苗头出现且商业化未跑通，MEI=${humanoid.mei}，建议 ${humanoid.band}；3）校园情绪识别触发政策红线否决闸门，直接 No-Go。</p>
    </div>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>赛道</th><th>市场吸引力</th><th>竞争可进入性</th><th>机会窗口</th><th>进入指数</th><th>置信度</th><th>结论</th></tr></thead>
      <tbody>${decisionRows}</tbody></table></div>
    <p class="sec-cta">→ 详见 <a href="#sec-11">11 机会窗口与建议</a></p>
  </section>

  <section id="sec-01" class="sec alt">
    <div class="sec-head"><span class="sec-no">01</span><h2>市场定义与口径</h2></div>
    <p class="sec-lead">样本量 N=${head.total}；检索词为各赛道同义词组 + 维度词；来源为 CaSee 情报平台 ${head.sources} 个活跃信源。</p>
    <h3 class="blk">品类边界</h3>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>赛道</th><th>定义</th><th>检索关键词</th></tr></thead><tbody>
      ${['screw', 'humanoid', 'emotion'].map((k) => `<tr><td>${esc(result.tracks[k].meta.cn)}</td><td>${k === 'screw' ? '人形机器人核心传动零部件' : k === 'humanoid' ? '人形机器人整机与具身智能' : '教育场景情绪识别 AI'}</td><td><code>${esc(result.tracks[k].meta.kw)}</code></td></tr>`).join('')}
    </tbody></table></div>
  </section>

  <section id="sec-02" class="sec">
    <div class="sec-head"><span class="sec-no">02</span><h2>规模与增长</h2></div>
    <p class="sec-lead">口径：市场规模数字须 ≥2 个独立信源才计入 5 分；以下为规模维度得分与关键证据。</p>
    <h3 class="blk">规模维度评分</h3>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>赛道</th><th>规模</th><th>增长</th><th>政策</th><th>利润</th><th>需求</th></tr></thead><tbody>
      ${['screw', 'humanoid', 'emotion'].map((k) => { const t = result.tracks[k]; return `<tr><td>${esc(t.meta.cn)}</td><td>${t.ma.scores.size}/5</td><td>${t.ma.scores.growth}/5</td><td>${t.ma.scores.policy}/5</td><td>${t.ma.scores.margin}/5</td><td>${t.ma.scores.demand}/5</td></tr>`; }).join('')}
    </tbody></table></div>
    <h3 class="blk">关键证据（${esc(screw.meta.cn)}）</h3>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>标题</th><th>信源</th><th>日期</th><th>T-Score</th><th>等级</th></tr></thead><tbody>${gradeRows}</tbody></table></div>
    <div class="keybox"><h3>本章结论</h3><p>行星滚柱丝杠规模与增速均有 ≥2 个独立信源支撑，规模维度评为 ${screw.ma.scores.size}/5；情绪识别赛道因政策红线，政策维度仅 ${emotion.ma.scores.policy}/5。</p></div>
  </section>

  <section id="sec-03" class="sec alt">
    <div class="sec-head"><span class="sec-no">03</span><h2>PESTEL 宏观环境</h2></div>
    <p class="sec-lead">口径：以 ${esc(screw.meta.cn)} 为主视角，逐维列出情报证据。</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>维度</th><th>结论</th><th>证据</th></tr></thead><tbody>
      <tr><td>Political 政策</td><td>支持</td><td>工信部指导意见明确核心零部件攻关与首台套补贴 </td></tr>
      <tr><td>Economic 经济</td><td>增长</td><td>市场规模 26–30 亿元、未来三年 CAGR 约 40%</td></tr>
      <tr><td>Social 社会</td><td>需求升温</td><td>整机厂开放二供认证，国产替代订单放量</td></tr>
      <tr><td>Technological 技术</td><td>收敛中</td><td>国标立项，精度分级与寿命检测方法统一</td></tr>
      <tr><td>Environmental 环境</td><td>⬜</td><td>本轮检索未取到该维度证据</td></tr>
      <tr><td>Legal 法律</td><td>中性偏正</td><td>标准体系进入收敛期，利好工艺积累厂商</td></tr>
    </tbody></table></div>
  </section>

  <section id="sec-04" class="sec">
    <div class="sec-head"><span class="sec-no">04</span><h2>需求与客户信号</h2></div>
    <p class="sec-lead">口径：需求维度以订单/未满足需求/供给紧张的硬证据计分。</p>
    <div class="metrics">
      <div class="metric"><div class="k">需求维度得分</div><div class="v">${screw.ma.scores.demand}/5</div><div class="d">${esc(screw.meta.cn)}</div></div>
      <div class="metric"><div class="k">买方议价威胁</div><div class="v">${screw.forces.buyer}</div><div class="d">1–5，越大越强</div></div>
      <div class="metric"><div class="k">供方议价威胁</div><div class="v">${screw.forces.supplier}</div><div class="d">1–5，越大越强</div></div>
    </div>
    <div class="keybox"><h3>本章结论</h3><p>下游整机厂虽处强势地位，但高精度丝杠供给紧张、交期超 6 个月，需求端呈现「供不应求」特征，需求维度评为 ${screw.ma.scores.demand}/5。</p></div>
  </section>

  <section id="sec-05" class="sec alt">
    <div class="sec-head"><span class="sec-no">05</span><h2>竞争格局</h2></div>
    <p class="sec-lead">口径：玩家按情报证据分层，仅收录有明确报道的厂商。</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>层级</th><th>玩家与证据</th></tr></thead><tbody>${layerRows}</tbody></table></div>
  </section>

  <section id="sec-06" class="sec">
    <div class="sec-head"><span class="sec-no">06</span><h2>集中度</h2></div>
    <p class="sec-lead">口径：仅用情报文本明示的份额计算 CR4/HHI，报道口径不代表出货统计。</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>赛道</th><th>CR4</th><th>HHI</th><th>披露覆盖</th><th>阶段</th></tr></thead><tbody>
      ${['screw', 'humanoid', 'emotion'].map((k) => { const c = result.tracks[k].concentration; return c.status === 'ok' ? `<tr><td>${esc(result.tracks[k].meta.cn)}</td><td>${c.cr4}%</td><td>${c.hhi}</td><td>${c.covered}%</td><td>${esc(c.stage)}</td></tr>` : `<tr><td>${esc(result.tracks[k].meta.cn)}</td><td colspan="4">${esc(c.note)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="fnote">${esc(screw.concentration.note ?? '')}</p>
  </section>

  <section id="sec-07" class="sec alt">
    <div class="sec-head"><span class="sec-no">07</span><h2>波特五力</h2></div>
    <p class="sec-lead">口径：威胁 1–5，越大越强；无证据记 0。</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>赛道</th><th>现有竞争</th><th>新进入者</th><th>替代品</th><th>供方议价</th><th>买方议价</th></tr></thead><tbody>${forceRows}</tbody></table></div>
    <div class="chart"><p class="chart-cap">图 1 · 三赛道波特五力对比（威胁 1–5，无证据=0）</p><div id="chart-radar" class="canvas"></div></div>
  </section>

  <section id="sec-08" class="sec">
    <div class="sec-head"><span class="sec-no">08</span><h2>进入壁垒</h2></div>
    <p class="sec-lead">口径：按壁垒维度统计证据强度（高/中/低）。</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>壁垒维度</th><th>强度</th><th>证据</th></tr></thead><tbody>${barrierRows}</tbody></table></div>
    <div class="keybox"><h3>本章结论</h3><p>${esc(screw.meta.cn)}壁垒集中在技术与专利、政策资质与认证、资本需求三类，可逾越性低，但也构成先发者的护城河。</p></div>
  </section>

  <section id="sec-09" class="sec alt">
    <div class="sec-head"><span class="sec-no">09</span><h2>趋势与催化</h2></div>
    <p class="sec-lead">口径：${esc(screw.meta.cn)}，窗口 365 天，按${trend.granularity === 'month' ? '月' : '日'}聚合。</p>
    <div class="chart"><p class="chart-cap">图 2 · 「${esc(screw.meta.kw)}」情报声量趋势，窗口 365 天（柱=${trend.granularity === 'month' ? '月' : '日'}声量，线=${trend.window} 期移动平均）</p><div id="chart-trend" class="canvas"></div></div>
    <ul class="tl">
      <li><div class="tl-d">2026-02 · 标准立项</div>行星滚柱丝杠国家标准立项，技术体系进入收敛期</li>
      <li><div class="tl-d">2026-03 · 政策催化</div>工信部指导意见发布，核心零部件攻关获首台套补贴</li>
      <li><div class="tl-d">2026-09 · 供给紧张</div>高精度丝杠交期超 6 个月，二供导入加速</li>
    </ul>
  </section>

  <section id="sec-10" class="sec">
    <div class="sec-head"><span class="sec-no">10</span><h2>信源画像</h2></div>
    <p class="sec-lead">口径：窗口 365 天，按信源统计报道量与平均可信度。</p>
    <div class="chart"><p class="chart-cap">图 3 · 信源报道量 Top10（窗口 365 天，单位：条）</p><div id="chart-source" class="canvas"></div></div>
    <div class="chart"><p class="chart-cap">图 4 · 证据等级构成（A/B/C/D 条数，N=${head.total}）</p><div id="chart-grade" class="canvas" style="height:300px"></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>信源</th><th>source_id</th><th>条数</th><th>平均可信度</th><th>样例标题</th></tr></thead><tbody>${sourceRows}</tbody></table></div>
  </section>

  <section id="sec-11" class="sec alt">
    <div class="sec-head"><span class="sec-no">11</span><h2>机会窗口与建议</h2></div>
    <p class="sec-lead">口径：机会窗口四维（政策催化/资本阶段/供给稀缺/技术拐点），满分 5。</p>
    ${vetoBlock}
    <div class="metrics">
      <div class="metric"><div class="k">${esc(screw.meta.cn)} 机会窗口</div><div class="v">${screw.wo.weighted_100}</div><div class="d">${esc(screw.band)}</div></div>
      <div class="metric"><div class="k">${esc(humanoid.meta.cn)} 机会窗口</div><div class="v">${humanoid.wo.weighted_100}</div><div class="d">${esc(humanoid.band)}</div></div>
      <div class="metric"><div class="k">${esc(emotion.meta.cn)} 机会窗口</div><div class="v">${emotion.wo.weighted_100}</div><div class="d">${esc(emotion.band)}</div></div>
    </div>
    <div class="keybox"><h3>本章结论</h3><p>建议优先级：${esc(screw.meta.cn)}（${screw.band}）＞ ${esc(humanoid.meta.cn)}（${humanoid.band}）＞ ${esc(emotion.meta.cn)}（${emotion.band}，否决）。进入 ${esc(screw.meta.cn)} 应锁定细分规格与首批客户，设置止损线并定义重评触发器。</p></div>
    <p class="sec-cta">关键业务决策请在本平台数据之外独立验证 → <a href="https://casee.me" target="_blank" rel="noopener">CaSee 凯见</a></p>
  </section>

  <section id="sec-12" class="sec">
    <div class="sec-head"><span class="sec-no">12</span><h2>风险与盲区</h2></div>
    <p class="sec-lead">口径：显式列出证据不足或口径风险项，避免以偏概全。</p>
    <div class="swot">
      <div><h4>证据盲区</h4><ul><li>Environmental 维度本轮未取到证据（⬜）</li><li>份额数据为报道口径，非出货统计</li><li>情绪识别为 UGC 线索为主，勿作事实</li></ul></div>
      <div><h4>口径风险</h4><ul><li>规模数字来源多为行研估算</li><li>整机意向订单非实际交付</li><li>语义检索命中仅作线索</li></ul></div>
      <div><h4>建议独立验证</h4><ul><li>丝杠毛利率与良率数据</li><li>整机真实出货与收入确认</li><li>政策落地细则与执法尺度</li></ul></div>
      <div><h4>重评触发器</h4><ul><li>丝杠出现价格战 → 下调利润维度</li><li>整机规模订单落地 → 上调需求维度</li><li>政策红线调整 → 重评情绪识别</li></ul></div>
    </div>
  </section>
</main>

<footer id="sources" class="footer">
  <h2>来源附录</h2>
  <ol class="src-list">${sourceList}</ol>
  <p class="fnote">口径说明：本报告为方法学仿真，语料为虚构数据，仅用于验证分析流程与报告结构；份额数字为报道口径，非出货统计；关键业务决策请独立验证。</p>
  <p class="powered">Powered by CaSee 情报平台 · 500+ 可信情报信源</p>
</footer>

<script>
const AX={axisLine:{lineStyle:{color:'#2e2e2e'}},axisLabel:{color:'#b4b4b4'},splitLine:{lineStyle:{color:'#1e1e1e'}}};
const charts=[];
function title(text,sub){return {text,subtext:sub,left:0,textStyle:{color:'#e8e8e8',fontSize:14},subtextStyle:{color:'#7c7c7c',fontSize:11}};}
function mk(id,opt){const el=document.getElementById(id);if(!el)return;const c=echarts.init(el,'dark',{renderer:'canvas'});
  c.setOption(Object.assign({backgroundColor:'transparent',textStyle:{fontFamily:'Noto Sans SC'},
    tooltip:{backgroundColor:'#171717',borderColor:'#2e2e2e',textStyle:{color:'#e8e8e8'}},
    legend:{textStyle:{color:'#b4b4b4'}}},opt));charts.push(c);}
window.addEventListener('resize',()=>charts.forEach(c=>c.resize()));

const TREND=${trendData};
mk('chart-trend',{title:title('“${screw.meta.kw.replaceAll("'", "\\'")}”情报声量趋势','窗口 365 天 · 单位：条'),
  tooltip:{trigger:'axis'},legend:{top:0,right:0,textStyle:{color:'#b4b4b4'}},
  grid:{left:48,right:24,top:56,bottom:32},xAxis:{type:'category',data:TREND.labels,...AX},yAxis:{type:'value',...AX},
  series:[{name:'声量',type:'bar',data:TREND.counts,itemStyle:{color:'#5b8def',borderRadius:[4,4,0,0]},barMaxWidth:22},
          {name:TREND.window+' 期均值',type:'line',smooth:true,data:TREND.ma,symbol:'none',lineStyle:{color:'#22c55e',width:2}}]});

const SRC=${sourceData};
mk('chart-source',{title:title('信源报道量 Top10','窗口 365 天 · 条数'),tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
  grid:{left:150,right:24,top:56,bottom:24},xAxis:{type:'value',...AX},yAxis:{type:'category',data:SRC.names,...AX},
  series:[{type:'bar',data:SRC.counts,itemStyle:{color:'#5b8def',borderRadius:[0,4,4,0]},barMaxWidth:16}]});

const GR=${gradeData};
mk('chart-grade',{title:title('证据等级构成','A/B/C/D 条数占比'),tooltip:{trigger:'item'},legend:{bottom:0,textStyle:{color:'#b4b4b4'}},
  series:[{type:'pie',radius:['46%','70%'],center:['50%','46%'],label:{color:'#b4b4b4'},
    data:[{value:GR[0],name:'A 🟢',itemStyle:{color:'#22c55e'}},{value:GR[1],name:'B 🟡',itemStyle:{color:'#f59e0b'}},
          {value:GR[2],name:'C 🔴',itemStyle:{color:'#ef4444'}},{value:GR[3],name:'D ⚪',itemStyle:{color:'#7c7c7c'}}]}]});

const RADAR=${radarData};
mk('chart-radar',{title:title('三赛道波特五力对比','威胁 1–5，无证据=0'),tooltip:{},legend:{bottom:0,textStyle:{color:'#b4b4b4'}},
  radar:{indicator:${JSON.stringify(radarAxes)}.map(n=>({name:n,max:5})),axisName:{color:'#b4b4b4'},
    splitLine:{lineStyle:{color:'#242424'}},splitArea:{areaStyle:{color:['rgba(255,255,255,.01)','transparent']}}},
  series:[{type:'radar',data:RADAR}]});

const links=[...document.querySelectorAll('.toc a')];
const obs=new IntersectionObserver((entries)=>{for(const e of entries){if(e.isIntersecting){
  links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id));}}},{rootMargin:'-45% 0px -50% 0px'});
document.querySelectorAll('section[id]').forEach(s=>obs.observe(s));
</script>
</body></html>`;
}
