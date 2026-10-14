# CaSee 市场情报分析专家 · DSH 插件
*由 CaSee 凯见情报平台驱动 —— 把 500+ 可信信源变成一名可溯源的市场情报分析师*

<p align="center">
  <img src="imgs/casee_os_banner.png" alt="CaSee Market Intelligence DSH Plugin" width="1000">
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/dsh-plugin-market-intelligence"><img src="https://img.shields.io/npm/v/dsh-plugin-market-intelligence.svg" alt="npm"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22.19-blue.svg" alt="Node"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License"></a>
  <a href="https://casee.me"><img src="https://img.shields.io/badge/CaSee-Market%20Intelligence-green" alt="CaSee"></a>
</p>

**简体中文** | [English](README.en.md)

***
## 关于 CaSee —— AI 驱动的竞争情报平台

**CaSee（凯见）** 是 AI 驱动的**竞争情报与市场洞察平台** —— 「谋定而后动，见微知著，决胜千里」。

CaSee 提供**可信信源竞争情报**，帮助创业公司发现市场机会、帮助成熟企业扩大竞争优势。它解决企业竞争情报的核心痛点：

- 情报采集碎片化
- 人工分析低效
- 市场洞察滞后
- 情报无法进入业务决策

面向中大型企业的市场、销售、产品与战略团队，CaSee 把市场数据与业务决策连接起来 —— 从**被动竞争监测**升级为**主动市场趋势预判**。

### 平台能力

| 能力 | 说明 |
| --- | --- |
| **实时竞争感知** | 针对具体业务线监测竞品、市场与客户；全景式外部环境扫描；分级实时威胁预警 |
| **量化竞争威胁分析** | SWOT、PESTEL、BCG 矩阵、VRIO 框架等系统化分析工具，评估行业盈利性、竞争格局与政策风险 |
| **主动策略评估** | 自研神经-因果 AI 长链因果推理引擎，预测竞争策略效果 —— 开放世界推理长链因果，封闭世界推理量化执行结果 |
| **可信情报采集** | 实时竞品追踪、市场趋势预测、碎片化情报融合、目标导向的定向情报感知 |
| **专家竞争分析** | 定制化 CI 分析能力建设、自助式专业报告、行业专家知识库 |

> **可信情报保障**：量化 T-Score 可信度评分、多源交叉验证、因果推理偏差检测与合规护栏，防止 AI 幻觉、过期数据与虚假引用。
> **试用 CaSee**：<https://casee.me> —— 注册并获取 API 密钥。

***
## 🎯 这是什么

`dsh-plugin-market-intelligence` 是面向 **DeepSeek Harness（DSH）** 的市场情报分析专家插件（一个 `dsh.bundle` 包）。装入后，它向当前 profile 贡献三件东西，把 CaSee 情报能力直接变成模型可调用的原生能力：

| 贡献 | 内容 |
| --- | --- |
| **6 个模型可调用工具** | `find_trusted_sources`、`search_intelligence`、`analyze_trend`、`aggregate_by_source`、`search_with_cvc`、`semantic_search` |
| **专家人格段落** | 注册为 system prompt 的 `market-intelligence:expert` 段（order 5）：分析师角色、三条铁律、T-Score/ABCD 分级、检索方法与双格式输出契约 |
| **内置技能** | `market-intelligence` 技能（`ctx.skills` 运行时注册）：核心流程、检索策略、市场工作流、报告模板与 **HTML 报告样式规范** |

> **取数通道说明**：插件直连 CaSee **REST** 接口（`/v1/sources/search`、`/v1/searchx`、`/v1/semantic-search`）。它与 `causalai.me:8100` 的 MCP 端点是**两条独立通道**，互不依赖。

***
## 🤖 为什么用它

把竞争情报做进 agent 通常意味着：自己接 HTTP、做字段映射、去重、统计、缓存、调度、安全审查，再自造一套报告样式 —— 每个信源、每个产品都要重来一遍。

`dsh-plugin-market-intelligence` 把这些变成**一次安装 + 一套契约**：

| 维度 | 手工集成 | 用本插件 |
| --- | --- | --- |
| **首个可用分析** | 数天（后端 + 前端 + 胶水） | 一次 `dsh plugin add` |
| **数据可信度** | 自行判断来源真伪 | 每条情报自带 T-Score + ABCD 分级，可溯源 |
| **检索能力** | 自建搜索与过滤 | 类 Google 查询语法 + 两阶段可信检索 + CVC 语义检索 |
| **报告交付** | 自己写模板与图表 | 内置 CaSee 深色看板规范（appbar/封面/目录/编号章节/ECharts/来源附录） |
| **幻觉风险** | 全靠提示词自律 | 工具层 + 人格层双重「零编造」约束 |

> **核心价值**：市场情报能力变成**可安装、可配置、可复现**的 Harness 能力，且报告规范与 CaSee 官方报告同款。

***
## 🚀 快速开始

### 前置条件

- **Node.js ≥ 22.19**（DSH 运行时要求）
- **DeepSeek Harness `dsh` ≥ 0.1.0-rc.6**（`dsh --version` 可查）
- **CaSee API 密钥** —— 到 <https://casee.me> 免费注册后获取

### 第 1 步 —— 安装

```bash
# A. npm（推荐，包名即身份）
dsh plugin --profile web add dsh-plugin-market-intelligence

# B. GitHub 仓库
dsh plugin --profile web add github:xcasee/dsh-plugin-market-intelligence

# C. tarball（离线 / 评审分发）
dsh plugin --profile web add ./dsh-plugin-market-intelligence-1.0.0.tgz
```

重启 `dsh web`。

### 第 2 步 —— 确认插件层已生效

```bash
dsh --profile web --dump-config | grep -A6 market-intelligence
```

应能看到：

```
# == dsh-plugin-market-intelligence
- id: market-intelligence
  name: dsh-plugin-market-intelligence
  config:
    apiBaseUrl: http://121.43.113.132:8000
    ...
```

### 第 3 步 —— 配置 API 密钥

密钥**只从环境变量读取，绝不写入配置文件**：

```bash
export CASEE_API_KEY=<你的密钥>
```

然后**新开一个对话**（工具绑定发生在会话创建时）。

### 第 4 步 —— 直接提问

```
追踪比亚迪最近 30 天在新能源汽车领域的竞争动态
分析近 90 天 AI 芯片行业趋势，只看 T-Score 0.8 以上的信源
调研中国人形机器人行星滚柱丝杠的市场规模、格局与进入机会
```

***
## ⚙️ 配置

在 profile 的 `cordis.patch.yml`（`$DSH_HOME/profiles/<name>/cordis.patch.yml`）按 `id` 覆盖。**补丁整块替换 `config`，需重述全部要保留的键**：

```yaml
- id: market-intelligence
  config:
    apiBaseUrl: 'http://121.43.113.132:8000'
    apiKeyEnv: CASEE_API_KEY
    defaultDays: 30
    defaultMinTscore: 0.6
    maxLimit: 200
    timeoutMs: 30000
    requestIntervalMs: 200
    registerSkill: true
    registerPrompt: true
    platformUrl: 'https://casee.me'
    outputLanguage: auto
```

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `apiBaseUrl` | `http://121.43.113.132:8000` | CaSee REST 基地址（**非** 8100 MCP 端口） |
| `apiKeyEnv` | `CASEE_API_KEY` | 读取密钥的环境变量名 |
| `defaultDays` | `30` | 默认时间窗口（天） |
| `defaultMinTscore` | `0.6` | 默认可信度门槛 |
| `maxLimit` | `200` | 单次请求条数上限 |
| `timeoutMs` | `30000` | 单请求超时（毫秒） |
| `requestIntervalMs` | `200` | 出站请求最小间隔（毫秒），`0` 关闭限速 |
| `registerSkill` | `true` | 是否注册内置技能 |
| `registerPrompt` | `true` | 是否注册专家人格段落 |
| `platformUrl` | `https://casee.me` | 报告 CTA 与取密钥引导链接 |
| `outputLanguage` | `auto` | 报告语言：`auto`（跟随用户）/`zh`/`en` |

***
## 💬 使用

### 六个情报工具

| 工具 | 用途 | 关键参数 |
| --- | --- | --- |
| `find_trusted_sources` | 按类别/地区/语言/可信度发现可信信源 | `category`、`min_tscore`、`limit` |
| `search_intelligence` | 在可信信源子集内做类 Google 语法检索（主力） | `q`、`source_ids`、`days`、`min_tscore` |
| `analyze_trend` | 按日/月聚合声量，找峰值与催化点 | `q`、`days` |
| `aggregate_by_source` | 按信源统计报道量、平均可信度与样例标题 | `q`、`days` |
| `search_with_cvc` | 检索并把命中归集到 CVC 向量模型 | `q`、`cvc_model_id` |
| `semantic_search` | CVC 语义检索（BM25 + 向量 + RRF，跨语种） | `cvc_model_id`、`q`、`mode` |

### 查询语法（`q`）

| 运算符 | 含义 | 示例 |
| --- | --- | --- |
| `+word` | AND | `+AI +芯片` |
| `-word` | NOT | `+电动车 -自行车` |
| `a\|b` | 同义 OR | `电动车\|EV\|NEV` |
| `"phrase"` | 精确短语 | `"market share"` |
| `(...)` | 分组 | `+(特斯拉\|Tesla) +(交付\|销量)` |

中文关键词由平台自动翻译为英文检索，返回 `translated_keywords` 供核对。

### 输出契约

每次分析**同时**产出两部分，不可二选一：

1. **对话内 Markdown 摘要** —— 一句话结论 + 3–5 条关键发现（每条附 T-Score + 信源名 + 日期 + 可点链接）
2. **完整 HTML 报告文件** —— CaSee 深色看板：appbar → 封面（4 指标卡）→ 吸顶目录 → 00 结论先行 → 编号章节（含 ECharts 图表 / SWOT / 时间线 / 矩阵）→ 来源附录（编号来源 + T-Score 徽章）

***
## 🛡 T-Score 可信度体系

| T-Score | 等级 | 标识 | 使用纪律 |
| --- | --- | --- | --- |
| ≥ 0.8 | A | 🟢 | 可直接作为决策依据 |
| 0.6–0.8 | B | 🟡 | 结合上下文使用 |
| 0.4–0.6 | C | 🔴 | 信号参考，必须交叉验证 |
| < 0.4 | D | ⚪ | 视为传言，不作事实陈述 |

**ABCD 信源分级**：A=通讯社/官方；B=主流权威；C=垂直媒体/博客；D=UGC/论坛。

***
## 🧩 工程结构

```
dsh-plugin-market-intelligence/
├── package.json                    # dsh.bundle 清单 + 依赖 + 脚本
├── cordis.patch.yml                # bundle 补丁层（插入 market-intelligence 行）
├── tsconfig.json
├── src/
│   ├── index.ts                    # 插件入口：name / inject / Config / apply
│   ├── config.ts                   # Schemastery 配置 schema
│   ├── casee-client.ts             # CaSee REST 客户端（归一化 + 限速 + 超时 + 错误码）
│   ├── errors.ts                   # 结构化错误
│   ├── types.ts                    # 规范返回值类型
│   ├── prompt.ts                   # 专家人格 system-prompt 段落
│   ├── skill.ts                    # 运行时技能注册
│   └── tools/                      # 6 个工具 + 共享 schema/渲染
├── assets/skills/market-intelligence/
│   ├── SKILL.md                    # 技能正文
│   └── analysis/                   # 核心流程 / 检索策略 / 市场工作流 / 报告模板 / 报告样式规范
├── tests/                          # 仿真测试（mock REST + 全流程 + 报告断言）
└── .github/workflows/publish.yml   # tag 触发的自动发布
```

### 开发命令

```bash
npm install          # 构建依赖（@deepseek-ai/* 为 optional peer + devDependency）
npm run typecheck    # 类型检查
npm run build        # 产出 lib/
npm test             # 仿真测试：装载冒烟 + mock CaSee REST 全流程 + 报告断言
npm pack             # 产出 dsh-plugin-market-intelligence-1.0.0.tgz
```

`npm test` 会启动进程内 mock CaSee REST 服务，用**真实插件代码**跑完整流水线，校验 6 个工具、正/负路径（`AUTH_REQUIRED` / `INVALID_ARGUMENT` / `HTTP_ERROR`）、方法学结论（Niche Go / Watch / No-Go 与否决闸门）与报告产物。产物落在 `tests/output/`。

***
## 🩺 排错

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `AUTH_REQUIRED` | 未配置或密钥无效 | 到 <https://casee.me> 取密钥，`export CASEE_API_KEY=...` 后**新开对话** |
| `NETWORK_ERROR` / `TIMEOUT` | 端点不通或过慢 | 核对 `apiBaseUrl` 与出站网络；必要时调大 `timeoutMs` |
| `RATE_LIMITED` | 调用过快 | 降低并发（≤100 次/分钟）或调大 `requestIntervalMs` |
| `INVALID_ARGUMENT` | `cvc_model_id` 不合规 | 使用 `^cvc_[a-z0-9]{8,32}$`，如 `cvc_battery_anxiety` |
| 工具未出现 | 未装插件 / 未重启 | `dsh --profile web --dump-config` 确认层，重启 `dsh web` |

***
## 📦 发布

```bash
npm version patch
git tag v1.0.1 && git push origin v1.0.1   # 触发 .github/workflows/publish.yml
```

CI 需要仓库 Secret `NPM_TOKEN`（npm **Automation** token）。仅预演可手动运行 workflow 且不勾选 publish。

***
## 📄 许可与声明

MIT © CaSee Inc.

- 所有情报结论必须来自平台返回数据；工具层与专家人格均内置「零编造」约束
- 关键业务决策请在本平台数据之外独立验证
- 涉及个人隐私的数据不采集、不输出
- **试用 CaSee**：<https://casee.me>
