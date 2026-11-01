// js/domain/crisis.js —— P1 危机系统：触发 / 处理 / 超时
// 危机数据来自 data.crises.js；状态只保存 id / startDay / deadline / severity。
OPC.define('domain.crisis', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  /** 首版危机规则；B.crisis 出现同名字段时优先使用 */
  const RULES = {
    startDay: 30,
    startChance: 0.008,
    windowMin: 3,
    windowMax: 7,
    expireCashBase: 1000,
    expireRepBase: 1,
    historyMax: 50,
  };

  const rule = key => (B.crisis && Number.isFinite(B.crisis[key]) ? B.crisis[key] : RULES[key]);

  /** 惰性读取 data.crises；内容包未就绪时模块可空转 */
  function crisisData() {
    try {
      const data = OPC.has('data.crises') ? OPC.require('data.crises') : null;
      if (!data) return [];
      if (Array.isArray(data)) return data;
      return Array.isArray(data.crises) ? data.crises : [];
    } catch (error) {
      return [];
    }
  }

  const defOf = id => crisisData().find(def => def && def.id === id) || null;

  function finite(value, fallback) {
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  function severityOf(def) {
    return U.clamp(Math.round(finite(def && def.severity, 1)), 1, 3);
  }

  /** 危机窗口 3–7 天；数据写多少都夹在区间内 */
  function windowOf(def) {
    const low = Math.max(1, Math.round(rule('windowMin')));
    const high = Math.max(low, Math.round(rule('windowMax')));
    return U.clamp(Math.round(finite(def && def.window, low)), low, high);
  }

  /** 状态补全：坏危机视为没有危机，历史只留可 JSON 往返的记录 */
  function ensureState(s) {
    if (!s || typeof s !== 'object') return s;
    if (s.crisis === undefined) s.crisis = null;
    if (s.crisis !== null) {
      const crisis = s.crisis;
      const valid = crisis && typeof crisis === 'object' && !Array.isArray(crisis)
        && typeof crisis.id === 'string' && crisis.id
        && Number.isFinite(crisis.startDay) && Number.isFinite(crisis.deadline)
        && crisis.deadline >= crisis.startDay;
      if (!valid) s.crisis = null;
      else {
        s.crisis.severity = U.clamp(Math.round(finite(crisis.severity, 1)), 1, 3);
        s.crisis.startDay = Math.max(0, Math.round(crisis.startDay));
        s.crisis.deadline = Math.round(crisis.deadline);
      }
    }

    if (!Array.isArray(s.crisisHistory)) s.crisisHistory = [];
    s.crisisHistory = s.crisisHistory.filter(item => (
      item && typeof item === 'object' && !Array.isArray(item) && typeof item.id === 'string'
    ));
    const max = Math.max(1, Math.round(rule('historyMax')));
    if (s.crisisHistory.length > max) s.crisisHistory.splice(0, s.crisisHistory.length - max);
    return s;
  }

  /** 追加历史，并保持数组有界 */
  function remember(s, record) {
    s.crisisHistory.push(record);
    const max = Math.max(1, Math.round(rule('historyMax')));
    if (s.crisisHistory.length > max) s.crisisHistory.splice(0, s.crisisHistory.length - max);
  }

  /** 危机可能复用的全局 flag 存储（与事件链共享同一张 flags 表） */
  function flagStore(s) {
    if (!s.chains || typeof s.chains !== 'object' || Array.isArray(s.chains)) {
      s.chains = { active: [], flags: {}, seen: [] };
    }
    if (!s.chains.flags || typeof s.chains.flags !== 'object' || Array.isArray(s.chains.flags)) {
      s.chains.flags = {};
    }
    return s.chains.flags;
  }

  /**
   * 每日尝试开始一个危机：同一时间最多一个，day>=30 后按小概率抽取。
   * @param {object} ctx
   * @returns {boolean}
   */
  function maybeStart(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    if (s.over || s.crisis) return false;
    if (s.day < rule('startDay')) return false;

    const defs = crisisData().filter(def => def && typeof def.id === 'string');
    if (!defs.length) return false;
    const rand = typeof ctx.rand === 'function' ? ctx.rand : () => 1;
    const tech = OPC.has('domain.tech') ? OPC.require('domain.tech') : null;
    const skills = Math.max(0, 1 + OPC.require('domain.modifiers').team(s, 'accident'));
    const accidentMul = (tech ? tech.effects(s).accident : 1) * skills;
    const regulatoryRisk = OPC.require('domain.trends').modifier(s, 'complianceRisk');
    const risk = 1 + regulatoryRisk * (1 - U.clamp(s.compliance || 0, 0, 100) / 100);
    if (rand() >= rule('startChance') * accidentMul * risk) return false;

    const def = U.pick(defs, rand);
    if (!def) return false;
    const window = windowOf(def);
    s.crisis = {
      id: def.id,
      startDay: s.day,
      deadline: s.day + window,
      severity: severityOf(def),
    };
    ctx.log(`🚨 危机「${def.name || def.id}」：${def.desc || ''}（${window} 天内处理）`);
    return true;
  }

  /** 给 UI 的危机详情；没有危机返回 null */
  function pendingView(s) {
    ensureState(s);
    if (!s.crisis) return null;
    const def = defOf(s.crisis.id);
    const options = def && Array.isArray(def.options) ? def.options : [];
    const riskLabels = (() => {
      try {
        const copy = OPC.has('data.copy3') ? OPC.require('data.copy3') : null;
        return copy && copy.riskLabels ? copy.riskLabels : {};
      } catch (error) {
        return {};
      }
    })();

    return {
      id: s.crisis.id,
      name: def ? def.name || def.id : s.crisis.id,
      desc: def ? def.desc || '' : '',
      severity: s.crisis.severity,
      startDay: s.crisis.startDay,
      deadline: s.crisis.deadline,
      daysLeft: Math.max(0, s.crisis.deadline - s.day),
      options: options.map(option => ({
        id: option.id,
        label: option.label || option.id,
        risk: option.risk || '',
        riskLabel: option.risk ? riskLabels[option.risk] || option.risk : '',
      })),
    };
  }

  /**
   * 应用选项效果；P1 只支持 cash / rep / mrr / energy / flag / log。
   * @param {object} ctx
   * @param {object} effects
   */
  function applyEffects(ctx, effects) {
    if (!effects || typeof effects !== 'object' || Array.isArray(effects)) return;
    const s = ctx.s;
    if (Number.isFinite(effects.cash)) s.cash += effects.cash;
    if (Number.isFinite(effects.rep)) s.rep = U.clamp(s.rep + effects.rep, 0, B.reputationMax);
    if (Number.isFinite(effects.mrr)) s.mrr = Math.max(0, s.mrr + effects.mrr);
    if (Number.isFinite(effects.energy)) s.energy = U.clamp(s.energy + effects.energy, 0, 100);

    if (typeof effects.flag === 'string' && effects.flag) {
      flagStore(s)[effects.flag] = true;
    }
    if (effects.flags && typeof effects.flags === 'object' && !Array.isArray(effects.flags)) {
      const flags = flagStore(s);
      for (const [key, value] of Object.entries(effects.flags)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          flags[key] = value;
        }
      }
    }
    if (typeof effects.log === 'string' && effects.log) ctx.log(effects.log);
  }

  /** 超时惩罚：按 severity 扣现金和声誉 */
  function expire(ctx) {
    const s = ctx.s;
    const crisis = s.crisis;
    const def = defOf(crisis.id);
    const severity = U.clamp(Math.round(finite(crisis.severity, 1)), 1, 3);
    const cashLoss = Math.round(rule('expireCashBase') * severity);
    const repLoss = Math.round(rule('expireRepBase') * severity);

    s.cash -= cashLoss;
    s.rep = U.clamp(s.rep - repLoss, 0, B.reputationMax);
    const money = typeof ctx.yuan === 'function' ? ctx.yuan(cashLoss) : String(cashLoss);
    ctx.log(`⏰ 危机「${def ? def.name || def.id : crisis.id}」超时：现金 -${money}，声誉 -${repLoss}。`);
    remember(s, {
      id: crisis.id,
      startDay: crisis.startDay,
      deadline: crisis.deadline,
      severity,
      endDay: s.day,
      outcome: 'expired',
      option: null,
    });
    s.crisis = null;
    return true;
  }

  /**
   * 处理当前危机：选项效果只走声明式 effects；成功即清空危机并写历史。
   * @param {object} ctx
   * @param {number} index
   * @returns {boolean}
   */
  function resolve(ctx, index) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    if (!s.crisis) {
      ctx.log('现在没有正在处理的危机。');
      return false;
    }
    const def = defOf(s.crisis.id);
    const options = def && Array.isArray(def.options) ? def.options : [];
    const option = Number.isInteger(index) ? options[index] : null;
    if (!option) {
      ctx.log('这个危机处理方案不存在。');
      return false;
    }

    ctx.log(`🧯 你选择「${option.label || option.id}」处理「${def.name || def.id}」。`);
    applyEffects(ctx, option.effects);
    remember(s, {
      id: s.crisis.id,
      startDay: s.crisis.startDay,
      deadline: s.crisis.deadline,
      severity: s.crisis.severity,
      endDay: s.day,
      outcome: 'resolved',
      option: option.id,
      label: option.label || option.id,
    });
    s.crisis = null;
    return true;
  }

  /**
   * 每日 tick：只处理到期危机；开始新危机由 maybeStart 负责。
   * @param {object} ctx
   * @returns {boolean} 是否发生了超时惩罚
   */
  function tick(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    if (!s.crisis) return false;
    if (s.day < s.crisis.deadline) return false;
    return expire(ctx);
  }

  return { ensureState, maybeStart, pendingView, resolve, tick };
});
