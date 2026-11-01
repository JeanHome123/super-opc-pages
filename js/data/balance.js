// js/data/balance.js —— 全部可调数值（单一事实来源）
// 规则：任何逻辑代码里都不许出现魔法数字，一律从这里取。
OPC.define('data.balance', [], function () {
  'use strict';

  const BALANCE = {
    /** 存档结构版本；改动 state 结构时必须 +1 并在 domain/state.js 写迁移 */
    schemaVersion: 4,
    /** 人格数据版本（与存档结构版本分离） */
    personaVersion: 1,

    products: { growthBase: 0.008, growthQuality: 0.016, minSaleDays: 7 },
    financeRules: { covenantDays: 90, covenantGrowth: 3, covenantMinMrr: 10000,
      buybackInterest: 0.08, resourceOffers: 3, resourceBonus: 1.2, resourceFee: 0.05 },
    quoteRelationDivisor: 1000,
    acquisition: { minDay: 90, reputation: 60 },
    memoryMax: 16,
    yearbooksMax: 20,
    contracts: {
      inspectCost: 500, inspectEnergy: 5, inspectQuality: 0.03, bonusRate: 0.03, usableQuality: 0.6, commercialQuality: 0.8,
      stunningQuality: 0.9, hiddenQuality: 0.85, rushDays: 3,
      reworkRatio: 0.1, reworkDays: 5, relationGain: 3, relationLoss: 5,
    },
    legacyOptions: [
      { id: 'cash', name: '应急储备', cost: 10, cash: 5000 },
      { id: 'reputation', name: '行业口碑', cost: 10, rep: 5 },
      { id: 'research', name: '研究笔记', cost: 10, rp: 5 },
    ],

    // ---- 时间 ----
    daysPerMonth: 30,
    goal: 3000000,          // 净经营现金达标即胜利
    historyMax: 90,         // 白板曲线保留的天数
    logMax: 60,             // 公司日志保留条数

    // ---- 成本 ----
    tokensPerDay: 12,       // 每个在岗 agent 每天烧掉的百万 token
    rent: 2500,             // 每月房租 + 订阅
    upkeepPerAgent: 800,    // 每个 agent 每月部署/运维
    switchFee: 500,         // 换模型的提示词迁移费
    credit: 20000,          // 透支额度：cash < -credit 破产
    interest: 0.005,        // 透支日息

    // ---- 部署与实例生命周期（2.0） ----
    maxAgents: 8,           // 旧档 / 无办公室数据时的工位回退值
    deployBase: 6000,       // 部署费 = base + step × 现有实例数
    deployStep: 3000,
    archiveFee: 500,        // 归档打包 / 冷存储
    restoreCooldownDays: 7, // 归档后多少天内不能恢复
    forkBase: 12000,        // Fork 成本 = base + step × (等级 - 1)
    forkStep: 6000,
    maxLevel: 5,
    xpPerLevel: 10,         // 升到下一级需要 level * xpPerLevel 经验
    xpPerWorkDay: 1,        // 每天干活 +1 经验
    xpPerTune: 4,           // 「调提示词」+4
    levelWorkBonus: 0.15,   // 每级 +15% 产出
    roleMatchBonus: 1.5,    // 职业与项目类型匹配时 ×1.5

    // ---- 人格与同步率（2.0） ----
    personaEffectCap: 0.15, // 人格对数值的影响上限 ±15%
    quirkCount: 2,          // 每个 agent 抽几个怪癖
    syncDefault: 80,        // 新实例初始同步率
    syncMin: 0,
    syncMax: 100,
    syncLowBelow: 20,       // 同步率低于此值：产出 -10%（不离职）
    syncLowPenalty: 0.1,
    syncWorkDecay: 0.5,     // 在岗一天同步率 -0.5
    syncRestGain: 1,        // 空闲一天同步率 +1
    socialChance: 0.25,     // 每日社交小事件概率
    socialSyncGain: 1,
    socialRelationGain: 2,

    // ---- 关系（2.0） ----
    relationMin: -100,
    relationMax: 100,
    relationFriend: 30,      // ≥30：朋友，同项目质量 +3%
    relationPartner: 60,     // ≥60：搭档，同项目产出 +10%
    relationRival: -40,      // ≤-40：冤家，同项目产出 -10%
    relationFriendBonus: 0.03,
    relationPartnerBonus: 0.1,
    relationRivalPenalty: 0.1,

    // ---- 合规（2.0） ----
    complianceStart: 40,
    complianceMin: 0,
    complianceMax: 100,
    complianceCertThreshold: 60, // ≥60 可接国企 / 银行 / 政府订单
    complianceCrisisBelow: 30,   // <30 触发监管危机
    complianceAuditGain: 10,     // 一份审计报告自用 +10
    rpPerDelivery: 2,            // 每次达标交付获得研发点
    complianceAuditCost: 3000,   // 内部审计现金成本
    complianceAuditEnergy: 20,   // 内部审计精力成本
    complianceCertId: 'cert.compliance.basic',
    complianceCertName: '基础合规认证',

    // ---- 产线（P1） ----
    pipelineMax: 3,
    pipelineMinOthers: 2,
    pipelineOutputBonus: 0.10,
    pipelineMatchBonus: 0.05,
    pipelineNameMax: 24,

    // ---- 精力 ----
    tiredBelow: 20,         // 精力低于此值：全员质量 -5%
    tiredPenalty: 0.05,
    reviewBonus: 0.1,       // 「亲自把关」当天质量 +10%
    autoRestBelow: 30,      // 自动化：精力低于此值时当天改休息

    // ---- 交付 ----
    rewardPerWork: 184,     // 每单位工作量的基础报酬（质量要求 0.7 时）
    qualityCap: 1.15,       // 超额质量最多 +15% 报酬
    deliveryRepGain: 2,     // 达标交付 声誉 +
    deliveryRepLoss: 4,     // 不达标交付 声誉 -
    overdueRepLoss: 8,      // 逾期 声誉 -
    serviceMrrRate: 0.04,   // 客服类交付后：月订阅 += 报酬 × 4%
    reputationMax: 100,

    // ---- 订单板 ----
    offerBoardMax: 5,       // 板上最多几单
    offerBaseChance: 0.15,  // 每日来单基础概率
    offerRepFactor: 400,    // 声誉加成：chance = base + rep / factor
    offerExpireDays: 15,
    offerDaysPerWork: 2.5,  // 工期 = ceil(work / 2.5) + 10
    offerDaysBase: 10,
    offerMinQBase: 0.5,     // 质量要求 = 0.5 + rand*0.35 + work/1000
    offerMinQSpread: 0.35,
    offerRewardJitter: [0.8, 1.2],   // 报酬随机浮动区间
    salesOfferBonus: 1.1,   // 「跑客户」带回的单子加成
    autoAcceptSlack: 0.8,   // 自动接单：工作量 / 团队日产出 必须 ≤ 工期 × 0.8

    // ---- 提示阈值 ----
    cashWarning: 10000,     // 现金跌破此值时快进会停下来提醒

    // ---- 事件 ----
    eventMinDay: 3,         // 前 3 天不触发随机事件
    eventChance: 0.18,      // 每天触发事件的概率
    flavorChance: 0.3,      // 没事件的日子出现日常碎片的概率
    choiceEventRatio: 0.5,  // 事件里「抉择」占比（其余是资讯）

    // ---- token 模式 ----
    modes: {
      eco: { id: 'eco', name: '省钱', tok: 0.5, work: 0.75, q: -0.05, desc: 'token 减半，产出下降，质量略降' },
      normal: { id: 'normal', name: '标准', tok: 1, work: 1, q: 0, desc: '正常消耗' },
      turbo: { id: 'turbo', name: '深度思考', tok: 2.2, work: 1.3, q: 0.05, desc: 'token 翻倍，产出 +30%，质量 +5%' },
    },
    defaultMode: 'normal',

    // ---- CEO 行动 ----
    defaultAction: 'manage',
    startEnergy: 100,
    startReputation: 10,
  };

  // 1.x 兼容别名：保留一个版本，2.1 移除；新代码一律用 deployBase / deployStep
  BALANCE.hireBase = BALANCE.deployBase;
  BALANCE.hireStep = BALANCE.deployStep;

  return BALANCE;
});
