// js/domain/chains.js —— 事件链状态机：开始 / 推进 / 选择 / 跳过
// 链内容由 content/chains.js 通过 createEngine 注入；本模块不认识任何具体剧情。
OPC.define('domain.chains', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  /** 状态缺字段时补默认值（正式迁移仍由 domain.state 负责） */
  function ensureState(s) {
    if (!s.chains || typeof s.chains !== 'object' || Array.isArray(s.chains)) {
      s.chains = { active: [], flags: {}, seen: [] };
    }
    const state = s.chains;
    if (!Array.isArray(state.active)) state.active = [];
    if (!state.flags || typeof state.flags !== 'object' || Array.isArray(state.flags)) state.flags = {};
    if (!Array.isArray(state.seen)) state.seen = [];
    state.active = state.active.filter(entry => entry && typeof entry === 'object' && typeof entry.id === 'string');
    state.seen = state.seen.filter(id => typeof id === 'string');
    return state;
  }

  /** 只接受 JSON 原生值，防止内容把函数 / undefined 写进存档 */
  const primitive = value => (
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  );

  /**
   * @param {{chains: Array<object>}} content
   * @returns {{start: Function, advance: Function, pendingView: Function, choose: Function, skip: Function}}
   */
  function createEngine(content) {
    const raw = content && content.chains;
    const chains = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
    const byId = new Map(chains.filter(def => def && def.id).map(def => [def.id, def]));

    /** 条件写错不炸整局；没有 cond 视为满足 */
    function condMet(def, s) {
      if (typeof def.cond !== 'function') return true;
      try {
        return !!def.cond(s);
      } catch (error) {
        console.warn('[chains] cond 异常', error);
        return false;
      }
    }

    /** 当前步骤文案，字符串或函数都可以 */
    function textOf(def, step, s) {
      const text = step && step.text;
      if (typeof text !== 'function') return String(text || '');
      try {
        return String(text(s));
      } catch (error) {
        console.warn('[chains] text 异常', def.id, error);
        return '（这条事件链的文案出错了）';
      }
    }

    const optionsOf = step => (step && Array.isArray(step.options) ? step.options : []);

    /** 把选项的声明式效果落到状态；只支持 P0 需要的字段 */
    function applyEffects(ctx, effects) {
      if (!effects || typeof effects !== 'object') return;
      const s = ctx.s;
      if (primitive(effects.cash)) s.cash += effects.cash;
      if (primitive(effects.rep)) s.rep = U.clamp(s.rep + effects.rep, 0, B.reputationMax);
      if (primitive(effects.mrr)) s.mrr += effects.mrr;
      if (primitive(effects.energy)) s.energy = U.clamp(s.energy + effects.energy, 0, 100);
      if (typeof effects.flag === 'string' && effects.flag) {
        ensureState(s).flags[effects.flag] = true;
      }
      if (effects.flags && typeof effects.flags === 'object' && !Array.isArray(effects.flags)) {
        const current = ensureState(s).flags;
        for (const [key, value] of Object.entries(effects.flags)) {
          if (primitive(value)) current[key] = value;
        }
      }
      if (typeof effects.log === 'string' && effects.log) ctx.log(effects.log);
    }

    function complete(ctx, def, state) {
      state.active.shift();
      if (!state.seen.includes(def.id)) state.seen.push(def.id);
      ctx.log(`🔚 事件链「${def.title || def.id}」结束。`);
    }

    /**
     * 显式开始一条链（测试 / 剧情脚本用）；已有 active 或已看过则失败。
     * @returns {boolean}
     */
    function start(ctx, chain) {
      const s = ctx.s;
      const state = ensureState(s);
      const def = typeof chain === 'string' ? byId.get(chain) : chain;
      if (!def || !def.id || !Array.isArray(def.steps) || !def.steps.length) return false;
      if (state.active.length || state.seen.includes(def.id)) return false;
      state.active.push({ id: def.id, step: 0, startedDay: s.day });
      ctx.log(`🔗 事件链「${def.title || def.id}」开始。`);
      return true;
    }

    /**
     * tick 阶段：有 active 链时等待玩家选择；没有时按权重抽一条满足条件的链。
     * 不阻塞 tick，也不会在没有 eligible 链时制造空转。
     * @returns {boolean} 是否开始了新链
     */
    function advance(ctx) {
      const s = ctx.s;
      const state = ensureState(s);
      if (state.active.length) {
        const entry = state.active[0];
        const def = byId.get(entry.id);
        // 坏档 / 内容被删时自愈，避免 active 永远卡住
        if (!def || !def.steps[entry.step]) {
          state.active.shift();
          if (def && !state.seen.includes(def.id)) state.seen.push(def.id);
        }
        return false;
      }

      const pool = chains
        .filter(def => def && def.id && !state.seen.includes(def.id) && condMet(def, s))
        .map(def => ({ def, w: typeof def.w === 'number' ? def.w : (typeof def.weight === 'number' ? def.weight : 1) }));
      const hit = U.weightedPick(pool, ctx.rand);
      return hit ? start(ctx, hit.def) : false;
    }

    /** 给 UI：当前步骤的文案与选项；没有 active 返回 null */
    function pendingView(s) {
      const state = ensureState(s);
      const entry = state.active[0];
      if (!entry) return null;
      const def = byId.get(entry.id);
      const step = def && def.steps[entry.step];
      if (!def || !step) return null;
      return {
        id: def.id,
        title: def.title || def.id,
        step: entry.step,
        total: def.steps.length,
        text: textOf(def, step, s),
        options: optionsOf(step).map(option => String(option.label || '继续')),
        canSkip: true,
      };
    }

    /**
     * 玩家选择一个选项：应用声明式效果 → 推进到下一步 / 结束。
     * @returns {boolean}
     */
    function choose(ctx, index) {
      const s = ctx.s;
      const state = ensureState(s);
      const entry = state.active[0];
      if (!entry) return false;
      const def = byId.get(entry.id);
      const step = def && def.steps[entry.step];
      const option = step && optionsOf(step)[index];
      if (!def || !step || !option) return false;

      ctx.log(`🗳️ ${textOf(def, step, s)} → ${option.label || '继续'}`);
      applyEffects(ctx, option.effects);
      entry.step += 1;
      if (entry.step >= def.steps.length) complete(ctx, def, state);
      return true;
    }

    /** 跳过当前事件链：标记 seen，不再重复触发 */
    function skip(ctx) {
      const s = ctx.s;
      const state = ensureState(s);
      const entry = state.active[0];
      if (!entry) return false;
      const def = byId.get(entry.id);
      if (def && !state.seen.includes(def.id)) state.seen.push(def.id);
      state.active.shift();
      ctx.log(`⏭️ 你跳过了「${def ? (def.title || def.id) : entry.id}」这条线。`);
      return true;
    }

    return { start, advance, pendingView, choose, skip };
  }

  return { createEngine, ensureState };
});
