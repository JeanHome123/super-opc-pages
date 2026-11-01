// js/domain/state.js —— 状态骨架、序列化、版本迁移、里程碑检查
// 这里是「状态的形状」的唯一出处：加字段先改 create()，再让 SCHEMA_VERSION +1 并补迁移。
OPC.define('domain.state', ['core.util', 'data.balance', 'data.catalog', 'data.copy', 'domain.product-state'], function (U, B, D, C, ProductState) {
  'use strict';

  /** 存档结构版本（唯一来源是 data/balance） */
  const SCHEMA_VERSION = B.schemaVersion;

  /** 读档时必须还是数组的字段：残缺存档补空数组，避免下游 forEach/filter 崩 */
  const ARRAY_KEYS = ['upgrades', 'milestones', 'models', 'agents', 'offers', 'projects', 'log', 'popups', 'hist',
    'archive', 'pipelines', 'certs', 'trendHistory', 'rivals', 'crisisHistory', 'tech'];

  /** 读档时必须还是有限数字的字段：坏值归零，避免 NaN 传染整局 */
  const NUMBER_KEYS = ['day', 'cash', 'rep', 'mrr', 'throttle', 'energy', 'extraFixed',
    'soldFor', 'delivered', 'failed', 'nextId'];

  /** 2.0 数字字段的默认值：缺失时不能一律归零（合规分默认 40） */
  const NUMBER_DEFAULTS = {
    personaVersion: 1,
    compliance: 40,
    deploySeq: 1,
    fans: 0,
    techDebt: 0,
    legacy: 0,
    rp: 0,
  };

  /** 受支持职业只认职业表自有键（toString / __proto__ 不算）；非法 / 缺失 role 归一为 coder */
  const isRole = role => typeof role === 'string' && Object.hasOwn(D.roles, role);
  const FALLBACK_ROLE = isRole('coder') ? 'coder' : Object.keys(D.roles).find(isRole);

  /**
   * 造一局全新的空状态。
   * agent 与订单故意留空：由 day.startGame 填，让「状态骨架」与「开局叙事」解耦。
   * @param {string} dirId 公司方向 id（非法值回退到第一个方向）
   * @param {Function} [rand] 预留随机源，与其它入口签名保持一致
   * @returns {object} 可 JSON 往返的状态
   */
  function create(dirId, rand, runId = '') {
    const dir = U.byId(D.directions, dirId) || D.directions[0];
    return {
      v: SCHEMA_VERSION,
      runId,
      clientRelations: {},
      legacyBonus: null,
      day: 0,
      dir: dir.id,
      cash: dir.cash,
      rep: B.startReputation,
      mrr: 0,
      mode: B.defaultMode,
      throttle: 0,
      energy: B.startEnergy,
      action: B.defaultAction,
      upgrades: [],
      extraFixed: 0,
      pending: null,
      soldFor: 0,
      auto: { accept: false, rest: false },
      total: { income: 0, token: 0, fixed: 0 },
      delivered: 0,
      failed: 0,
      milestones: [],
      // 只放开局就存在的模型；之后由 market.advance 按 release 天追加
      models: D.models.filter(model => model.release === 0).map(model => ({ ...model })),
      agents: [],
      offers: [],
      projects: [],
      log: [],
      popups: [],
      nextId: 1,
      month: { income: 0, token: 0 },
      over: null,
      hist: [dir.cash],
      report: null,

      // ---- 2.0 新增（契约见 docs/ARCHITECTURE-2.0.md 第 3 节） ----
      personaVersion: B.personaVersion,
      relations: {},
      archive: [],
      pipelines: [],
      compliance: B.complianceStart,
      certs: [],
      chapter: { act: 1, startedDay: 0, creed: null, completed: [], choices: [] },
      office: { stage: 0, facilities: [] },
      chains: { active: [], flags: {}, seen: [] },
      // ---- P1：势 / 业 / 局（2.0 开发期内 additive；发布前冻结） ----
      trend: null,
      trendHistory: [],
      product: null,
      rivals: [],
      crisis: null,
      crisisHistory: [],
      rp: 0,
      tech: [],
      finance: { round: 0, equity: 0, raised: 0, investor: null, term: null, history: [] },
      negotiation: null,
      ending: null,
      deploySeq: 1,
      fans: 0,
      techDebt: 0,
      legacy: 0,
    };
  }

  /** 存档字符串（UI 只管写 localStorage，规则层只负责编码） @param {object} s @returns {string} */
  function serialize(s) {
    return JSON.stringify(s);
  }

  /**
   * 读档：坏档 / 不认的版本一律返回 null，调用方静默开新局，不弹错误。
   * @param {string} text @returns {object|null}
   */
  function deserialize(text) {
    if (typeof text !== 'string' || !text) return null;
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      return null; // 存档损坏：当没有存档，别让玩家卡在报错界面
    }
    return migrate(raw);
  }

  /**
   * 迁移：v1 → v2 只补默认值，不重写原有字段；其余未知版本返回 null。
   * @param {*} raw 反序列化得到的原始对象
   * @returns {object|null} 可用的状态，或 null（不可迁移）
   */
  function migrate(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (![1, 2, 3, SCHEMA_VERSION].includes(raw.v)) return null;
    raw.v = SCHEMA_VERSION;
    return normalize(raw);
  }

  /**
   * 补齐残缺字段：同版本内新增字段时，旧档也能直接读。
   * @param {object} raw @returns {object} 同一个对象（原地补全）
   */
  function normalize(raw) {
    for (const key of ARRAY_KEYS) if (!Array.isArray(raw[key])) raw[key] = [];
    for (const key of NUMBER_KEYS) {
      if (typeof raw[key] !== 'number' || !isFinite(raw[key])) raw[key] = 0;
    }
    for (const [key, fallback] of Object.entries(NUMBER_DEFAULTS)) {
      const value = raw[key];
      raw[key] = typeof value === 'number' && isFinite(value) ? value : fallback;
    }
    if (!raw.auto || typeof raw.auto !== 'object') raw.auto = { accept: false, rest: false };
    if (!raw.total || typeof raw.total !== 'object') raw.total = { income: 0, token: 0, fixed: 0 };
    if (!raw.month || typeof raw.month !== 'object') raw.month = { income: 0, token: 0 };
    if (!raw.relations || typeof raw.relations !== 'object' || Array.isArray(raw.relations)) raw.relations = {};
    raw.runId = typeof raw.runId === 'string' ? raw.runId : '';
    raw.clientRelations = raw.clientRelations && typeof raw.clientRelations === 'object'
      && !Array.isArray(raw.clientRelations) ? raw.clientRelations : {};
    raw.legacyBonus = typeof raw.legacyBonus === 'string' ? raw.legacyBonus : null;
    raw.chapter = normalizeChapter(raw.chapter);
    raw.office = normalizeOffice(raw.office);
    raw.chains = normalizeChains(raw.chains);
    raw.trend = raw.trend && typeof raw.trend === 'object' && !Array.isArray(raw.trend) ? raw.trend : null;
    raw.product = ProductState.normalize(raw.product, raw.day);
    raw.crisis = raw.crisis && typeof raw.crisis === 'object' && !Array.isArray(raw.crisis) ? raw.crisis : null;
    raw.ending = raw.ending && typeof raw.ending === 'object' && !Array.isArray(raw.ending) ? raw.ending : null;
    raw.finance = normalizeFinance(raw.finance);
    raw.negotiation = raw.negotiation && typeof raw.negotiation === 'object' && !Array.isArray(raw.negotiation)
      ? raw.negotiation : null;
    raw.agents.forEach(normalizeAgent);
    raw.archive.forEach(normalizeAgent);
    if (!B.modes[raw.mode]) raw.mode = B.defaultMode;
    if (!D.actions[raw.action]) raw.action = B.defaultAction;
    if (!U.byId(D.directions, raw.dir)) raw.dir = D.directions[0].id;
    if (raw.over === undefined) raw.over = null;
    if (!raw.pending || typeof raw.pending !== 'object' || Array.isArray(raw.pending)
      || typeof raw.pending.id !== 'string') raw.pending = null;
    if (raw.report === undefined) raw.report = null;
    return raw;
  }

  /** 章节对象：act 至少 1；creed 未选时为 null，不写 undefined（JSON 往返会丢键） */
  function normalizeChapter(chapter) {
    const src = chapter && typeof chapter === 'object' && !Array.isArray(chapter) ? chapter : {};
    const act = Number.isInteger(src.act) && src.act >= 1 ? src.act : 1;
    const startedDay = Number.isInteger(src.startedDay) && src.startedDay >= 0 ? src.startedDay : 0;
    const creed = typeof src.creed === 'string' && src.creed ? src.creed : null;
    const completed = Array.isArray(src.completed) ? src.completed.filter(id => typeof id === 'string') : [];
    const choices = Array.isArray(src.choices) ? src.choices.filter(id => typeof id === 'string') : [];
    return { act, startedDay, creed, completed, choices };
  }

  /** 办公室对象：stage 至少 0；设施只存 id 字符串 */
  function normalizeOffice(office) {
    const src = office && typeof office === 'object' && !Array.isArray(office) ? office : {};
    const stage = Number.isInteger(src.stage) && src.stage >= 0 ? src.stage : 0;
    const facilities = Array.isArray(src.facilities) ? src.facilities.filter(id => typeof id === 'string') : [];
    return { stage, facilities };
  }

  /** 融资对象：轮次 / 股权 / 已融金额 / 投资人 / 条款 / 历史，坏值归零 */
  function normalizeFinance(finance) {
    const src = finance && typeof finance === 'object' && !Array.isArray(finance) ? finance : {};
    const round = Number.isInteger(src.round) && src.round >= 0 ? src.round : 0;
    const equity = typeof src.equity === 'number' && isFinite(src.equity)
      ? U.clamp(src.equity, 0, 1) : 0;
    const raised = typeof src.raised === 'number' && isFinite(src.raised) && src.raised >= 0 ? src.raised : 0;
    const investor = typeof src.investor === 'string' && src.investor ? src.investor : null;
    const term = typeof src.term === 'string' && src.term ? src.term : null;
    const history = Array.isArray(src.history)
      ? src.history.filter(item => item && typeof item === 'object' && !Array.isArray(item))
      : [];
    return { round, equity, raised, investor, term, history };
  }

  /** 事件链对象：只留合法的 active / flags / seen，坏档不阻塞 tick */
  function normalizeChains(chains) {
    const src = chains && typeof chains === 'object' && !Array.isArray(chains) ? chains : {};
    const active = Array.isArray(src.active)
      ? src.active
        .filter(entry => entry && typeof entry === 'object' && typeof entry.id === 'string')
        .map(entry => ({
          id: entry.id,
          step: Number.isInteger(entry.step) && entry.step >= 0 ? entry.step : 0,
          startedDay: Number.isInteger(entry.startedDay) && entry.startedDay >= 0 ? entry.startedDay : 0,
        }))
      : [];
    const flags = src.flags && typeof src.flags === 'object' && !Array.isArray(src.flags)
      ? Object.fromEntries(Object.entries(src.flags).filter(([, value]) => (
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      )))
      : {};
    const seen = Array.isArray(src.seen) ? src.seen.filter(id => typeof id === 'string') : [];
    return { active, flags, seen };
  }

  /** agent 2.0 结构；v1 旧档补成合法形状；非法 / 缺失职业归一为受支持职业（默认 coder），只改 role，其余字段保留 */
  function normalizeAgent(agent) {
    if (!agent || typeof agent !== 'object' || Array.isArray(agent)) return;
    if (!isRole(agent.role) && FALLBACK_ROLE) agent.role = FALLBACK_ROLE;
    const src = agent.persona && typeof agent.persona === 'object' && !Array.isArray(agent.persona)
      ? agent.persona : {};
    const sync = typeof src.sync === 'number' && isFinite(src.sync)
      ? U.clamp(Math.round(src.sync), 0, 100) : B.syncDefault;
    agent.persona = {
      archetype: typeof src.archetype === 'string' && src.archetype ? src.archetype : null,
      quirks: Array.isArray(src.quirks) ? src.quirks.filter(id => typeof id === 'string').slice(0, 2) : [],
      sync,
      memory: Array.isArray(src.memory) ? src.memory : [],
    };
    if (!Array.isArray(agent.skills)) agent.skills = [];
    if (!Number.isInteger(agent.skillPoints) || agent.skillPoints < 0) agent.skillPoints = 0;
    if (!Number.isInteger(agent.respecCount) || agent.respecCount < 0) agent.respecCount = 0;
    if (!Number.isInteger(agent.version) || agent.version < 1) agent.version = 1;
    if (!Number.isInteger(agent.originDay) || agent.originDay < 0) agent.originDay = 0;
  }

  /**
   * 里程碑阶段：未触发过且 cond 为真 → 记录 {id, day} 并写日志（popup 会弹窗）。
   * @param {object} ctx @returns {void}
   */
  function checkMilestones(ctx) {
    const s = ctx.s;
    const triggered = new Set(s.milestones.map(item => item.id));
    for (const milestone of C.milestones) {
      if (triggered.has(milestone.id) || !condMet(milestone.cond, s)) continue;
      s.milestones.push({ id: milestone.id, day: s.day });
      ctx.log(`📖 ${milestoneText(milestone, s)}`, !!milestone.popup);
    }
  }

  /** 条件函数来自 data/copy，写错不该炸掉整局：异常当作「未达成」 */
  function condMet(cond, s) {
    if (typeof cond !== 'function') return false;
    try {
      return !!cond(s);
    } catch (error) {
      return false;
    }
  }

  /** 文案可以是字符串，也可以是函数（要拼 agent 名的那种） */
  function milestoneText(milestone, s) {
    const fallback = String(milestone.title || milestone.id);
    if (typeof milestone.text !== 'function') return String(milestone.text || fallback);
    try {
      return String(milestone.text(s));
    } catch (error) {
      return fallback;
    }
  }

  /** 表现层提取一次性消息，避免 UI 直接写状态。 */
  function takePopups(s) {
    return Array.isArray(s.popups) ? s.popups.splice(0, s.popups.length) : [];
  }

  return { takePopups, SCHEMA_VERSION, create, serialize, deserialize, migrate, normalize, normalizeAgent, checkMilestones };
});
