/**
 * ============================================================
 *  KOL 合作管理平台 — 核心逻辑代码
 *  欧洲车企出海版 · v3.0
 *
 *  本文件包含：
 *  1. 数据结构定义
 *  2. 商业价值评分模型（7 个维度）
 *  3. 风险评分模型（8 个维度）
 *  4. 综合评级函数
 *  5. 本地数据管理（localStorage）
 *  6. 云端同步（Supabase）
 *  7. YouTube API 数据抓取
 * ============================================================
 */


/* ============================================================
   第一部分：数据结构
   ============================================================

   每个 KOL 在平台中是一个 JavaScript 对象，结构如下：

   {
     id:        "唯一 ID（时间戳 + 随机字符）",
     name:      "频道名称",
     handle:    "@handle",
     country:   "DE / GB / FR / MULTI",
     platform:  "YouTube / Instagram / TikTok",
     niche:     "review / ev / luxury / family / tech / lifestyle",
     followers: "486K",
     thumb:     "头像 URL（YouTube API 自动获取）",
     data:      { ...评分模型的原始输入字段 },  // 见下方输入字段说明
     cs:        82,          // 商业价值综合分（0-100）
     rs:        24,          // 风险综合分（0-100，越高风险越大）
     grade:     "A级",       // 商业价值评级
     rl:        "低风险",    // 风险等级
     csColor:   "#0D9488",   // 评级对应颜色
     rsColor:   "#047857",
     csClass:   "b-teal",    // CSS 样式类
     rsClass:   "b-green",
     flags:     [],          // 高风险预警项列表
     stage:     0,           // CLM 阶段（0-6）
     status:    "筛选中",
     addedAt:   "2026/7/16",
   }
*/


/* ============================================================
   第二部分：辅助函数
   ============================================================ */

/**
 * 将数值限制在 [min, max] 范围内
 * @example clamp(150, 0, 100) → 100
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 三档定性指标转分数
 * high → 90分，mid → 60分，low → 25分
 * 用于「评论质量」「专业可信度」等下拉选择型字段
 */
function qualScore(value) {
  return value === 'high' ? 90 : value === 'mid' ? 60 : 25;
}

/**
 * 计算某一层级的得分
 * @param {Array} indicators - 子指标数组，每项包含 score 和 weight
 * @returns {number} 0-100 的层级得分
 *
 * @example
 *   calcLayer([
 *     { name: '目标市场受众', score: 80, weight: 25 },
 *     { name: '语言能力',     score: 65, weight: 20 },
 *   ])
 *   → Math.round(80×0.25 + 65×0.20) = 33
 */
function calcLayer(indicators) {
  const total = indicators.reduce((sum, ind) => {
    return sum + ind.score * (ind.weight / 100);
  }, 0);
  return Math.round(total);
}


/* ============================================================
   第三部分：商业价值评分模型
   总分 = 七个维度的加权平均，总权重 = 100%
   ============================================================ */

/**
 * 七个维度的权重定义
 * 这里的 weight 就是权重百分比，七项加总 = 1.0（即100%）
 */
const COMMERCIAL_LAYERS = [
  { id: 'audience',   name: '受众匹配度',    color: '#2563EB', weight: 0.20 },
  { id: 'content',    name: '内容相关性',    color: '#059669', weight: 0.15 },
  { id: 'engage',     name: '互动质量',      color: '#7C3AED', weight: 0.15 },
  { id: 'voc',        name: 'VOC反馈价值',   color: '#DC2626', weight: 0.15 },
  { id: 'commercial', name: '商业效率',      color: '#D97706', weight: 0.15 },
  { id: 'brand',      name: '品牌适配度',    color: '#DB2777', weight: 0.10 },
  { id: 'exec',       name: '合作可执行性',  color: '#0891B2', weight: 0.10 },
];

// ------------------------------------------------------------------
// 维度一：受众匹配度（权重 20%）
// 评估 KOL 的粉丝群体是否与欧洲汽车购车人群高度重合
// ------------------------------------------------------------------
function scoreAudience(d) {
  // 子指标1：目标市场（英/法/德）受众占比（子权重 25%）
  //   直接用输入的百分比作为分数，0-100
  const geoScore = clamp(d.geo || 0, 0, 100);

  // 子指标2：目标语言内容能力（子权重 20%）
  //   三语（EN/FR/DE）= 100分；双语 = 65分；单语 = 30分
  const langScore = d.lang == 3 ? 100 : d.lang == 2 ? 65 : 30;

  // 子指标3：汽车/EV 兴趣受众占比（子权重 20%）
  //   通过第三方工具（HypeAuditor等）获取；无数据时默认填 50
  const autoIntScore = clamp(d.autoInterest || 50, 0, 100);

  // 子指标4：潜在购车人群覆盖（子权重 20%）
  //   = 收入水平分 × 50% + 25-55岁受众比例 × 50%
  const incomeScore = d.income === 'high' ? 95 : d.income === 'mid' ? 65 : 35;
  const ageScore    = clamp(d.age || 0, 0, 100);
  const buyerScore  = Math.round(incomeScore * 0.5 + ageScore * 0.5);

  // 子指标5：车型目标人群匹配度（子权重 15%）
  //   用地理覆盖和汽车兴趣的均值估算
  const targetScore = Math.round((geoScore + autoIntScore) / 2);

  // 层级得分 = 各子指标 × 子权重 加总
  const indicators = [
    { name: '目标市场受众覆盖', score: Math.round(geoScore),    weight: 25 },
    { name: '目标语言内容能力', score: langScore,               weight: 20 },
    { name: '汽车/EV兴趣受众', score: Math.round(autoIntScore), weight: 20 },
    { name: '潜在购车人群覆盖', score: buyerScore,              weight: 20 },
    { name: '车型目标人群匹配', score: Math.round(targetScore), weight: 15 },
  ];

  return { layerScore: calcLayer(indicators), indicators };
}

// ------------------------------------------------------------------
// 维度二：内容相关性与专业度（权重 15%）
// 评估是否持续生产高质量汽车内容，在粉丝中的专业可信度
// ------------------------------------------------------------------
function scoreContent(d) {
  // 子指标1：汽车/EV 内容专注度（子权重 35%）
  //   汽车相关内容占总内容的比例，直接输入百分比
  const focusScore = clamp(d.focus || 0, 0, 100);

  // 子指标2：测评深度（子权重 35%）
  //   深度（含技术参数/驾驶感受）= 95分
  //   中度（常规介绍+体验）= 65分
  //   浅度（外观展示/开箱）= 30分
  const depthScore = d.depth === 'deep' ? 95 : d.depth === 'mid' ? 65 : 30;

  // 子指标3：专业可信度（子权重 30%）
  //   有媒体背景/行业认证 = 90；一般专业性 = 60；无专业背书 = 25
  const credScore = qualScore(d.credibility);

  const indicators = [
    { name: '汽车/EV内容专注度', score: Math.round(focusScore), weight: 35 },
    { name: '测评深度',          score: depthScore,             weight: 35 },
    { name: '专业可信度',        score: credScore,              weight: 30 },
  ];

  return { layerScore: calcLayer(indicators), indicators };
}

// ------------------------------------------------------------------
// 维度三：互动质量（权重 15%）
// 不只看互动率数字，更关注互动的真实性与内容深度
// ------------------------------------------------------------------
function scoreEngagement(d) {
  // 子指标1：真实互动率 ERR（子权重 30%）
  //   公式：(点赞 + 评论) / 订阅数 × 100
  //   由 YouTube API 自动计算
  //   汽车垂类健康值 1.5-3%；以 3% 为满分基准，线性归一化
  const errScore = clamp(Math.round(((d.err || 0) / 3) * 100), 0, 100);

  // 子指标2：视频平均完播率（子权重 25%）
  //   以 60% 完播率为满分基准
  //   低于60%按比例折算；超过60%封顶100分
  const compScore = clamp(Math.round(((d.completion || 0) / 60) * 100), 0, 100);

  // 子指标3：评论质量与真实性（子权重 30%）
  //   人工评估：大量真实长评论/问题型评论 = 90；有一定真实讨论 = 60；以表情为主 = 25
  const commentScore = qualScore(d.commentQuality);

  // 子指标4：分享/收藏传播系数（子权重 15%）
  //   分享+收藏占总互动的比例；以 20% 为满分基准
  const shareScore = clamp(Math.round(((d.shareSave || 0) / 20) * 100), 0, 100);

  const indicators = [
    { name: '真实互动率 ERR',    score: errScore,     weight: 30 },
    { name: '视频完播率',        score: compScore,    weight: 25 },
    { name: '评论质量与真实性',  score: commentScore, weight: 30 },
    { name: '分享/收藏传播系数', score: shareScore,   weight: 15 },
  ];

  return { layerScore: calcLayer(indicators), indicators };
}

// ------------------------------------------------------------------
// 维度四：VOC 反馈价值（权重 15%）★ 欧洲车企专项指标
// VOC = Voice of Customer（用户之声）
// 评估评论区能否产生对车企有战略价值的用户反馈：
// 续航里程体验、充电便利性、保险费用、经销商服务、品牌信任度等
// ------------------------------------------------------------------
function scoreVOC(d) {
  // 子指标1：评论区汽车话题深度（子权重 40%）
  //   有大量续航/充电/价格/经销商讨论 = 90
  //   偶有实质汽车评论 = 60
  //   泛化互动（点赞/表情）为主 = 25
  const topicScore = qualScore(d.vocDepth);

  // 子指标2：负面 VOC 识别价值（子权重 30%）
  //   能捕获有价值的负面声音（充电桩不足、残值担忧等）= 90
  //   偶有可参考的负面声音 = 60
  //   无实质负面反馈 = 25
  const negScore = qualScore(d.vocNeg || 'mid');

  // 子指标3：历史车主反馈产出（子权重 30%）
  //   过往合作有完整 VOC 复盘记录 = 90
  //   部分内容有反馈 = 60
  //   暂无 = 20
  const histScore = d.vocHistory === 'yes' ? 90
                  : d.vocHistory === 'sometimes' ? 60 : 20;

  const indicators = [
    { name: '评论区汽车话题深度', score: topicScore, weight: 40 },
    { name: '负面VOC识别价值',    score: negScore,   weight: 30 },
    { name: '历史车主反馈产出',   score: histScore,  weight: 30 },
  ];

  return { layerScore: calcLayer(indicators), indicators };
}

// ------------------------------------------------------------------
// 维度五：商业效率（权重 15%）
// 评估合作性价比：报价合理性、内容版权条款、排他要求
// ------------------------------------------------------------------
function scoreCommercial(d) {
  // 子指标1：CPM/报价性价比（子权重 40%）
  //   CPM = 每千次有效曝光的成本（Cost Per Mille）
  //   计算逻辑：将实际 CPM 与行业基准 CPM 比较
  //     比率 ≤ 0.8（低于基准20%以上）= 100分（超高性价比）
  //     比率 = 1.0（等于基准）        ≈ 70分
  //     比率 ≥ 1.5（高于基准50%以上）= 20分（性价比差）
  const benchCpm = parseFloat(d.benchCpm) || 20; // 默认行业基准 €20/千次
  const cpm      = parseFloat(d.cpm) || benchCpm;
  const ratio    = cpm / benchCpm;
  let cpmScore;
  if      (ratio <= 0.8) cpmScore = 100;
  else if (ratio <= 1.0) cpmScore = Math.round(100 - (ratio - 0.8) * 150);
  else if (ratio <= 1.5) cpmScore = Math.round(70  - (ratio - 1.0) * 80);
  else                   cpmScore = 20;
  cpmScore = clamp(cpmScore, 0, 100);

  // 子指标2：内容二次复用权（子权重 35%）
  //   全权复用（无期限/无限场景）= 95
  //   限制复用（有期限或场景限制）= 60
  //   不允许复用 = 20
  const reuseScore = d.reuse === 'full'    ? 95
                   : d.reuse === 'limited' ? 60 : 20;

  // 子指标3：排他要求合理性（子权重 25%）
  //   无排他 = 90（最理想）
  //   软排他（仅同类品牌不能合作）= 65
  //   强排他（全品类不能合作）= 25（成本最高）
  const exclScore = d.exclusive === 'none' ? 90
                  : d.exclusive === 'soft' ? 65 : 25;

  const indicators = [
    { name: 'CPM/报价性价比',  score: cpmScore,   weight: 40 },
    { name: '内容二次复用权',  score: reuseScore, weight: 35 },
    { name: '排他要求合理性',  score: exclScore,  weight: 25 },
  ];

  return { layerScore: calcLayer(indicators), indicators };
}

// ------------------------------------------------------------------
// 维度六：品牌适配度（权重 10%）
// 评估 KOL 的个人形象与人设是否符合目标车企品牌定位
// （技术型 / 家庭型 / 高端型 / 年轻化）
// ------------------------------------------------------------------
function scoreBrandFit(d) {
  // 子指标1：品牌调性匹配度（子权重 50%）
  //   人设与目标品牌高度一致 = 90；中性通用 = 65；调性相悖 = 20
  const toneScore = d.brandTone === 'match'    ? 90
                  : d.brandTone === 'neutral'  ? 65 : 20;

  // 子指标2：历史合作品牌调性（子权重 30%）
  //   以同级别/同类品牌为主 = 90；品类混合 = 65；以冲突品牌为主 = 20
  const histToneScore = d.histTone === 'match'   ? 90
                      : d.histTone === 'neutral' ? 65 : 20;

  // 子指标3：内容风格一致性（子权重 20%）
  //   长期稳定的内容调性 = 90；有一定波动 = 60；风格多变 = 25
  const styleScore = qualScore(d.styleConsist);

  const indicators = [
    { name: '品牌调性匹配度',   score: toneScore,     weight: 50 },
    { name: '历史合作品牌调性', score: histToneScore, weight: 30 },
    { name: '内容风格一致性',   score: styleScore,    weight: 20 },
  ];

  return { layerScore: calcLayer(indicators), indicators };
}

// ------------------------------------------------------------------
// 维度七：合作可执行性（权重 10%）
// 评估 KOL 的历史执行能力，预判本次合作的顺畅度
// ------------------------------------------------------------------
function scoreExec(d) {
  // 子指标1：历史履约率（子权重 35%）
  //   = 按时交付次数 / 总合作次数 × 100
  //   直接输入百分比；无历史记录时默认 80
  const fulfillScore = clamp(d.fulfill || 80, 0, 100);

  // 子指标2：Brief 配合意愿（子权重 25%）
  //   主动配合修改、接受内容审核 = 90；基本配合 = 60；排斥修改 = 25
  const briefScore = qualScore(d.briefCoop);

  // 子指标3：复盘数据提供意愿（子权重 25%）
  //   主动提供完整数据 = 90；需要索取，被动提供 = 60；拒绝提供 = 15
  const dataScore = d.dataReady === 'active'  ? 90
                  : d.dataReady === 'passive' ? 60 : 15;

  // 子指标4：合同签约灵活度（子权重 15%）
  //   愿意协商条款 = 90；接受标准条款 = 65；坚持己方 = 25
  const contractScore = d.contractFlex === 'flexible' ? 90
                      : d.contractFlex === 'normal'   ? 65 : 25;

  const indicators = [
    { name: '历史履约率',       score: Math.round(fulfillScore), weight: 35 },
    { name: 'Brief配合意愿',    score: briefScore,               weight: 25 },
    { name: '复盘数据提供意愿', score: dataScore,                weight: 25 },
    { name: '合同签约灵活度',   score: contractScore,            weight: 15 },
  ];

  return { layerScore: calcLayer(indicators), indicators };
}

// ------------------------------------------------------------------
// 商业价值总分计算入口
// 输入：KOL 的原始数据对象 d
// 输出：{ total, layerScores, inds }
// ------------------------------------------------------------------
function calcCommercial(d) {
  const audience   = scoreAudience(d);
  const content    = scoreContent(d);
  const engage     = scoreEngagement(d);
  const voc        = scoreVOC(d);
  const commercial = scoreCommercial(d);
  const brand      = scoreBrandFit(d);
  const exec       = scoreExec(d);

  const layerResults = [audience, content, engage, voc, commercial, brand, exec];
  const layerScores  = layerResults.map(r => r.layerScore);

  // 最终总分 = Σ（层级得分 × 层级权重）
  const total = Math.round(
    layerScores.reduce((sum, score, i) => sum + score * COMMERCIAL_LAYERS[i].weight, 0)
  );

  return {
    total,
    layerScores,
    inds: layerResults.map(r => r.indicators),
  };
}


/* ============================================================
   第四部分：风险评分模型
   分数越高 = 风险越大（与商业价值模型方向相反）
   0-30 = 低风险；31-60 = 中风险；61-100 = 高风险
   ============================================================ */

/**
 * 八个风险维度的权重
 * 同样加总 = 1.0
 */
const RISK_LAYERS = [
  { name: '历史负面舆情',    color: '#7F1D1D', weight: 0.20 },
  { name: '广告合规风险',    color: '#92400E', weight: 0.15 },
  { name: '竞品冲突',        color: '#1E3A8A', weight: 0.15 },
  { name: '虚假流量',        color: '#065F46', weight: 0.15 },
  { name: '数据与隐私',      color: '#4C1D95', weight: 0.10 },
  { name: '未成年人受众',    color: '#0369A1', weight: 0.10 },
  { name: '可持续/技术声明', color: '#14532D', weight: 0.10 },
  { name: '合作执行风险',    color: '#374151', weight: 0.05 },
];

/**
 * 风险选项映射函数
 * 不同的选项对应不同的风险分数
 * @param {string} value - 选项值
 * @param {Object} map   - 映射表
 */
function riskMap(value, map) {
  return map[value] !== undefined ? map[value] : 50;
}

/**
 * 风险总分计算入口
 * 输入：KOL 的原始数据对象 d
 * 输出：{ total, dimScores, flags }
 *   flags = 自动触发的高风险预警项列表
 */
function calcRisk(d) {
  const flags = []; // 高风险自动预警列表

  // ── 风险维度一：历史负面舆情（权重 20%）──
  // 核心观察点：不当言论、虚假宣传、司法处罚、平台封号

  const incidentScore = riskMap(d.incident, {
    none:     5,   // 无记录
    minor:    35,  // 轻微，已处理
    serious:  72,  // 严重，处理中
    critical: 100, // 极严重：司法/封号/重大公关危机 → 自动触发高风险
  });
  if (d.incident === 'critical') {
    flags.push('⚠ 存在极严重负面事件（司法处罚/平台封号），需法务和品牌负责人复核');
  }

  const falseadScore = riskMap(d.falsead, {
    none:    5,   // 无虚假宣传记录
    minor:   40,  // 有轻微投诉，已处理
    serious: 90,  // 有严重记录，监管介入 → 自动触发高风险
  });
  if (d.falsead === 'serious') {
    flags.push('⚠ 有严重虚假宣传记录，触发合规高风险');
  }

  const sentimentScore = riskMap(d.sentiment, {
    none:  0,  // 无负面舆情
    local: 30, // 局部小范围
    wide:  80, // 大范围传播
  });

  const dim1 = Math.round(
    incidentScore  * 0.40 +  // 重大事件权重最高
    falseadScore   * 0.35 +
    sentimentScore * 0.25
  );

  // ── 风险维度二：广告披露合规风险（权重 15%）──
  // 欧盟要求：所有付费内容必须标注 #ad / #Werbung / paid partnership

  const adlabelScore = riskMap(d.adlabel, {
    always:    5,  // 一贯规范标注
    sometimes: 45, // 偶尔遗漏
    never:     95, // 从不标注 → 自动触发高风险（违反欧盟广告法规）
  });
  if (d.adlabel === 'never') {
    flags.push('⚠ 拒绝广告披露标注，严重违反欧盟广告法规（ASA/ARPP/UWG）');
  }

  const penaltyScore = riskMap(d.penalty, {
    none:    5,  // 无处罚记录
    warning: 40, // 有警告记录
    penalty: 85, // 有正式处罚
  });

  const complianceScore = riskMap(d.compliance, {
    high: 5,  // 积极配合合规要求
    mid:  40, // 需要提醒
    low:  85, // 排斥合规要求
  });

  const dim2 = Math.round(
    adlabelScore   * 0.50 + // 标注习惯权重最高
    penaltyScore   * 0.30 +
    complianceScore * 0.20
  );

  // ── 风险维度三：竞品冲突（权重 15%）──
  // 竞品包括：Tesla、VW、BMW、Kia、Hyundai、Stellantis 等

  const competitorScore = riskMap(d.competitor, {
    none:          0,   // 无竞品合作
    nonexclusive: 30,   // 有非排他合作（可协商）
    exclusive:    70,   // 有排他合作 → 自动触发预警
    ambassador:   100,  // 品牌大使级深度绑定 → 自动触发高风险
  });
  if (d.competitor === 'ambassador') {
    flags.push('⚠ 当前为直接竞品品牌大使，存在重大竞品冲突风险，建议直接排除');
  } else if (d.competitor === 'exclusive') {
    flags.push('⚠ 当前有竞品排他合作，需确认排他条款范围后决策');
  }

  const compContentScore = clamp(
    Math.round(((d.compcontentpct || 0) / 50) * 100),  // 竞品内容超过50%=满分风险
    0, 100
  );

  const compLevelScore = riskMap(d.complevel, {
    none:     0,  // 无竞品
    indirect: 25, // 间接竞品（非汽车类）
    direct:   80, // 直接竞品（汽车品牌）
  });

  const dim3 = Math.round(
    competitorScore  * 0.50 +
    compContentScore * 0.25 +
    compLevelScore   * 0.25
  );

  // ── 风险维度四：虚假流量风险（权重 15%）──

  // 僵尸粉比例：分级阈值
  //   0-10%  = 正常（5分）
  //   10-20% = 偏高（30分）
  //   20-30% = 较高（55分）
  //   30-40% = 高（80分）→ 触发预警
  //   40%+   = 严重（100分）→ 触发高风险
  const fakePct  = Number(d.fakepct) || 0;
  const fakeScore = fakePct >= 40 ? 100
                  : fakePct >= 30 ? 80
                  : fakePct >= 20 ? 55
                  : fakePct >= 10 ? 30 : 5;
  if (fakePct >= 40) {
    flags.push(`⚠ 僵尸粉比例 ${fakePct}%，明显超过高风险阈值（40%），疑似刷量`);
  } else if (fakePct >= 30) {
    flags.push(`⚠ 僵尸粉比例 ${fakePct}%，超过预警阈值（30%），建议核查`);
  }

  const spikeScore = riskMap(d.spikegrowth, {
    none:     5,  // 无异常增长
    once:     50, // 有一次性暴涨
    multiple: 90, // 多次异常增长
  });

  const templateScore = riskMap(d.templatecomment, {
    normal: 5,  // 评论内容多样真实
    some:   45, // 偶有模板评论（少量）
    heavy:  90, // 大量模板化/机器人评论
  });

  const dim4 = Math.round(
    fakeScore    * 0.45 +
    spikeScore   * 0.30 +
    templateScore * 0.25
  );

  // ── 风险维度五：数据与隐私风险（权重 10%）──
  // 欧盟 GDPR（通用数据保护条例）在欧洲市场是强制性法规

  const gdprScore = riskMap(d.gdpr, {
    none:    5,  // 无违规记录
    minor:   40, // 有轻微违规，已整改
    serious: 95, // 有严重违规 → 自动触发高风险
  });
  if (d.gdpr === 'serious') {
    flags.push('⚠ 存在严重 GDPR 违规记录，欧洲市场合规风险极高，需法务审查');
  }

  const datauseScore = riskMap(d.datause, {
    compliant: 5,  // 规范，有清晰隐私政策
    unclear:   45, // 不明确
    violation: 90, // 有违规使用迹象
  });

  const dim5 = Math.round(gdprScore * 0.55 + datauseScore * 0.45);

  // ── 风险维度六：未成年人/敏感受众风险（权重 10%）──
  // 汽车广告不适合面向未成年人，超过30%需预警

  const minorPct  = Number(d.minorpct) || 0;
  const minorScore = minorPct >= 40 ? 90
                   : minorPct >= 30 ? 70  // 触发预警
                   : minorPct >= 20 ? 45
                   : minorPct >= 10 ? 20 : 5;
  if (minorPct >= 30) {
    flags.push(`⚠ 未成年受众占比 ${minorPct}%，超过预警阈值，汽车广告合规性存疑`);
  }

  const agesuitScore = riskMap(d.agesuit, {
    suitable:   5,  // 内容完全适合汽车广告受众
    partial:    45, // 部分内容存疑
    unsuitable: 85, // 有明显不适合汽车广告的内容
  });

  const dim6 = Math.round(minorScore * 0.60 + agesuitScore * 0.40);

  // ── 风险维度七：可持续/技术声明风险（权重 10%）──
  // 欧洲对汽车广告的技术声明有严格监管
  // 不能夸大续航里程、零排放能力、自动驾驶水平

  const exaggerateScore = riskMap(d.exaggerate, {
    none:    5,  // 无夸大声明记录
    minor:   40, // 有轻微夸大（措辞不严谨）
    serious: 90, // 有严重夸大（误导性宣传）
  });
  if (d.exaggerate === 'serious') {
    flags.push('⚠ 有严重夸大技术/环保声明记录，需在合同中明确技术声明边界');
  }

  const adasScore = riskMap(d.adas, {
    none:        5,  // 无自动驾驶相关内容
    cautious:    30, // 有但表述谨慎
    exaggerated: 85, // 有明显夸大表述
  });

  const techScore = riskMap(d.techaccuracy, {
    high: 5,  // 内容经过核实，技术准确
    mid:  40, // 偶有错误
    low:  80, // 经常出现技术性错误
  });

  const dim7 = Math.round(
    exaggerateScore * 0.45 +
    adasScore       * 0.30 +
    techScore       * 0.25
  );

  // ── 风险维度八：合作执行风险（权重 5%）──
  // 权重最低，因为可以通过合同条款约束

  const lateScore = riskMap(d.latedelete, {
    none:       5,  // 无延期/删帖记录
    occasional: 40, // 偶有（1-2次）
    frequent:   85, // 频繁（影响合作质量）
  });

  const briefRejectScore = riskMap(d.briefreject, {
    cooperative: 5,  // 配合，接受修改意见
    friction:    45, // 偶有摩擦
    refuse:      90, // 经常拒绝修改
  });

  const dim8 = Math.round(lateScore * 0.55 + briefRejectScore * 0.45);

  // ── 风险总分计算 ──
  const dimScores = [dim1, dim2, dim3, dim4, dim5, dim6, dim7, dim8];
  const total = Math.round(
    dimScores.reduce((sum, score, i) => sum + score * RISK_LAYERS[i].weight, 0)
  );

  return { total, dimScores, flags };
}


/* ============================================================
   第五部分：综合评级函数
   ============================================================ */

/**
 * 商业价值评级
 * 根据总分返回评级标签、颜色和 CSS 类
 */
function gradeCS(score) {
  if (score >= 80) return { g: 'A级', cls: 'b-teal',  color: '#0D9488' }; // 高商业价值，优先推进
  if (score >= 65) return { g: 'B级', cls: 'b-blue',  color: '#2563EB' }; // 良好，可进入洽谈
  return              { g: 'C级', cls: 'b-amber', color: '#D97706' }; // 待验证，谨慎评估
}

/**
 * 风险等级评定
 * 记住：风险分越高 = 越危险
 */
function gradeRS(score) {
  if (score >= 61) return { g: '高风险', cls: 'b-red',   color: '#DC2626' }; // 需法务/品牌复核
  if (score >= 31) return { g: '中风险', cls: 'b-amber', color: '#D97706' }; // 需加强合同约束
  return              { g: '低风险', cls: 'b-green', color: '#047857' }; // 可正常推进
}

/**
 * 双模型综合决策矩阵
 * 商业价值分 + 风险分 → 建议行动
 */
function getDecision(csScore, rsScore) {
  if (csScore >= 80 && rsScore <= 30) return '🟢 强烈推荐合作，优先推进签约';
  if (csScore >= 80 && rsScore <= 60) return '🟡 高价值但需管控风险，合同中加强约束条款';
  if (csScore >= 80 && rsScore > 60)  return '🔴 高价值但高风险，进入法务复核流程后再决策';
  if (csScore >= 65 && rsScore <= 30) return '🟢 稳健合作对象，正常推进';
  if (csScore >= 65 && rsScore <= 60) return '🟡 可考虑合作，关注内容专业度提升';
  if (csScore < 65  && rsScore > 60)  return '🔴 不建议合作，直接排除';
  return '⚪ 综合评估后决策';
}


/* ============================================================
   第六部分：本地数据管理（localStorage）
   ============================================================ */

// KOL 数据数组，从 localStorage 加载
let KOLS = JSON.parse(localStorage.getItem('kol_platform_kols') || '[]');

/**
 * 将当前 KOLS 数组持久化到 localStorage
 * 每次添加/删除/修改 KOL 后都应调用此函数
 */
function persist() {
  localStorage.setItem('kol_platform_kols', JSON.stringify(KOLS));
}

/**
 * 导出全部数据为 JSON 文件（下载到本地）
 */
function exportData() {
  const data = {
    kols: KOLS,
    exportedAt: new Date().toISOString(),
    version: '3.0',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kol_platform_data_' + new Date().toLocaleDateString('zh-CN').replace(/\//g, '-') + '.json';
  a.click();
}

/**
 * 从 JSON 文件导入数据（与现有数据合并，不覆盖已有 KOL）
 * @param {File} file - 用户选择的 JSON 文件
 */
function importJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data  = JSON.parse(e.target.result);
      const kols  = data.kols || data; // 兼容直接是数组的格式
      if (!Array.isArray(kols)) {
        alert('格式错误，请导入由本平台导出的 JSON 文件');
        return;
      }
      const existingIds = new Set(KOLS.map(k => k.id));
      let added = 0;
      kols.forEach(k => {
        if (!existingIds.has(k.id)) {
          KOLS.push(k);
          existingIds.add(k.id);
          added++;
        }
      });
      persist();
      alert(`✅ 成功导入 ${added} 个 KOL（跳过 ${kols.length - added} 个已存在的）`);
    } catch (e) {
      alert('文件解析失败：' + e.message);
    }
  };
  reader.readAsText(file);
}


/* ============================================================
   第七部分：云端数据共享（Supabase）
   所有团队成员连接同一个 Supabase 项目，数据实时共享
   ============================================================

   Supabase 建表 SQL（在 Supabase SQL Editor 中执行）：
   ─────────────────────────────────────────────
   create table if not exists kols (
     id         text primary key,
     name       text not null,
     kol_data   jsonb not null,
     updated_at timestamptz default now()
   );
   alter table kols enable row level security;
   create policy "team_access" on kols for all using (true) with check (true);
   ─────────────────────────────────────────────
*/

// Supabase 连接信息，从 localStorage 加载
let SB_URL = localStorage.getItem('kol_sb_url') || ''; // 格式：https://xxxxxx.supabase.co
let SB_KEY = localStorage.getItem('kol_sb_key') || ''; // anon public key

/**
 * 生成 Supabase API 请求头
 */
function sbHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Prefer': 'resolution=merge-duplicates', // 同 ID 的记录自动更新（upsert）
  };
}

/**
 * 将单个 KOL 上传/更新到 Supabase
 * 在每次 saveKOL() 或 advanceKOL() 后自动调用
 */
async function pushToCloud(kol) {
  if (!SB_URL || !SB_KEY) return;
  try {
    await fetch(SB_URL + '/rest/v1/kols', {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify([{
        id:       kol.id,
        name:     kol.name,
        kol_data: kol,
        updated_at: new Date().toISOString(),
      }]),
    });
  } catch (e) {
    console.warn('云端同步失败：', e);
  }
}

/**
 * 从 Supabase 拉取最新数据，与本地合并
 * 合并策略：云端数据优先（同 ID 的 KOL 以云端版本覆盖本地）
 */
async function manualSync() {
  if (!SB_URL || !SB_KEY) return;
  try {
    const resp = await fetch(
      SB_URL + '/rest/v1/kols?select=*&order=updated_at.desc',
      { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const rows = await resp.json();
    if (!Array.isArray(rows)) throw new Error('返回格式错误');

    const localIds = new Set(KOLS.map(k => k.id));
    let added = 0;
    rows.forEach(row => {
      if (!row.kol_data) return;
      if (localIds.has(row.id)) {
        // 云端优先：更新本地已有记录
        const idx = KOLS.findIndex(k => k.id === row.id);
        if (idx >= 0) KOLS[idx] = row.kol_data;
      } else {
        // 新增：本地没有的从云端拉下来
        KOLS.push(row.kol_data);
        localIds.add(row.id);
        added++;
      }
    });
    persist();
    console.log(`云端同步完成：共 ${rows.length} 个 KOL，新增 ${added} 个`);
  } catch (e) {
    console.error('云端同步失败：', e.message);
  }
}

/**
 * 将本地所有 KOL 批量上传到 Supabase
 * 用于第一次配置云端后，把已有本地数据迁移上去
 */
async function pushAllToCloud() {
  if (!SB_URL || !SB_KEY || !KOLS.length) return;
  await fetch(SB_URL + '/rest/v1/kols', {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(
      KOLS.map(k => ({ id: k.id, name: k.name, kol_data: k, updated_at: new Date().toISOString() }))
    ),
  });
}


/* ============================================================
   第八部分：YouTube API 数据自动抓取
   ============================================================ */

let API_KEY = localStorage.getItem('kol_yt_api_key') || '';

/**
 * 从 YouTube 频道链接或 handle 解析频道信息
 * 支持格式：
 *   https://www.youtube.com/@AutoBildDE
 *   https://www.youtube.com/channel/UCxxxxxx
 *   @AutoBildDE
 *   UCxxxxxx（直接是频道 ID）
 */
function parseChannelInput(raw) {
  raw = raw.trim();
  let handle = '', channelId = '';

  if (raw.startsWith('UC') && raw.length > 10 && !raw.includes('/') && !raw.includes('.')) {
    channelId = raw; // 直接是频道 ID
  } else {
    const m1 = raw.match(/\/channel\/(UC[^/?&]+)/);
    if (m1) {
      channelId = m1[1];
    } else {
      const m2 = raw.match(/@([^/?&\s]+)/);
      if (m2) handle = m2[1];
      else if (!raw.includes('/') && raw.length > 0) handle = raw.replace('@', '');
    }
  }

  return { handle, channelId };
}

/**
 * 从 YouTube API 抓取频道数据
 * 每次调用消耗约 103 单位配额（免费额度每日 10000 单位）
 *
 * 返回数据：
 * {
 *   name:     "频道名称",
 *   handle:   "@handle",
 *   country:  "DE",
 *   thumb:    "头像URL",
 *   subs:     1000000,   // 订阅数
 *   avgViews: 85000,     // 近10期平均播放量
 *   err:      2.8,       // 互动率（%）= (点赞+评论) / 订阅数 × 100
 * }
 */
async function fetchYouTubeChannel(channelInput) {
  const { handle, channelId } = parseChannelInput(channelInput);

  // 第一步：获取频道基础信息
  let channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&key=${API_KEY}`;
  if (channelId)  channelUrl += `&id=${channelId}`;
  else if (handle) channelUrl += `&forHandle=${handle}`;
  else throw new Error('无法识别频道格式');

  const chResp = await fetch(channelUrl);
  const chData = await chResp.json();
  if (chData.error) throw new Error(chData.error.message);
  if (!chData.items?.length) throw new Error('未找到频道');

  const ch   = chData.items[0];
  const chId = ch.id;
  const subs = parseInt(ch.statistics.subscriberCount) || 0;

  // 第二步：获取近10期视频 ID（用于计算互动率）
  const searchResp = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${chId}&order=date&maxResults=10&type=video&key=${API_KEY}`
  );
  const searchData = await searchResp.json();
  const videoIds = (searchData.items || []).map(v => v.id.videoId).filter(Boolean);

  let avgViews = 0, err = 0;

  if (videoIds.length > 0) {
    // 第三步：获取视频统计数据（播放量、点赞数、评论数）
    const vstResp = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(',')}&key=${API_KEY}`
    );
    const vstData = await vstResp.json();
    const vids = vstData.items || [];

    if (vids.length > 0) {
      const totalViews    = vids.reduce((s, v) => s + parseInt(v.statistics.viewCount    || 0), 0);
      const totalLikes    = vids.reduce((s, v) => s + parseInt(v.statistics.likeCount    || 0), 0);
      const totalComments = vids.reduce((s, v) => s + parseInt(v.statistics.commentCount || 0), 0);

      avgViews = Math.round(totalViews / vids.length);

      // ERR = (平均点赞 + 平均评论) / 订阅数 × 100
      err = subs > 0
        ? parseFloat(((totalLikes + totalComments) / vids.length / subs * 100).toFixed(2))
        : 0;
    }
  }

  return {
    name:     ch.snippet.title,
    handle:   '@' + (ch.snippet.customUrl || ch.snippet.title).replace('@', ''),
    country:  ch.snippet.country || '',
    thumb:    ch.snippet.thumbnails?.default?.url || '',
    desc:     (ch.snippet.description || '').slice(0, 100),
    subs,
    avgViews,
    err,
  };
}

/**
 * 格式化数字（用于显示订阅数等大数字）
 * @example formatNum(1200000) → "1.2M"
 * @example formatNum(486000)  → "486K"
 */
function formatNum(n) {
  n = parseInt(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return Math.round(n / 1000) + 'K';
  return n.toString();
}


/* ============================================================
   使用示例：对一个 KOL 运行完整评估
   ============================================================

   const kolData = {
     // 受众信息（部分可由 YouTube API 自动填入）
     geo:          74,      // 英/法/德受众占比 74%
     lang:         2,       // 双语（EN + DE）
     autoInterest: 88,      // 汽车兴趣受众 88%
     age:          58,      // 25-55岁受众 58%
     income:       'high',  // 高收入受众（年收 €60K+）

     // 内容信息
     focus:        92,      // 汽车内容专注度 92%
     depth:        'deep',  // 深度测评
     credibility:  'high',  // 高专业可信度

     // 互动数据（YouTube API 自动计算）
     err:          2.8,     // 互动率 2.8%
     completion:   52,      // 完播率 52%
     commentQuality: 'high',
     shareSave:    16,      // 分享收藏比 16%

     // VOC 评估
     vocDepth:    'high',
     vocNeg:      'mid',
     vocHistory:  'sometimes',

     // 商业条件
     cpm:         22,       // 实际报价 €22/千次
     benchCpm:    20,       // 行业基准 €20/千次
     reuse:       'limited',
     exclusive:   'soft',

     // 品牌适配
     brandTone:   'match',
     histTone:    'neutral',
     styleConsist: 'high',

     // 执行能力
     fulfill:     95,       // 履约率 95%
     briefCoop:   'high',
     dataReady:   'passive',

     // 风险数据
     incident:    'none',
     adlabel:     'always',
     competitor:  'none',
     fakepct:     10,       // 僵尸粉 10%
     gdpr:        'none',
     minorpct:    15,
     exaggerate:  'minor',
   };

   // 运行评分
   const commercial = calcCommercial(kolData);
   const risk       = calcRisk(kolData);

   console.log('商业价值总分：', commercial.total);    // 例：82
   console.log('各维度得分：',   commercial.layerScores); // [78, 85, 80, 72, 88, 76, 90]
   console.log('风险总分：',     risk.total);           // 例：18
   console.log('高风险预警：',   risk.flags);           // []

   const csGrade = gradeCS(commercial.total); // { g: 'A级', color: '#0D9488', ... }
   const rsGrade = gradeRS(risk.total);       // { g: '低风险', color: '#047857', ... }
   const decision = getDecision(commercial.total, risk.total); // '🟢 强烈推荐合作...'

   ============================================================ */
