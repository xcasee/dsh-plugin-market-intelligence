# 检索策略（search-strategy）

## 一、两阶段检索（默认路径）

**第一阶段——发现信源**：`find_trusted_sources`，按 `category` + `min_tscore≥0.6` 圈定可信子集，捕获 `source_ids`。

**第二阶段——范围内检索**：`search_intelligence`，把 `source_ids` 作为硬约束，配合查询语法精确命中。

> 为什么不直接全库检索：全库包含 UGC 与低质转载，直接检索会被噪声淹没。先圈定可信子集，是 T-Score 体系发挥作用的前提。

## 二、查询语法（5 类运算符）

| 运算符 | 含义 | 示例 |
|---|---|---|
| `+word` | AND | `+AI +芯片` |
| `-word` | NOT | `+电动车 -自行车` |
| `a\|b` | 同义 OR | `电动车\|EV\|NEV` |
| `"phrase"` | 精确短语 | `"market share"` |
| `(...)` | 分组 | `+(特斯拉\|Tesla) +(交付\|销量)` |

**组合范式**：
```
+<主体同义词组> +<主题同义词组> +<地域组> -<排除词>
+(Tesla|BYD|NIO) +(EV|battery|charging) +(China|Europe) -rumor
```

**经验**：
- must 位只放强区分度词；泛词（「市场」「分析」「趋势」）放 should 位
- 关键数字用精确短语复核：`+"28 亿元"`、`+"Series B"`
- 中英同义词务必用 `|` 组合，避免漏检中文/英文单边来源

## 三、六维过滤

| 维度 | 参数 | 典型用法 |
|---|---|---|
| 类别 | `category` | `wire,mainstream` 提权威度；`tech,market` 提行业覆盖 |
| 地区 | `region` | 出海调研按 china/us/europe/sea 分别检索 |
| 语言 | `language` | `zh` 中文源、`en` 英文源 |
| 时间 | `days` / `start_date`+`end_date` | 默认 30；趋势 90；深度 180 |
| 可信度 | `min_tscore` | 常规 0.6；关键决策 0.8 |
| 信源 | `source_ids` | 由 `find_trusted_sources` 提供 |

## 四、CJK（中文）检索策略

- 直接输入中文，平台自动翻译为英文检索，返回 `translated_keywords` 供核对
- 中英同义词用 `|` 组合（`特斯拉|Tesla`），避免只命中单语语料
- 中文精确短语同样用 `"..."`（如 `"市占率"`）

## 五、CVC 语义检索策略

**何时用**：概念级、跨语种、无法用关键词准确表达的需求（「续航焦虑」「卡脖子」「东南亚本土化壁垒」）。

**流程**：
1. 新建/复用 CVC 模型（`cvc_` 前缀 + 小写字母数字，如 `cvc_battery_anxiety`）
2. 用 `search_with_cvc`（宽泛 q + 更大 days + cvc_model_id）归集语料，系统异步建向量索引
3. 用 `semantic_search` 检索：
   - `mode=hybrid`（默认）：BM25 + 向量 + RRF，平衡精确与召回
   - `mode=semantic`：纯向量，概念探索
   - `mode=keyword`：纯 BM25，精确匹配
4. 语义命中**仅作线索**，关键事实必须回到 `search_intelligence` 用关键词+精确短语复核

**语料不足**时（`fusion.vector_hits` 很小或 `degraded=true`），先用 `search_with_cvc` 扩大归集，再重试语义检索。
