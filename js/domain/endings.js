// js/domain/endings.js —— P2 八结局判定与遗产点
// 条件全部来自 data/endings.js 的声明式 metric / op / target；本模块不写死结局文案。
OPC.define('domain.endings', ['data.balance'], function (B) {
  'use strict';

  // TODO(balance): 以下常量待迁入 data/balance.js：
  //   endingDay / legacyCashUnit / legacyDeliveredUnit / legacyUsersUnit /
  //   legacyComplianceUnit / legacyRepUnit。
  // 迁移前用局部 RULES 兜底，避免在逻辑里散落魔法数字。
  const RULES = {
    endingDay: 365,
    legacyCashUnit: 100000,
    legacyDeliveredUnit: 10,
    legacyUsersUnit: 1000,
    legacyComplianceUnit: 10,
    legacyRepUnit: 10,
  };

  /** 优先读 balance 顶层常量，缺失时回退局部 RULES */
  const rule = key => (Number.isFinite(B[key]) ? B[key] : RULES[key]);

  /** 单位必须为正数，坏数据按 1 处理，避免除零产生 Infinity */
  function unitOf(key) {
    const value = rule(key);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  /** 写日志：测试 / 内容注入的 ctx 可能没有 log，结算本身不应因此抛错 */
  const log = (ctx, text, popup) => { if (typeof ctx.log === 'function') ctx.log(text, popup); };

  /** 可选读取数据表：内容包未挂载时模块仍可加载 */
  function optionalData(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      return null;
    }
  }

  /** 结局表：支持数组 / { endings: [] } / 按 id 键控的对象 */
  function endingList() {
    const data = optionalData('data.endings');
    const raw = Array.isArray(data) ? data : data && (data.endings || data.list);
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw).filter(item => item && typeof item === 'object');
    return [];
  }

  /** 常用 metric 读取器；未知 metric 再按点路径从状态里取 */
  const METRICS = {
    cash: s => s.cash,
    operatingCash: s => s.cash - (s.finance && s.finance.raised || 0),
    day: s => s.day,
    rep: s => s.rep,
    reputation: s => s.rep,
    mrr: s => s.mrr,
    delivered: s => s.delivered,
    failed: s => s.failed,
    agents: s => (Array.isArray(s.agents) ? s.agents.length : 0),
    agentCount: s => (Array.isArray(s.agents) ? s.agents.length : 0),
    compliance: s => s.compliance,
    certs: s => (Array.isArray(s.certs) ? s.certs.length : 0),
    fans: s => s.fans,
    techDebt: s => s.techDebt,
    legacy: s => s.legacy,
    rp: s => s.rp,
    over: s => s.over,
    soldFor: s => s.soldFor,
    creed: s => (s.chapter && typeof s.chapter === 'object' ? s.chapter.creed : null),
    productUsers: s => (s.product && Number.isFinite(s.product.users) ? s.product.users : 0),
    productMrr: s => (s.product && Number.isFinite(s.product.mrr) ? s.product.mrr : 0),
    productQuality: s => (s.product && Number.isFinite(s.product.quality) ? s.product.quality : 0),
  };

  /** 点路径读取：支持 product.users / chapter.creed 这类 metric */
  function readPath(s, path) {
    let cursor = s;
    for (const key of path.split('.')) {
      if (cursor == null || typeof cursor !== 'object') return 0;
      cursor = cursor[key];
    }
    return cursor;
  }

  /** 读一个 metric；数字保持数字，字符串（over / creed）保持字符串 */
  function metricOf(s, metric) {
    if (typeof metric !== 'string' || !metric) return 0;
    const fn = METRICS[metric];
    const value = fn ? fn(s || {}) : readPath(s, metric);
    if (typeof value === 'number' && isFinite(value)) return value;
    if (value === undefined || value === null) return 0;
    return value;
  }

  /** 单个条件比较；数值操作符遇到非数字一律不成立 */
  function compare(value, op, target) {
    const operator = typeof op === 'string' ? op : 'gte';
    if (operator === 'eq') return value === target;
    if (operator === 'neq') return value !== target;
    if (typeof value !== 'number' || !isFinite(value)) return false;
    if (typeof target !== 'number' || !isFinite(target)) return false;
    if (operator === 'gt') return value > target;
    if (operator === 'lt') return value < target;
    if (operator === 'lte') return value <= target;
    return value >= target;
  }

  /**
   * 条件求值：单条件或 { all } / { any } / { not } 组合；坏数据按不匹配处理。
   * @param {object} s
   * @param {object} condition
   * @param {number} [depth]
   * @returns {boolean}
   */
  function matches(s, condition, depth = 0) {
    if (!condition || typeof condition !== 'object' || Array.isArray(condition) || depth > 4) return false;
    if (Array.isArray(condition.all)) return condition.all.every(item => matches(s, item, depth + 1));
    if (Array.isArray(condition.any)) return condition.any.some(item => matches(s, item, depth + 1));
    if (condition.not) return !matches(s, condition.not, depth + 1);
    return compare(metricOf(s, condition.metric), condition.op, condition.target);
  }

  /**
   * 按 priority 从高到低匹配结局；同优先级保持数据表顺序。
   * @param {object} s
   * @returns {object|null} 结局数据副本；没有数据 / 无匹配返回 null
   */
  function evaluate(s) {
    const list = endingList()
      .filter(item => item && typeof item.id === 'string' && item.condition)
      .slice()
      .sort((a, b) => {
        const pa = Number.isFinite(a.priority) ? a.priority : 0;
        const pb = Number.isFinite(b.priority) ? b.priority : 0;
        return pb - pa;
      });
    for (const ending of list) {
      if (matches(s || {}, ending.condition)) return { ...ending };
    }
    return null;
  }

  /** 非负数值转遗产点：不足一个单位不计 */
  function pointsOf(value, unit) {
    const amount = typeof value === 'number' && isFinite(value) ? Math.max(0, value) : 0;
    return Math.floor(amount / unit);
  }

  /**
   * 遗产点 = 现金 + 交付 + 产品用户 + 合规 + 声誉，各自按单位取整后相加。
   * 坏值 / 负数按 0 计；空状态返回 0。
   * @param {object} s
   * @returns {number}
   */
  function legacyOf(s) {
    const state = s && typeof s === 'object' ? s : {};
    const productUsers = state.product && Number.isFinite(state.product.users) ? state.product.users : 0;
    return pointsOf(state.cash - (state.finance && state.finance.raised || 0), unitOf('legacyCashUnit'))
      + pointsOf(state.delivered, unitOf('legacyDeliveredUnit'))
      + pointsOf(productUsers, unitOf('legacyUsersUnit'))
      + pointsOf(state.compliance, unitOf('legacyComplianceUnit'))
      + pointsOf(state.rep, unitOf('legacyRepUnit'));
  }

  /** 年鉴一句话：把 {day} 换成实际天数 */
  function yearbookOf(ending, day) {
    const text = ending && typeof ending.yearbook === 'string' ? ending.yearbook : '';
    return text.split('{day}').join(String(day));
  }

  /**
   * 补全结局字段：坏值归 null / 0，旧档不崩。
   * 正式迁移仍由 domain.state 负责；这里保证本模块可独立运行。
   * @param {object} s
   * @returns {object} 同一个 s
   */
  function ensureState(s) {
    if (!s || typeof s !== 'object') return s;
    if (s.ending === undefined) s.ending = null;
    if (s.ending !== null && (typeof s.ending !== 'object' || Array.isArray(s.ending)
      || typeof s.ending.id !== 'string')) {
      s.ending = null;
    }
    if (typeof s.legacy !== 'number' || !isFinite(s.legacy)) s.legacy = 0;
    return s;
  }

  /**
   * 结算结局：s.over 已置位或 day >= endingDay 时写 s.ending 与 s.legacy。
   * 已结算过返回 false，不重复写日志；未到结算点返回 false。
   * @param {object} ctx
   * @returns {boolean}
   */
  function check(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    OPC.require('domain.products').refresh(ctx);
    if (s.ending) { s.pending = null; return false; }

    const day = Number.isFinite(s.day) ? Math.max(0, Math.round(s.day)) : 0;
    const endingDay = Math.max(1, Math.round(rule('endingDay')));
    const operatingCash = s.cash - (s.finance && Number.isFinite(s.finance.raised) ? s.finance.raised : 0);
    if (!s.over && operatingCash >= B.goal) s.over = 'win';
    if (!s.over && s.cash < -B.credit) s.over = 'lose';
    if (!s.over && day < endingDay) return false;

    const ending = evaluate(s);
    if (!ending) {
      log(ctx, '结局数据缺失或没有匹配项，暂时无法结算。');
      return false;
    }

    // 年末同日可能抽到抉择；结局优先，避免读档后被不可操作的旧抉择挡住。
    s.pending = null;
    const legacy = legacyOf(s);
    s.ending = {
      ...ending,
      name: ending.name || ending.id,
      desc: ending.desc || '',
      yearbook: yearbookOf(ending, day),
      day,
    };
    if (s.over === 'hired') {
      s.ending.name = '回归职场';
      s.ending.desc = '你接受了个人邀约，给这段创业旅程画上句号。';
      s.ending.yearbook = `第 ${day} 天，你合上了创业账本，开始另一段工作。`;
    }
    s.legacy = legacy;
    if (!s.over) s.over = 'ending';
    log(ctx, `🎬 第 ${day} 天，结局「${s.ending.name}」：${s.ending.desc} 遗产点 ${legacy}。`, true);
    if (typeof ctx.emit === 'function') ctx.emit('ending', { ending: s.ending, legacy });
    return true;
  }

  /**
   * 给 UI 的结局快照；未结算返回 null。
   * @param {object} s
   * @returns {object|null}
   */
  function view(s) {
    if (!s || typeof s !== 'object') return null;
    ensureState(s);
    if (!s.ending) return null;
    const ending = s.ending;
    return {
      id: ending.id || '',
      name: ending.name || ending.id || '',
      desc: ending.desc || '',
      yearbook: ending.yearbook || '',
      day: Number.isFinite(ending.day) ? ending.day : (Number.isFinite(s.day) ? s.day : 0),
      legacy: Number.isFinite(s.legacy) ? s.legacy : legacyOf(s),
    };
  }

  function canOfferAcquisition(s) {
    return !s.over && !s.pending && s.day >= B.acquisition.minDay && s.rep >= B.acquisition.reputation;
  }

  function offerAcquisition(ctx) {
    if (!canOfferAcquisition(ctx.s) || !ctx.events || !ctx.events.openChoice) {
      log(ctx, `经营满 ${B.acquisition.minDay} 天且声誉达到 ${B.acquisition.reputation} 后，可洽谈收购。`);
      return false;
    }
    return ctx.events.openChoice(ctx, 'acquire');
  }

  return { evaluate, legacyOf, check, view, ensureState, canOfferAcquisition, offerAcquisition };
});
