// -*- coding: utf-8 -*-
/**
 * Simulation fixtures — a fully synthetic intelligence corpus.
 *
 * Scenario: a precision-manufacturing company evaluates three humanoid-robot
 * related market tracks. The corpus is hand-labelled with evidence tags so the
 * methodology in `logic.mjs` is reproducible and auditable.
 *
 *   screw    行星滚柱丝杠（核心零部件）  → expected: Go
 *   humanoid 人形机器人整机              → expected: Watch
 *   emotion  校园情绪识别 AI（政策红线）  → expected: No-Go（否决闸门优先）
 *
 * Every company, figure, policy and quotation below is fabricated for logic
 * verification only. Nothing here is real market data.
 */

export const TODAY = '2026-10-13'
export const MAX_DAYS = 1825;
export const RATE_LIMIT_PER_MIN = 100;

export const SOURCES = [
  { source_id: 'cn-xinhua', name: '新华社', category: 'wire', region: 'china', language: 'zh', tier: 1, tscore: 0.88 },
  { source_id: 'cn-gov', name: '中国政府网·部委发布', category: 'wire', region: 'china', language: 'zh', tier: 1, tscore: 0.90 },
  { source_id: 'cn-stcn', name: '证券时报', category: 'mainstream', region: 'china', language: 'zh', tier: 1, tscore: 0.81 },
  { source_id: 'cn-cnstock', name: '上海证券报', category: 'mainstream', region: 'china', language: 'zh', tier: 1, tscore: 0.82 },
  { source_id: 'cn-ggii', name: '高工机器人（GGII）', category: 'market', region: 'china', language: 'zh', tier: 2, tscore: 0.72 },
  { source_id: 'cn-leiphone', name: '机器之心', category: 'tech', region: 'china', language: 'zh', tier: 2, tscore: 0.68 },
  { source_id: 'cn-36kr', name: '36氪', category: 'market', region: 'china', language: 'zh', tier: 2, tscore: 0.64 },
  { source_id: 'cn-elecfans', name: '电子发烧友', category: 'market', region: 'china', language: 'zh', tier: 2, tscore: 0.59 },
  { source_id: 'gl-reuters', name: 'Reuters Industries', category: 'wire', region: 'global', language: 'en', tier: 1, tscore: 0.86 },
  { source_id: 'gl-tcr', name: 'TechCrunch', category: 'tech', region: 'global', language: 'en', tier: 2, tscore: 0.70 },
  { source_id: 'cn-bbs', name: '机器人之家论坛', category: 'tech', region: 'china', language: 'zh', tier: 3, tscore: 0.43 },
  { source_id: 'cn-invest', name: '某投资社区 UGC', category: 'ai', region: 'china', language: 'zh', tier: 3, tscore: 0.35 },
];

export const SOURCE_BY_ID = new Map(SOURCES.map((s) => [s.source_id, s]));

/** [no, track, source_id, date, title, summary, tags, tscore?] */
const RAW_ITEMS = [
  // ===== 赛道一：行星滚柱丝杠（核心零部件，预期 Go） =====
  ['screw', 'cn-ggii', '2026-08-20', 'GGII：2025 年中国人形机器人行星滚柱丝杠市场规模约 28 亿元',
    '高工产研测算，2025 年中国人形机器人行星滚柱丝杠市场规模约 28 亿元，同比增长约 45%，随人形机器人量产临近，精密传动部件需求快速放大。',
    ['market_size', 'figure', 'growth']],
  ['screw', 'cn-stcn', '2026-07-15', '行星滚柱丝杠赛道升温：市场规模约 26–30 亿元，未来三年 CAGR 约 40%',
    '多家券商与行研口径显示，2025 年国内行星滚柱丝杠市场规模约 26–30 亿元，2026 年有望突破 40 亿元，未来三年 CAGR 约 40%，机器人与高端机床双轮驱动。',
    ['market_size', 'figure', 'growth', 'cagr']],
  ['screw', 'cn-elecfans', '2026-05-09', '全球行星滚柱丝杠市场约 9 亿美元，机器人应用占比提升',
    '海外行研估算 2025 年全球行星滚柱丝杠市场约 9 亿美元，过去主要用于航空与机床，人形机器人成为增长最快的新应用，行业增速预测普遍高于 20%。',
    ['market_size', 'figure', 'growth']],
  ['screw', 'cn-gov', '2026-03-21', '工信部等印发人形机器人创新发展指导意见，核心零部件攻关获首台套补贴',
    '文件提出重点突破行星滚柱丝杠、高精度减速器等核心部件，对首台套示范应用给予补贴，明确到 2027 年关键部件供给保障能力显著增强，政策鼓励信号明确。',
    ['policy_support', 'green', 'subsidy', 'catalyst']],
  ['screw', 'cn-gov', '2026-02-11', '行星滚柱丝杠国家标准立项，精度分级与检测方法将统一',
    '全国轴标委立项行星滚柱丝杠国家标准，明确精度分级与寿命检测方法，标准预计 2027 年发布，技术体系进入收敛期，利好具备工艺积累的厂商。',
    ['standard', 'catalyst', 'policy_support']],
  ['screw', 'cn-ggii', '2026-09-02', '高精度丝杠供给紧张：国内具备批量能力的企业不足 10 家',
    'GGII 调研显示 C3/C5 级高精度行星滚柱丝杠供给紧张，国内具备稳定批量能力的企业不足 10 家，头部整机厂交期普遍超过 6 个月，磨削设备与熟练工艺人才构成稀缺壁垒。',
    ['scarcity', 'capacity', 'unmet_need', 'barrier_ip', 'barrier_scale']],
  ['screw', 'cn-cnstock', '2026-06-18', '丝杠国产化率快速提升：南京工艺份额约 12%，贝斯特份额约 9%，恒立液压份额约 7%',
    '报道口径下国内机器人丝杠市场，南京工艺份额约 12%，贝斯特份额约 9%，恒立液压份额约 7%；海外 Rollvis、Ewellix 等品牌在高端市场仍占约 60%，国产替代空间大（报道口径，非出货统计）。',
    ['share', 'rivalry']],
  ['screw', 'cn-36kr', '2026-04-08', '一颗丝杠的壁垒：精度、良率与重设备投入，客户验证超 18 个月',
    '业内访谈称行星滚柱丝杠螺纹磨削精度达微米级，良率爬坡缓慢，专用设备投资重，进入整机厂供应链需经过 18 个月以上台架与小批量验证，新玩家短期难以放量。',
    ['barrier_ip', 'barrier_cert', 'barrier_capital']],
  ['screw', 'cn-leiphone', '2026-08-28', '整机厂加速丝杠二供导入，国产替代订单放量',
    '多家头部人形机器人企业开放丝杠第二供应商认证，国产替代需求强烈，部分精密厂商已获亿元级定点订单；整机厂在认证与定价上处于强势地位。',
    ['demand', 'order', 'buyer_power', 'unmet_need']],
  ['screw', 'cn-stcn', '2026-07-25', '高端丝杠毛利率维持 35%–45%，供不应求阶段暂无价格战',
    '上市公司交流纪要显示高端行星滚柱丝杠毛利率维持在 35%–45%，当前供给紧张、订单排产至年底，行业未出现价格战，利润格局健康。',
    ['margin']],
  ['screw', 'gl-reuters', '2026-05-30', 'Global high-precision roller screw supply concentrated, lead times stretch',
    'Rollvis, Ewellix and a handful of specialists dominate high-precision roller screw supply. Lead times have stretched through 2026 as robot makers rush to qualify second sources, highlighting upstream supplier power.',
    ['supplier_power', 'scarcity']],
  ['screw', 'cn-ggii', '2026-08-30', '某国产丝杠厂商完成超亿元融资，扩建磨削产线',
    '一家国内行星滚柱丝杠初创企业宣布完成超亿元 A+ 轮融资，资金主要用于磨削产线扩建与良率攻关，资本开始关注核心零部件国产替代窗口。',
    ['funding', 'capacity']],
  ['screw', 'cn-36kr', '2026-06-05', '某精密制造企业跨界加码丝杠，引入机床行业人才',
    '一家传统精密机床零部件企业宣布融资加码机器人丝杠业务，从机床领域平移工艺与客户资源，属于具备产业基础的潜在进入者。',
    ['funding', 'new_entrant']],
  ['screw', 'cn-ggii', '2026-09-20', '丝杠赛道玩家扩容：三家小批量供货，多家上市公司宣布入局',
    '目前约三家国内厂商实现小批量供货，另有十余家上市公司或初创宣布布局，竞争开始升温但尚未形成稳定格局。',
    ['player_leader', 'new_entrant', 'rivalry']],
  ['screw', 'cn-bbs', '2026-09-05', '论坛求购：高精度丝杠交期太长，有人知道替代渠道吗',
    '论坛中出现大量整机与自动化设备厂商求购高精度行星滚柱丝杠的帖子，抱怨交期长、最小起订量高，从需求侧印证供给紧张（UGC，仅作线索）。',
    ['demand', 'weak_signal']],

  // ===== 赛道二：人形机器人整机（过热高壁垒，预期 Watch） =====
  ['humanoid', 'cn-ggii', '2026-08-15', 'GGII：2026 年中国人形机器人出货预计 1.2 万台，市场规模约 60 亿元',
    '高工产研预计 2026 年中国人形机器人出货量约 1.2 万台，同比增长约 250%，对应市场规模约 60 亿元，但绝对规模仍小，主要集中在示范与巡检场景。',
    ['market_size', 'figure', 'growth']],
  ['humanoid', 'gl-reuters', '2026-07-08', 'Humanoid robot forecasts surge as Tesla targets Optimus mass production',
    'Multiple consultancies raised humanoid robot forecasts, citing Tesla Optimus production targets and Chinese makers rapid iteration. Estimates vary widely, and analysts caution that commercial demand remains unproven.',
    ['growth', 'figure']],
  ['humanoid', 'cn-gov', '2026-01-19', '人形机器人创新发展指导意见发布：2025 年试点、2027 年批量生产',
    '政策目标为 2025 年实现创新引领、整机产品达到国际先进水平并批量生产，鼓励地方建设创新示范区与开放应用场景，政策整体友好。',
    ['policy_support', 'green', 'catalyst']],
  ['humanoid', 'cn-leiphone', '2026-09-10', '盘点 50+ 人形机器人整机企业：特斯拉、宇树、智元、Figure 处于第一梯队',
    '国内进入人形机器人整机赛道的企业已超过 50 家，第一梯队包括特斯拉、宇树科技、智元机器人、Figure AI 等，产品同质化与演示场景扎堆现象明显。',
    ['rivalry', 'player_leader', 'player_challenger']],
  ['humanoid', 'cn-36kr', '2026-09-01', '人形机器人意向订单报道口径：宇树科技份额约 22%，特斯拉份额约 19%',
    '据公开报道与招投标信息的不完全统计，宇树科技份额约 22%，特斯拉份额约 19%，智元机器人份额约 14%，Figure AI 份额约 11%，优必选份额约 8%（报道口径，非出货统计）。',
    ['share', 'rivalry']],
  ['humanoid', 'gl-tcr', '2026-08-22', 'Figure AI closes new funding round at multi-billion valuation',
    'Figure AI closed another large funding round at a multi-billion-dollar valuation as investors pile into humanoid robotics, adding to concerns about overheating.',
    ['funding', 'player_challenger']],
  ['humanoid', 'cn-36kr', '2026-07-12', '智元、星动纪元、银河通用等 6 家近月连续融资，资本持续涌入',
    '近三个月智元机器人、星动纪元、银河通用等约 6 家整机企业宣布新一轮融资，单季度融资事件密度创历史新高，赛道呈现明显升温乃至过热迹象。',
    ['funding', 'overheat']],
  ['humanoid', 'cn-cnstock', '2026-06-30', '优必选定增加码人形机器人，宣布工业巡检商业订单',
    '优必选公告定增加码人形机器人研发与产能，并披露工业巡检类商业订单，上市公司通过资本市场持续补充资金。',
    ['funding']],
  ['humanoid', 'cn-leiphone', '2026-05-20', '星动纪元完成新一轮融资，星海图等加快全尺寸样机迭代',
    '星动纪元宣布完成新一轮融资，星海图、众擎等多家初创同步发布全尺寸样机，资本与样机发布相互推动。',
    ['funding']],
  ['humanoid', 'gl-tcr', '2026-03-15', 'Apptronik raises fresh capital as US humanoid race intensifies',
    'Apptronik raised fresh capital from strategic industrial investors, while other US startups expand teams ahead of anticipated factory deployments.',
    ['funding']],
  ['humanoid', 'cn-stcn', '2026-09-08', '示范项目报价下探：部分人形机器人厂商以接近成本价竞标',
    '地方示范项目招标中，整机报价持续下探，部分厂商以接近成本价抢单，客户压价明显，价格战苗头出现，行业利润前景承压。',
    ['price_war', 'rivalry', 'margin', 'buyer_power']],
  ['humanoid', 'gl-reuters', '2026-06-10', 'Humanoid robots carry high barriers: integrated AI, supply chain and capital',
    'Analysts point to exceptionally high barriers in whole-humanoid robots: integrated AI stack, actuator supply chains, scale manufacturing, ecosystem lock-in and enormous capital needs.',
    ['barrier_capital', 'barrier_scale', 'barrier_ip', 'barrier_switching']],
  ['humanoid', 'cn-cnstock', '2026-05-26', '商业化仍以演示与巡检为主，规模买单不足',
    '调研显示当前人形机器人交付集中在展会演示、科研与巡检试点，愿意规模采购的客户有限，真正的工业量产场景尚未跑通，需求端仍需验证。',
    ['demand']],
  ['humanoid', 'cn-leiphone', '2026-04-14', '路线之争：液压与丝杠、轮式与双足，技术路径尚未收敛',
    '行业在驱动方式（液压/电驱丝杠）与移动形态（轮式/双足）上仍存分歧，技术路线未收敛构成替代不确定性，也可能摊薄单一方向投入。',
    ['substitution']],
  ['humanoid', 'cn-ggii', '2026-03-08', '丝杠与减速器供给瓶颈制约整机交付节奏',
    'GGII 指出高精度丝杠、减速器等核心部件供给紧张，是制约 2026 年整机批量交付的关键因素，上游议价能力强于整机环节。',
    ['supplier_power', 'scarcity']],
  ['humanoid', 'cn-36kr', '2026-02-20', '头部厂商大举招聘、建设产线，潜在进入者持续增加',
    '头部人形机器人企业春节后启动大规模招聘并建设自有产线，汽车与消费电子代工厂也宣布跨界，潜在进入者众多。',
    ['player_leader', 'new_entrant']],
  ['humanoid', 'cn-invest', '2026-09-12', '社区争论：人形机器人估值是否泡沫化、产品同质化',
    '投资社区出现大量关于人形机器人估值泡沫、演示视频同质化、落地场景模糊的讨论（UGC，仅作情绪线索）。',
    ['bubble', 'risk', 'weak_signal']],

  // ===== 赛道三：校园情绪识别 AI（政策红线，预期 No-Go） =====
  ['emotion', 'cn-elecfans', '2026-03-10', '多家 AI 厂商推出校园情绪识别系统，部分地区试点',
    '部分 AI 公司推出基于摄像头的课堂情绪识别系统，在少数地区学校试点，用于课堂专注度分析，行业一度吸引教育信息化厂商进入。',
    ['demand']],
  ['emotion', 'cn-36kr', '2025-11-12', '2025 年情绪识别教育应用快速增长，企业争相布局',
    '2025 年情绪识别在教育场景的应用曾被视为 AI+教育热点，多家企业宣布相关产品与合作，市场预期一度乐观。',
    ['growth', 'market_size']],
  ['emotion', 'cn-gov', '2026-08-05', '教育部：禁止课堂采集学生情绪、禁止人脸识别用于教学评价',
    '教育部明确规定，不得将人脸识别、情绪识别等技术用于课堂教学行为分析与学生评价，已部署的要求清理，校园情绪识别应用遭遇明确监管禁令。',
    ['policy_redline', 'veto']],
  ['emotion', 'cn-xinhua', '2026-08-07', '多地落实教育领域个人信息保护执法，情绪识别系统被要求停用',
    '新华社报道多地依据个人信息保护法开展教育领域执法，要求停用并拆除课堂情绪识别、注意力分析类系统，政策红线在全国范围执行。',
    ['policy_redline', 'veto']],
  ['emotion', 'cn-stcn', '2026-09-09', '校园项目终止、招标撤回，相关厂商收入预期下修',
    '新规落地后多地学校终止情绪识别采购合同、撤回招标，客户集中压价后直接退出，相关上市公司下修该业务收入预期。',
    ['demand', 'buyer_power']],
  ['emotion', 'gl-reuters', '2026-06-18', 'European regulators scrutinise classroom emotion-recognition AI',
    'European data-protection regulators signaled strict scrutiny of emotion recognition in schools under GDPR, suggesting limited overseas routes for the technology.',
    ['policy_redline', 'yellow']],
  ['emotion', 'cn-36kr', '2026-07-22', '情绪识别厂商转型：转向工业质检与医疗辅助',
    '部分原教育情绪识别企业宣布转型，将视觉与情绪计算技术迁移到工业质检、医疗辅助等合规场景，原有校园赛道实质收缩。',
    ['player_niche']],
  ['emotion', 'cn-bbs', '2026-09-01', '家长担忧：不希望孩子被摄像头分析情绪',
    '论坛与社交平台上大量家长表达对课堂情绪识别的抵触，担忧隐私与标签化（UGC，仅作线索）。',
    ['weak_signal', 'risk']],
];

export const TRACKS = ['screw', 'humanoid', 'emotion'];

export const TRACK_META = {
  screw: { cn: '人形机器人行星滚柱丝杠', kw: '丝杠|精密传动' },
  humanoid: { cn: '人形机器人整机', kw: '人形机器人|具身智能' },
  emotion: { cn: '校园情绪识别 AI', kw: '情绪识别|课堂' },
};

/** The full corpus with source metadata resolved. `track`/`tags` are the simulation labels. */
export const CORPUS = RAW_ITEMS.map(([track, source_id, date, title, summary, tags, tscore], index) => {
  const source = SOURCE_BY_ID.get(source_id);
  return {
    news_id: `sim-mk-${String(index + 1).padStart(3, '0')}`,
    track,
    title,
    summary,
    description: summary.slice(0, 160),
    source_id,
    source_name: source.name,
    tier: source.tier,
    published_at: `${date}T09:00:00+00:00`,
    tscore: tscore ?? source.tscore,
    url: `https://market-sim.example.cn/${track}/${String(index + 1).padStart(3, '0')}`,
    region: source.region,
    language: source.language,
    category: source.category,
    tags,
  };
});

/** Lookup one corpus record by its stable id. */
export const CORPUS_BY_ID = new Map(CORPUS.map((item) => [item.news_id, item]));
