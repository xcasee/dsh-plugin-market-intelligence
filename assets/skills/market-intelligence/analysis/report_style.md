# HTML 报告样式规范（report_style）

本文件是市场情报 HTML 报告的**唯一样式来源**。生成报告时必须原样内联本文件的 CSS 与骨架，不得自创风格。目标：与 CaSee 官方《行业竞争价值链分析报告》同款深色看板。

## 一、设计令牌（必须使用）

```css
:root{
  --bg:#0a0a0a; --panel:#121212; --panel-2:#171717; --line:#242424; --line-2:#2e2e2e;
  --fg:#e8e8e8; --fg-2:#b4b4b4; --fg-3:#7c7c7c;
  --blue:#5b8def; --blue-2:#7aa5f5; --blue-dim:#1e2a44;
  --hi:#22c55e;   /* T ≥ 0.8 高可信 */
  --mid:#f59e0b;  /* 0.6–0.8 中可信 */
  --low:#ef4444;  /* < 0.6 低可信 */
  --radius:12px; --radius-sm:8px; --maxw:1080px;
}
```

字体：`font-family:"Noto Sans SC",system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`。当环境本地已安装 Noto Sans SC 时优先使用，否则回退系统中文栈（PingFang SC / Microsoft YaHei）。唯一允许的外部脚本依赖是 ECharts 5.4 CDN；除来源链接与 `casee.me` 外不得引入其他外链（含字体样式表，避免跨域 ORB 拦截）。

## 二、骨架（固定顺序）

```html
<!doctype html><html lang="zh-CN"><head>
  <meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>{报告标题} · CaSee 凯见</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
  <style>{本文件第三节 CSS，原样内联}</style>
</head><body>
  <header class="appbar">
    <div class="brand">CaSee<span>凯见</span></div>
    <a class="cta" href="https://casee.me" target="_blank" rel="noopener">登录 CaSee 凯见 →</a>
  </header>

  <section class="cover">
    <a class="kicker" href="https://casee.me" target="_blank" rel="noopener">CaSee 情报平台 · 市场情报分析</a>
    <h1>{报告大标题}</h1>
    <p class="cover-abstract">{报告摘要 2–3 句，含样本量与窗口}</p>
    <div class="cover-cards">
      <div class="ccard"><span class="ccard-k">情报总量</span><b class="ccard-v">{N}</b></div>
      <div class="ccard"><span class="ccard-k">高可信占比</span><b class="ccard-v">{pct}</b></div>
      <div class="ccard"><span class="ccard-k">平均 T-Score</span><b class="ccard-v">{avg}</b></div>
      <div class="ccard"><span class="ccard-k">活跃信源数</span><b class="ccard-v">{sources}</b></div>
    </div>
    <div class="cover-meta">报告时点 {date} · 分析模型 DeepSeek Harness · 数据来源 CaSee 情报平台</div>
  </section>

  <nav class="toc"><ol>{每个章节一个 <li><a href="#sec-N">}</ol></nav>

  <main>
    <section id="sec-0" class="sec"><div class="sec-head"><span class="sec-no">00</span><h2>结论先行</h2></div>
      <div class="metrics">…metric…</div>
      <div class="keybox"><h3>核心判断</h3><p>…三句话…</p></div>
      <div class="tbl-wrap">…关键结论总表…</div>
    </section>
    <section id="sec-1" class="sec alt">…</section>
    …
  </main>

  <footer id="sources" class="footer">
    <h2>来源附录</h2>
    <ol class="src-list">{<li>标题 <a>链接</a>〔信源名〕日期 <span class="tag t-hi">T 0.88</span></li>}</ol>
    <p class="fnote">口径说明：…</p>
    <p class="powered">Powered by CaSee 情报平台 · 500+ 可信情报信源</p>
  </footer>
  <script>{第四节 ECharts 引导脚本 + scrollspy + resize}</script>
</body></html>
```

**appbar CTA、各章 sec-cta、页脚 `Powered by CaSee` 均不可省略。**

## 三、CSS（原样内联）

```css
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 "Noto Sans SC",system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--blue);text-decoration:none}
a:hover{color:var(--blue-2)}
.appbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(10,10,10,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.brand{font-weight:700;letter-spacing:.5px}.brand span{color:var(--blue);margin-left:4px}
.cta{padding:8px 16px;border:1px solid var(--blue);border-radius:999px;font-size:13px;background:var(--blue-dim)}
.cover{max-width:var(--maxw);margin:0 auto;padding:64px 24px 32px}
.kicker{display:inline-block;font-size:12px;color:var(--fg-3);border:1px solid var(--line-2);border-radius:999px;padding:4px 12px;margin-bottom:20px}
.cover h1{font-size:clamp(28px,4vw,44px);line-height:1.25;margin:0 0 16px;background:linear-gradient(92deg,#fff 20%,var(--blue) 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
.cover-abstract{color:var(--fg-2);max-width:760px;margin:0 0 28px}
.cover-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.ccard{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:16px}
.ccard-k{display:block;font-size:12px;color:var(--fg-3);margin-bottom:6px}
.ccard-v{font-size:24px;font-weight:700}
.cover-meta{font-size:12px;color:var(--fg-3)}
.toc{position:sticky;top:57px;z-index:40;max-width:var(--maxw);margin:0 auto;padding:10px 24px;background:rgba(10,10,10,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);overflow-x:auto}
.toc ol{display:flex;gap:16px;list-style:none;margin:0;padding:0;white-space:nowrap}
.toc a{font-size:13px;color:var(--fg-3)}
.toc a.active{color:var(--blue);font-weight:600}
main{max-width:var(--maxw);margin:0 auto;padding:24px}
.sec{padding:40px 0;border-bottom:1px solid var(--line)}
.sec.alt{background:linear-gradient(180deg,rgba(255,255,255,.012),transparent)}
.sec-head{display:flex;align-items:baseline;gap:14px;margin-bottom:8px}
.sec-no{font-size:13px;color:var(--blue);font-variant-numeric:tabular-nums;letter-spacing:1px}
.sec-head h2{font-size:22px;margin:0}
.sec-lead{color:var(--fg-3);font-size:13px;margin:0 0 22px}
.sec-cta{display:inline-block;margin-top:14px;font-size:13px;color:var(--blue)}
h3.blk{font-size:16px;margin:26px 0 10px;padding-left:10px;border-left:3px solid var(--blue)}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}
.metric{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px}
.metric .k{font-size:12px;color:var(--fg-3)}.metric .v{font-size:22px;font-weight:700;margin-top:4px}
.metric .d{font-size:12px;color:var(--fg-3);margin-top:4px}
.keybox{background:var(--blue-dim);border:1px solid #2a3d63;border-radius:var(--radius);padding:18px 20px;margin:18px 0}
.keybox h3{margin:0 0 8px;font-size:14px;color:var(--blue-2)}
.keybox p{margin:0;color:var(--fg)}
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
.chart .chart-cap{font-size:12px;color:var(--fg-3);margin:0 0 8px}
.chart .canvas{width:100%;height:340px}
.swot{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.swot>div{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px}
.swot h4{margin:0 0 8px;font-size:13px;color:var(--blue-2)}
.swot ul{margin:0;padding-left:18px;color:var(--fg-2);font-size:13px}
.tl{position:relative;margin:16px 0 16px 8px;padding-left:22px;border-left:1px solid var(--line-2)}
.tl li{list-style:none;position:relative;padding:0 0 16px}
.tl li::before{content:"";position:absolute;left:-28px;top:6px;width:10px;height:10px;border-radius:50%;background:var(--blue)}
.tl .tl-d{font-size:12px;color:var(--fg-3)}
.matrix2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.matrix2>div{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;min-height:96px}
.entity{display:flex;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;margin:12px 0}
.entity .badge{flex:0 0 44px;height:44px;border-radius:10px;background:var(--blue-dim);color:var(--blue-2);display:grid;place-items:center;font-weight:700}
.flow{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:16px 0}
.flow .step{background:var(--panel);border:1px solid var(--line-2);border-radius:999px;padding:6px 14px;font-size:13px}
.flow .arrow{color:var(--fg-3)}
.footer{max-width:var(--maxw);margin:0 auto;padding:40px 24px 64px}
.src-list{color:var(--fg-2);font-size:13px;line-height:1.9}
.fnote{font-size:12px;color:var(--fg-3);margin-top:16px}
.powered{font-size:12px;color:var(--fg-3);margin-top:8px}
@media(max-width:720px){.cover-cards{grid-template-columns:repeat(2,1fr)}.swot,.matrix2{grid-template-columns:1fr}}
```

## 四、ECharts 深色引导脚本与图表配方

所有图表复用一套深色主题工厂 `mk(el, option)`；每个图表容器 id 都必须有对应 `mk()` 调用，窗口 resize 时统一 `chart.resize()`。

```js
const AX={axisLine:{lineStyle:{color:'#2e2e2e'}},axisLabel:{color:'#b4b4b4'},splitLine:{lineStyle:{color:'#1e1e1e'}}};
const charts=[];
function mk(id,opt){const el=document.getElementById(id);if(!el)return;const c=echarts.init(el,'dark',{renderer:'canvas'});
  c.setOption(Object.assign({backgroundColor:'transparent',textStyle:{fontFamily:'Noto Sans SC'},
    tooltip:{backgroundColor:'#171717',borderColor:'#2e2e2e',textStyle:{color:'#e8e8e8'}},
    legend:{textStyle:{color:'#b4b4b4'}}},opt));charts.push(c);}
function title(text,sub){return {text,subtext:sub,left:0,textStyle:{color:'#e8e8e8',fontSize:14},subtextStyle:{color:'#7c7c7c',fontSize:11}};}
window.addEventListener('resize',()=>charts.forEach(c=>c.resize()));

// 配方 1 · 趋势：柱状（周期声量）+ 折线（7 日均）—— analyze_trend
mk('chart-trend',{title:title('“{关键词}”情报声量趋势','{起} —{止} · 单位：条'),tooltip:{trigger:'axis'},
  grid:{left:48,right:24,top:56,bottom:32},xAxis:{type:'category',data:labels,...AX},
  yAxis:{type:'value',...AX},
  series:[{name:'声量',type:'bar',data:counts,itemStyle:{color:'#5b8def',borderRadius:[4,4,0,0]},barMaxWidth:22},
          {name:'7 日均',type:'line',smooth:true,data:ma7,symbol:'none',lineStyle:{color:'#22c55e',width:2}}]});

// 配方 2 · 信源分布：横向条形 Top10（其余并入「其他」）—— aggregate_by_source
mk('chart-source',{title:title('信源报道量 Top10','{窗口} · 条数'),tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
  grid:{left:120,right:24,top:56,bottom:24},xAxis:{type:'value',...AX},yAxis:{type:'category',data:names,...AX},
  series:[{type:'bar',data:counts,itemStyle:{color:'#5b8def',borderRadius:[0,4,4,0]},barMaxWidth:16}]});

// 配方 3 · 可信度甜甜圈
mk('chart-grade',{title:title('证据等级构成','A/B/C/D 条数占比'),
  tooltip:{trigger:'item'},legend:{bottom:0,textStyle:{color:'#b4b4b4'}},
  series:[{type:'pie',radius:['46%','70%'],center:['50%','46%'],label:{color:'#b4b4b4'},
    data:[{value:a,name:'A 🟢',itemStyle:{color:'#22c55e'}},{value:b,name:'B 🟡',itemStyle:{color:'#f59e0b'}},
          {value:c,name:'C 🔴',itemStyle:{color:'#ef4444'}},{value:d,name:'D ⚪',itemStyle:{color:'#7c7c7c'}}]}]});

// 配方 4 · 竞品雷达（≤3 系列、≤7 轴）
mk('chart-radar',{title:title('竞品能力对比','分析师评分（正文给出每条依据）'),
  tooltip:{},legend:{bottom:0,textStyle:{color:'#b4b4b4'}},
  radar:{indicator:axes.map(n=>({name:n,max:5})),axisName:{color:'#b4b4b4'},splitLine:{lineStyle:{color:'#242424'}},splitArea:{areaStyle:{color:['rgba(255,255,255,.01)','transparent']}}},
  series:[{type:'radar',data:series}]});
```

其余结构：政策/事件演变用 CSS 时间线 `.tl`；SWOT 用 `.swot`；威胁/优先级用 `.matrix2`；流程用 `.flow`。**禁止 Mermaid。**

## 五、图表选择与数量

| 场景 | 图表 |
|---|---|
| 趋势（analyze_trend） | 配方 1 |
| 信源聚合（aggregate_by_source） | 配方 2（可选 + 配方 3） |
| 竞品/方案对比 | 配方 4 |
| 政策/事件 | `.tl` |
| 威胁/优先级 | `.matrix2` |
| 流程 | `.flow` |

数量下限：简单报告 ≥1 图；趋势/聚合类 ≥2 图；综合报告 ≥3 个**不同类型**。图表标题必须含查询关键词与时间窗口。

## 六、图表标题与来源纪律

- 每张图的 `title.text` 写明「关键词 + 时间窗口」，`subtext` 写明口径
- 页脚 `#sources` 用编号 `<ol>`，每条 = 标题（链接）+〔信源名〕日期 + T-Score 徽章
- 正文中每个数字后跟徽章，如 `<span class="tag t-hi">T 0.88</span>`

## 七、交付自检（逐项核对）

1. 单文件 HTML；仅引用 ECharts 5.4 CDN，其余无外链（来源/`casee.me` 除外）
2. 含 appbar + cover（4 卡）+ 吸顶 toc + 编号章节（奇偶交替）+ footer#sources
3. 00 结论先行含 keybox 三句话与关键结论总表
4. 每章有 sec-lead（样本量/窗口/盲区）与章末 keybox
5. 图表数量达标且类型不重复；每个容器 id 都有 `mk()` 调用，标题含关键词与窗口
6. 无占位假数据：缺失值写 ⬜；无编造来源
7. 页脚来源可点击且与正文引用一致；每条带 T-Score 徽章
8. 颜色仅使用设计令牌（T-Score 三色固定）
9. 文字与图表结论一致，区分「数据事实」与「分析推断」
