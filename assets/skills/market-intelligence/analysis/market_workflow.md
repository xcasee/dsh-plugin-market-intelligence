# 市场分析工作流（market_workflow）

适用于「市场规模 / 格局 / 趋势 / 值不值得进入」类问题。核心方法是 **PESTEL 宏观扫描 + 波特五力结构分析 + 集中度口径纪律**，所有结论挂证据。

## 一、检索编排（三轮）

### 第一轮：广域扫描

```
find_trusted_sources(category="wire,mainstream", min_tscore=0.6)   # 权威组
find_trusted_sources(category="market,tech",    min_tscore=0.5)   # 行业组
search_intelligence(q="+({市场}|{market}) +(规模|market size|CAGR|增长|出货|亿元)",
                    source_ids=[...], days=180, limit=50)
analyze_trend(q="+({市场} |{market})", days=180)
```

产出：主题全景、关键玩家、时间线上的催化点。

### 第二轮：维度深挖（PESTEL 六维）

| 维度 | 检索式 | 过滤 |
|---|---|---|
| Political 政策 | `+(policy\|regulation\|subsidy\|补贴\|标准)` | `category=wire,mainstream` |
| Economic 经济 | `+(market size\|CAGR\|revenue\|forecast\|规模\|增速)` | `category=market` |
| Social 社会 | `+(consumer\|demand\|adoption\|需求\|渗透率)` | — |
| Technological 技术 | `+(technology\|innovation\|R&D\|breakthrough\|技术\|专利)` | `category=tech` |
| Environmental 环境 | `+(ESG\|sustainability\|carbon\|双碳)` | — |
| Legal 法律 | `+(law\|regulation\|compliance\|antitrust\|监管)` | `category=wire,mainstream` |

### 第三轮：结构分析（波特五力 + 集中度）

| 五力 | 检索式要点 |
|---|---|
| 现有竞争 | `+(rivalry\|份额\|CR4\|价格战\|同质化)` |
| 新进入者 | `+(new entrant\|funding\|跨界\|入局)` |
| 替代品 | `+(substitution\|替代\|路线之争)` |
| 供方议价 | `+(supplier\|供给紧张\|交期\|卡脖子)` |
| 买方议价 | `+(buyer\|压价\|招标\|客户集中)` |

**集中度口径纪律**：只用情报文本中**明示**的份额数字计算 CR4/HHI，并注明来源与口径（「报道口径，非出货统计」）。欠披露时写「公开情报未披露，待行研/官方补充」，不要推算。

## 二、评分与结论

用五维市场吸引力评分（每维 0–5，无证据记 0 分）：

| 维度 | 权重 | 满分条件 |
|---|---|---|
| 规模 | 0.22 | ≥2 个独立信源给出市场规模数字 |
| 增长 | 0.23 | ≥2 个独立信源给出增速/CAGR |
| 政策 | 0.20 | ≥2 个独立信源给出支持性政策（存在红线则 1 分） |
| 利润 | 0.15 | 有毛利率证据且无价格战 |
| 需求 | 0.20 | 有订单/供不应求/未满足需求的硬证据 |

**市场吸引力 = Σ(维度分/5 × 权重) × 100**

结论分档（同时考虑证据置信度）：

| 分数 | 结论 | 说明 |
|---|---|---|
| ≥75 且高置信 | **Go** | 批准受控进入，锁定预算、负责人与止损线 |
| 60–75 | **Niche Go** | 以细分场景/核心零部件方式切入，先验证后加码 |
| 45–60 | **Watch** | 进入观察名单，定义重评触发器 |
| <45 | **No-Go** | 暂停并保留依据 |

**否决闸门优先**：存在政策红线/合规否决（如被明令禁止）时，直接 No-Go，不做加权。**低置信封顶**：A/B 级证据覆盖率 <50% 时，Go 降级为 Niche Go。

## 三、输出结构

见 `market_templates.md`。报告须包含：结论先行 → 规模与增长 → PESTEL → 竞争结构与集中度 → 五力 → 机会窗口 → 风险与盲区 → 来源附录。
