// js/domain/tech.js —— P2 技术树：前置校验 / 扣费 / 效果汇总
// 节点与文案来自 data/tech.js；本模块只读数据、写 s.tech / s.rp / s.cash。
OPC.define('domain.tech', ['core.util'], function (U) {
  'use strict';

  /** 乘法型效果：多节点连乘（0.8 = 成本 / 事故率 ×0.8，1.1 = 产出 ×1.1） */
  const MULTIPLIER_KEYS = ['token', 'accident', 'work', 'modelPrice', 'complianceRisk'];
  /** 加法型效果：多节点相加（0.04 = +4 个百分点） */
  const ADDITIVE_KEYS = ['quality', 'rep', 'sync', 'fans', 'compliance'];

  /** 惰性读数据表：内容包未挂载时模块仍可加载 */
  function optionalData(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      return null;
    }
  }

  function techData() {
    const data = optionalData('data.tech');
    if (!data || typeof data !== 'object') return { lines: [], nodes: [] };
    return {
      lines: Array.isArray(data.lines) ? data.lines : [],
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
    };
  }

  const nodeList = () => techData().nodes.filter((node) => node && typeof node.id === 'string');
  const nodeOf = (id) => nodeList().find((node) => node.id === id) || null;

  const requiresOf = (node) => {
    if (!node) return [];
    if (Array.isArray(node.requires)) return node.requires.filter((id) => typeof id === 'string');
    return typeof node.requires === 'string' && node.requires ? [node.requires] : [];
  };

  const finite = (value, fallback = 0) => (
    typeof value === 'number' && isFinite(value) ? value : fallback
  );

  /** 写日志：测试 / 内容注入的 ctx 可能没有 log */
  const log = (ctx, text) => { if (ctx && typeof ctx.log === 'function') ctx.log(text); };

  /**
   * 补齐技术树状态：旧档缺 tech 时补 []；rp 坏值归 0，tech 去重且只留字符串。
   * 正式迁移仍由 domain.state 负责；这里保证本模块可独立运行。
   * @param {object} s
   * @returns {object} 同一个 s
   */
  function ensureState(s) {
    if (!s || typeof s !== 'object') return s;
    if (!Array.isArray(s.tech)) s.tech = [];
    s.tech = [...new Set(s.tech.filter((id) => typeof id === 'string' && id))];
    s.rp = Math.max(0, finite(s.rp, 0));
    return s;
  }

  /** 前置是否全部已研究 */
  function prereqMet(node, owned) {
    return requiresOf(node).every((id) => owned.has(id));
  }

  /**
   * 当前可研究的节点：未拥有且前置全部满足。
   * 返回数据副本；是否买得起由 UI 用 cost / rpCost 判断。
   * @param {object} s
   * @returns {Array<object>}
   */
  function available(s) {
    if (!s || typeof s !== 'object') return [];
    ensureState(s);
    const owned = new Set(s.tech);
    return nodeList()
      .filter((node) => !owned.has(node.id) && prereqMet(node, owned))
      .map((node) => ({
        ...node,
        requires: requiresOf(node),
        effects: { ...(node.effects || {}) },
      }));
  }

  /**
   * 研究一个节点：校验前置 / 现金 / 研发点，成功后扣费并写入 s.tech。
   * 失败返回 false + ctx.log；成功返回 true。
   * @param {object} ctx
   * @param {string} id
   * @returns {boolean}
   */
  function buy(ctx, id) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    const node = nodeOf(id);
    if (!node) {
      log(ctx, '没有这个技术节点。');
      return false;
    }
    if (s.tech.includes(id)) {
      log(ctx, `「${node.name || id}」已经研究过了。`);
      return false;
    }

    const owned = new Set(s.tech);
    const missing = requiresOf(node).filter((required) => !owned.has(required));
    if (missing.length) {
      const names = missing.map((required) => (nodeOf(required) || { name: required }).name);
      log(ctx, `研究「${node.name || id}」需要先完成：${names.join('、')}。`);
      return false;
    }

    const cost = Math.max(0, Math.round(finite(node.cost, 0)));
    const rpCost = Math.max(0, Math.round(finite(node.rpCost, 0)));
    const cash = finite(s.cash, 0);
    if (cash < cost) {
      log(ctx, `研究「${node.name || id}」需要 ${typeof ctx.yuan === 'function' ? ctx.yuan(cost) : cost}，现金不足。`);
      return false;
    }
    if (s.rp < rpCost) {
      log(ctx, `研究「${node.name || id}」需要 ${rpCost} 研发点，当前只有 ${s.rp}。`);
      return false;
    }

    s.cash = cash - cost;
    s.rp -= rpCost;
    s.tech.push(id);
    log(ctx, `🔬 研究完成「${node.name || id}」（${typeof ctx.yuan === 'function' ? ctx.yuan(cost) : cost} + ${rpCost} RP）。`);
    if (typeof ctx.emit === 'function') ctx.emit('tech', { id, node });
    return true;
  }

  /**
   * 汇总已研究节点的效果。
   * 乘数型：token / accident / work / modelPrice / complianceRisk 连乘；
   * 加法型：quality / rep / sync / fans / compliance 相加；unlock 收集为 unlocks。
   * @param {object} s
   * @returns {{token:number, quality:number, accident:number, work:number, unlocks:string[]}}
   */
  function effects(s) {
    const out = { token: 1, quality: 0, accident: 1, work: 1, unlocks: [] };
    if (!s || typeof s !== 'object') return out;
    ensureState(s);
    const owned = new Set(s.tech);
    for (const node of nodeList()) {
      if (!owned.has(node.id) || !node.effects || typeof node.effects !== 'object') continue;
      for (const [key, value] of Object.entries(node.effects)) {
        if (key === 'unlock' && typeof value === 'string' && value) {
          if (!out.unlocks.includes(value)) out.unlocks.push(value);
          continue;
        }
        if (key === 'unlocks' && Array.isArray(value)) {
          for (const unlock of value) {
            if (typeof unlock === 'string' && unlock && !out.unlocks.includes(unlock)) out.unlocks.push(unlock);
          }
          continue;
        }
        if (typeof value !== 'number' || !isFinite(value)) continue;
        if (MULTIPLIER_KEYS.includes(key)) {
          out[key] = (Number.isFinite(out[key]) ? out[key] : 1) * value;
        } else if (ADDITIVE_KEYS.includes(key)) {
          out[key] = (Number.isFinite(out[key]) ? out[key] : 0) + value;
        }
      }
    }
    for (const key of Object.keys(out)) {
      if (typeof out[key] === 'number') out[key] = U.round2(out[key]);
    }
    return out;
  }

  /**
   * 给 UI 的技术树快照：按路线分组，节点带 owned / available / locked / affordable。
   * @param {object} s
   * @returns {object}
   */
  function view(s) {
    if (!s || typeof s !== 'object') return { rp: 0, owned: [], lines: [], nodes: [], effects: effects({}) };
    ensureState(s);
    const data = techData();
    const owned = new Set(s.tech);
    const lines = data.lines.map((line) => {
      const nodes = data.nodes
        .filter((node) => node && node.line === line.id)
        .map((node) => {
          const isOwned = owned.has(node.id);
          const isAvailable = !isOwned && prereqMet(node, owned);
          return {
            ...node,
            requires: requiresOf(node),
            effects: { ...(node.effects || {}) },
            owned: isOwned,
            available: isAvailable,
            locked: !isOwned && !isAvailable,
            affordable: s.cash >= finite(node.cost, 0) && s.rp >= finite(node.rpCost, 0),
            status: isOwned ? 'owned' : isAvailable ? 'available' : 'locked',
          };
        });
      return { ...line, nodes };
    });
    return {
      rp: s.rp,
      owned: [...s.tech],
      lines,
      nodes: lines.reduce((all, line) => all.concat(line.nodes), []),
      effects: effects(s),
    };
  }

  return { ensureState, available, buy, effects, view };
});
