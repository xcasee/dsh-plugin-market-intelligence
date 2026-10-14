---
name: market-intelligence
description: CaSee 市场情报分析方法学——两阶段可信检索、T-Score/ABCD 可信度分级、市场/竞争/客户三类分析工作流，以及 CaSee 深色看板 HTML 报告的完整样式与图表规范。
summary: 用 6 个情报工具（find_trusted_sources / search_intelligence / analyze_trend / aggregate_by_source / search_with_cvc / semantic_search）从 CaSee 平台的 500+ 可信信源检索真实、可溯源的市场情报，并产出带 T-Score 标注的 Markdown 摘要与 CaSee 深色看板 HTML 报告。
---

# CaSee 市场情报分析技能

## 简介

本技能指导把 AI 变成一名**市场情报分析师**：通过 CaSee（凯见）平台的 6 个情报工具，从 **500+ 可信信源**检索**真实、可溯源**的市场、竞争与客户情报，并输出带可信度标注的结构化报告。

核心价值：LLM 的行业回答受限于训练数据截止日期且来源不可验证。本技能提供**实时、有出处、可追溯**的情报——每条结果附带 `title`、`source_id`、`published_at`、`tscore`（0–1 可信度）与 `url`，杜绝幻觉。

**三条铁律**：

1. **零编造** — 所有情报必须来自工具返回，绝不虚构来源、数据、事件
2. **可溯源** — 每条事实性结论标注 T-Score + 信源名称 + 发布日期
3. **密钥安全** — 绝不在输出中暴露 API 密钥或端点凭证

## 前置条件

情报工具需要 CaSee API 密钥。若工具报 `AUTH_REQUIRED`，引导用户：

1. 打开 https://casee.me 注册 / 登录（免费）
2. 在个人中心创建并复制 API 密钥
3. 导出环境变量后重启 dsh：`export CASEE_API_KEY=<你的密钥>`
   （自托管环境把 `apiBaseUrl` 指向自己的 REST 基地址）
4. **新开对话**后再提问

未取得密钥前不要检索、更不要编造数据。

## 一、六个情报工具

### 1. `find_trusted_sources` — 发现可信信源

按类别 / 地区 / 语言 / 可信度筛选信源，返回 `source_id` 供后续检索圈定范围。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `keyword` | str | 否 | "" | 模糊匹配 source_id / name |
| `category` | str | 否 | "" | `wire` 通讯社 / `mainstream` 主流 / `tech` 科技 / `market` 市场 / `ai` |
| `region` | str | 否 | "" | 地区（china / us / europe / ...） |
| `language` | str | 否 | "" | 语言（zh / en / ja / ...） |
| `min_tscore` | float | 否 | 0.6 | 最低信源可信度 |
| `sample_size` | int | 否 | 2 | 每信源样例条数 |
| `limit` | int | 否 | 20 | 返回信源数上限 |

**返回**：`{count, total, sources:[{source_id, name, tscore, category, tier, region, language, propaganda_risk, state_affiliated, sample_data}]}`

### 2. `search_intelligence` — 复杂逻辑情报检索（主力）

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `q` | str | **是** | — | 类 Google 查询语法（见第二节） |
| `source_ids` | str[] | 否 | — | 来自 find_trusted_sources，硬约束检索范围 |
| `must_keywords` / `should_keywords` / `not_keywords` | str | 否 | "" | 逗号分隔的 AND / OR / NOT 词 |
| `min_tscore` | float | 否 | 0.6 | 最低情报可信度（关键决策用 0.8） |
| `days` | int | 否 | 30 | 时间窗口（天），与 start_date/end_date 二选一 |
| `start_date` / `end_date` | str | 否 | "" | YYYY-MM-DD |
| `category` / `region` / `language` | str | 否 | "" | 信源维度过滤 |
| `limit` | int | 否 | 20 | 返回条数上限 |

**返回**：`{query, count, truncated, translated_keywords, items:[{title, description, source_id, source_name, tscore, published_at, url, category, region, language}]}`

### 3. `analyze_trend` — 时间序列趋势

按日（窗口宽时按月）聚合情报量，给出热度峰值、峰值日与驱动信源。

| 参数 | 类型 | 必填 | 默认 |
|---|---|---|---|
| `q` | str | **是** | — |
| `source_ids` | str[] | 否 | — |
| `min_tscore` | float | 否 | 0.6 |
| `days` | int | 否 | 90 |
| `limit` | int | 否 | 200 |

**返回**：`{query, granularity:'day'|'month', date_range:{start,end}, summary:{total, peak_date, peak_count, avg_per_bucket, total_sources}, trend:[{date, count, top_sources}]}`

### 4. `aggregate_by_source` — 信源聚合

按信源统计报道量、平均可信度与样例标题，评估媒体关注度与立场分布。

| 参数 | 类型 | 必填 | 默认 |
|---|---|---|---|
| `q` | str | **是** | — |
| `source_ids` | str[] | 否 | — |
| `min_tscore` | float | 否 | 0.6 |
| `days` | int | 否 | 30 |
| `limit` | int | 否 | 100 |

**返回**：`{query, total, sources:[{source_id, name, count, avg_tscore, sample_titles}]}`

### 5. `search_with_cvc` — 带 CVC 归集的检索

与 `search_intelligence` 相同，额外接受 `cvc_model_id`：传入即把命中情报异步归集到该 CVC 模型的向量库，供 `semantic_search` 二阶段使用。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `q` | str | **是** | 查询语法 |
| `cvc_model_id` | str | 否 | 形如 `cvc_battery_anxiety`，匹配 `^cvc_[a-z0-9]{8,32}$` |
| 其余 | — | 否 | 同 `search_intelligence`；`limit` 默认 100 |

### 6. `semantic_search` — CVC 语义检索

对 CVC 模型库执行 BM25 + 向量 ANN + RRF 融合检索，跨语种、跨表达命中概念级情报。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `cvc_model_id` | str | **是** | — | `^cvc_[a-z0-9]{8,32}$` |
| `q` | str | **是** | — | 自然语言概念查询 |
| `mode` | str | 否 | hybrid | `hybrid` / `semantic`（概念探索）/ `keyword`（精确） |
| `top_k` | int | 否 | 20 | 返回条数上限 |
| `time_range` | str | 否 | "" | 预设窗口 1d / 7d / 1m / 3m，与 days 二选一 |
| `days` | int | 否 | — | 自定义窗口（天），0 表示不限 |
| `category` / `region` / `language` | str | 否 | "" | 维度过滤 |
| `min_tscore` | float | 否 | 0.6 | 最低可信度 |

**返回**：`{cvc_model_id, mode, fusion:{bm25_hits, vector_hits, degraded}, count, hits:[{...item, similarity}]}`

---

## 二、查询语法（`q` 参数）

| 运算符 | 含义 | 示例 |
|---|---|---|
| `+word` | 必须包含（AND） | `+AI +芯片` |
| `word1 word2` | 任一匹配（OR） | `EV battery` |
| `-word` | 排除（NOT） | `+电动车 -自行车` |
| `"exact phrase"` | 精确短语 | `"market share"` |
| `word1\|word2` | 同义词组（OR） | `电动车\|EV\|NEV` |
| `(a OR b)` | 分组 | `+(特斯拉\|Tesla) +(交付\|销量)` |

**复杂示例**

```
+(Tesla|BYD|NIO|Xpeng) +(EV|"electric vehicle"|battery) +(China|Europe|US) -rumor
+(GPU|AI芯片|accelerator) +(NVIDIA|英伟达|AMD|华为) -(手机|mobile|smartphone)
+"Series B" +(raise|融资|轮次) +(AI|人工智能)
```

> 中文关键词自动翻译为英文检索；中英同义词用 `|` 组合；泛词（"市场"/"分析"）放 should 位而非 must 位。

---

## 三、两条检索路径

### 路径 A — 关键词两阶段检索（默认）

1. **意图解析**：目标实体（中英别名）+ 时间窗口（默认 30 天；趋势 90 天；深度 180 天）+ 可信度（默认 ≥0.6，关键决策 ≥0.8）+ 分析类型；缺关键参数先追问
2. **信源发现**：`find_trusted_sources`（category + min_tscore≥0.6），捕获 `source_ids`
3. **情报检索**：`search_intelligence`（source_ids + 查询语法）
4. **深入分析**：按需 `analyze_trend`（趋势）/ `aggregate_by_source`（信源对比）
5. **交叉验证**：关键论断用精确短语 + min_tscore≥0.7 多源复核；单一信源的关键数据标注「待验证」
6. **格式化交付**：Markdown 摘要 + CaSee 深色看板 HTML 报告（见 `analysis/report_style.md`）

### 路径 B — CVC 语义检索（概念级 / 跨语种 / 表达模糊）

1. **概念抽象**：提炼核心概念（如「续航焦虑」「东南亚电动化布局」）
2. **情报归集**：`search_with_cvc`（宽泛 q + cvc_model_id）建立向量索引
3. **语义检索**：`semantic_search`（同 cvc_model_id，mode=hybrid）
4. **交叉验证**：语义命中仅作线索，关键事实回到 `search_intelligence` 精确复核
5. **格式化交付**：语义关联情报 + 聚类主题卡片 + HTML 报告

### 意图决策树

```
用户输入
  ├─ 问"趋势/变化/走势/峰值" → analyze_trend (+ search_intelligence)
  ├─ 问"对比/哪些媒体/来源分布" → aggregate_by_source (+ search_intelligence)
  ├─ 问"找信源/有哪些来源" → find_trusted_sources
  ├─ 概念级/跨语种/表达模糊 → search_with_cvc → semantic_search
  └─ 默认 → find_trusted_sources → search_intelligence → (按需追加分析工具)
```

---

## 四、五大应用场景

| 场景 | 触发问法 | 工具编排 |
|---|---|---|
| **新产品策划** | 「XX 产品值不值得做」 | 痛点：`+{品类} +(pain point\|complaint\|need)` + `analyze_trend` → 竞品空白：`+(landscape\|players\|share)` → 需求聚类：CVC 语义检索 → SWOT/五力 |
| **新市场调研** | 「调研 XX 市场规模和格局」 | 广域扫描（规模/格局/趋势）→ PESTEL 六维 + 波特五力逐维深挖 → 关键数据 `min_tscore≥0.8` 精确短语交叉验证 |
| **客户需求预测** | 「客户对 XX 有哪些新信号」 | 需求：`+{产品} +(need\|feature request)` → 痛点：`+(pain point\|complaint)` → CVC 语义聚类 → `analyze_trend`(days=90~180) 趋势外推 |
| **出海市场调研** | 「想出海东南亚/欧美」 | 分区域检索（region/language）→ 本地格局 `+(local players\|entry barrier)` → CVC 跨语种洞察 → 合规风险 `+(policy\|tariff\|GDPR)` → 区域优先级矩阵 |
| **竞争态势分析** | 「对比 A vs B」「谁威胁最大」 | 竞品全景 → 五维追踪（新品/融资/合作/口碑/人才）→ `aggregate_by_source` 对比 → 威胁矩阵 → 应对建议 |

> 详细工作流与映射见 `analysis/`（市场 `market_workflow.md` + `market_templates.md`；竞争 / 客户章节）。

---

## 五、T-Score 可信度体系

| T-Score | 等级 | 标识 | 决策建议 |
|---|---|---|---|
| ≥ 0.8 | A 级 | 🟢 高可信 | 可直接作为决策依据 |
| 0.6–0.8 | B 级 | 🟡 中可信 | 结合上下文使用 |
| 0.4–0.6 | C 级 | 🔴 低可信 | 信号参考，需交叉验证 |
| < 0.4 | D 级 | ⚪ 待验证 | 视为传言，不作事实陈述 |

**ABCD 信源分级**：A=通讯社/官方（路透、彭博、新华社、官方公告、监管文件）；B=主流权威（TechCrunch、36氪、华尔街日报）；C=垂直媒体/博客；D=UGC/论坛。

**执行纪律**：高可信信号（≥0.8）置顶展示；T-Score < 0.8 的结论用于关键决策时提示独立验证；趋势结论区分「数据事实」与「分析推断」；报告末尾附来源清单。

---

## 六、输出规范（双格式交付，不可二选一）

**第一部分：Markdown 摘要（对话内直接呈现）** — 一句话结论 + 3–5 条关键发现（每条附 T-Score + 信源名 + 日期 + 可点链接）+ 核心图表的文字化结论（峰值日、Top 信源、对比结论）。

**第二部分：CaSee 深色看板 HTML 报告（保存为 `.html` 文件交付）** — 必须与 CaSee 官方《行业竞争价值链分析报告》同款样式，**完整设计令牌、CSS、骨架、ECharts 引导脚本与图表配方一律以 `analysis/report_style.md` 为准，原样内联，不得自创风格**。固定骨架：

1. **appbar**：CaSee 品牌 + 「登录 CaSee 凯见 →」按钮
2. **cover**：kicker + 报告大标题（渐变字）+ 报告摘要 + 4 张封面指标卡（情报总量 / 高可信占比 / 平均 T-Score / 活跃信源数，无真实数据写 ⬜）+ cover-meta（报告时点 / 分析模型 / 数据来源）
3. **nav.toc 吸顶目录**：结论先行 → 各编号章节 → 来源附录，滚动高亮
4. **00 结论先行**：metric 卡 + keybox「核心判断（三句话）」+ 关键结论/排序总表
5. **编号分析章节**（sec-no 00/一/二…，奇偶 `alt` 交替）：sec-head → sec-lead 口径 → h3.blk 小节（metric / 表格 / ECharts / SWOT / 时间线 / 实体卡 / 2×2 矩阵）→ 章末 keybox
6. **footer#sources**：编号来源清单（标题链接〔信源名〕日期 + T-Score 徽章）+ 口径说明 + `Powered by CaSee 情报平台 · 500+ 可信情报信源`

**T-Score 色标**（Markdown 与 HTML 一致）：≥0.8 绿 `#22c55e`（`t-hi`）；0.6–0.8 琥珀 `#f59e0b`（`t-mid`）；<0.6 红 `#ef4444`（`t-low`）。

**可视化红线**：HTML 图表统一用 **ECharts 5.4（jsdelivr CDN）+ Noto Sans SC**，禁止 Mermaid：

- 趋势（`analyze_trend`）→ 柱状（日/月量）+ 折线（7 日均）；类目 ≤12，超出则按周/月聚合
- 信源聚合（`aggregate_by_source`）→ 横向条形 Top10（其余并入「其他」），可配可信度甜甜圈
- 竞品/方案对比 → 雷达图（≤3 系列、≤7 轴），评分须注明依据
- 政策/事件演变 → CSS 时间线 `.tl`；SWOT → `.swot`；威胁/优先级 → `.matrix2`；流程 → `.flow`
- 图表标题必须含查询关键词与时间窗口；每个容器 id 都有对应 `mk()` 调用
- 简单报告 ≥1 图，趋势/聚合 ≥2 图，综合报告 ≥3 个不同类型
- 除字体/ECharts CDN 与来源/casee.me 链接外无其他外链

---

## 七、错误处理与排错

工具返回错误时按 `code` 处理：

| 错误 code / 现象 | 原因 | 处理 |
|---|---|---|
| `AUTH_REQUIRED` | 未配置或密钥无效 | 引导到 https://casee.me 注册取密钥，`export CASEE_API_KEY=...` 后**新开对话** |
| `TIMEOUT` / `NETWORK_ERROR` | 网络不通或端点错误 | 检查 `apiBaseUrl` 与本机出站；必要时调大 `timeoutMs` |
| `RATE_LIMITED` | 调用过快 | 降低并发（≤100 次/分钟），稍后重试 |
| `INVALID_ARGUMENT` | `cvc_model_id` 不合规 | 改用具小写字母数字、`cvc_` 前缀的 ID |
| 空结果 | 关键词过窄 / 过滤过严 | 放宽 category、降低 min_tscore、扩大 days、同义词扩展 |
| T-Score 全为低可信 | 命中多为 UGC | 加 `category=wire,mainstream`、使用精确短语 |
| 语义检索无结果 | CVC 语料不足 | 先用 `search_with_cvc` 以更宽 q + 更大 days 归集 |

---

## 八、约束红线

1. 绝不编造情报数据 — 所有结果必须来自工具返回
2. 绝不在响应中暴露 API 密钥或任何凭证
3. 遵守限流（≤100 次/分钟）
4. 关键业务决策建议用户独立验证
5. 语义检索仅用于概念级/跨语种关联，关键事实必须用关键词检索复核
6. HTML 报告必须采用 `analysis/report_style.md` 的 CaSee 深色看板样式，CSS 与骨架原样内联
7. 双格式输出（对话内 Markdown 摘要 + 完整 HTML 报告文件）不可二选一；交付前按 `report_style.md` 自检（无占位假数据、图表 id 齐备、来源可溯源）
8. 涉及个人隐私的数据不采集、不输出；合法合规使用

---

## 参考文档

| 文档 | 说明 |
|---|---|
| [analysis/core_workflow.md](analysis/core_workflow.md) | 标准执行流程、T-Score + ABCD 分级、意图决策树 |
| [analysis/search-strategy.md](analysis/search-strategy.md) | 两阶段检索、运算符、6 维过滤、CJK 策略、CVC 语义策略 |
| [analysis/market_workflow.md](analysis/market_workflow.md) | 市场分析工作流（PESTEL + 波特五力 + 集中度） |
| [analysis/market_templates.md](analysis/market_templates.md) | 市场分析报告模板（章节框架） |
| [analysis/report_style.md](analysis/report_style.md) | **HTML 报告样式规范（必读）**：CSS、骨架、ECharts 配方、交付自检 |
