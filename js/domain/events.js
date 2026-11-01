// js/domain/events.js —— 随机事件调度器
// 它不认识任何具体事件：内容由 app 注入（依赖倒置），这里只负责抽奖、状态机和执行。
OPC.define('domain.events', ['core.util', 'data.balance', 'domain.economy'], function (U, B, Econ) {
  'use strict';

  /**
   * @param {{news: Array, choices: Object}} content
   * @returns {{maybeFire: Function, pendingView: Function, choose: Function}}
   */
  function createEngine(content) {
    const news = (content && content.news) || [];
    const choices = (content && content.choices) || {};

    /** 条件函数写错不该炸掉整局 */
    function condMet(def, s) {
      if (typeof def.cond !== 'function') return false;
      try {
        return !!def.cond(s);
      } catch (error) {
        console.warn('[events] cond 异常', error);
        return false;
      }
    }

    /** 挑一个满足条件、按 w 加权的抉择事件 */
    function pickChoice(s, rand) {
      const pool = Object.entries(choices)
        .filter(([, def]) => condMet(def, s))
        .map(([id, def]) => ({ id, def, w: def.w || 1 }));
      return U.weightedPick(pool, rand);
    }

    /** 挑一条没被升级免疫的资讯事件 */
    function pickNews(s, rand) {
      const guards = Econ.boosts(s).guard;
      const pool = news
        .filter(def => !def.guard || !guards.includes(def.guard))
        .map(def => ({ def, w: (def.w || 1) * (def.guard
          ? Math.max(0, 1 + OPC.require('domain.modifiers').team(s, 'accident') + OPC.require('domain.modifiers').team(s, 'eventWeight'))
            * OPC.require('domain.tech').effects(s).accident : 1) }));
      return U.weightedPick(pool, rand);
    }

    /** tick 的 random 阶段：一半概率抉择（弹窗），一半概率资讯（自动生效） */
    function maybeFire(ctx) {
      const s = ctx.s;
      if (ctx.rand() < B.choiceEventRatio) {
        const hit = pickChoice(s, ctx.rand);
        if (!hit) return;
        const data = typeof hit.def.init === 'function' ? hit.def.init(s, ctx.rand) : {};
        s.pending = { id: hit.id, data: data || {} };
        return;
      }

      const picked = pickNews(s, ctx.rand);
      if (!picked) return;
      let text = null;
      try {
        text = picked.def.run(ctx);
      } catch (error) {
        console.warn('[events] news 执行异常', error);
      }
      if (text) {
        ctx.log(`📰 ${text}`);
        ctx.emit('news', { text });
      }
    }

    /** 给 UI：当前待选事件的文案与选项 */
    function pendingView(s) {
      if (!s.pending) return null;
      const def = choices[s.pending.id];
      if (!def) return null;
      const data = s.pending.data || {};
      let text = '';
      try {
        text = def.text(s, data);
      } catch (error) {
        text = '（事件文案出错）';
      }
      return { id: s.pending.id, text, options: def.options.map(option => option.label) };
    }

    /** 玩家做出选择 */
    function choose(ctx, index) {
      const s = ctx.s;
      if (!s.pending) return false;
      const def = choices[s.pending.id];
      if (!def) {
        s.pending = null;
        return false;
      }
      const option = def.options[index];
      if (!option) return false;

      const data = s.pending.data || {};
      let text = '';
      try {
        text = def.text(s, data);
      } catch (error) {
        text = s.pending.id;
      }
      ctx.log(`🗳️ ${text} → ${option.label}`);
      s.pending = null;

      try {
        option.run(ctx, data);
      } catch (error) {
        console.error('[events] 选项执行异常', s.pending && s.pending.id, error);
      }
      s.rep = U.clamp(s.rep, 0, B.reputationMax);

      if (s.over === 'sold') {
        ctx.log(`🤝 你以 ${ctx.yuan(s.soldFor)} 卖掉了公司，第 ${s.day} 天退休。`, true);
      } else if (s.over === 'hired') {
        ctx.log(`💼 你解散了公司，拿着 ¥1 亿年薪去大厂上班了。一人公司的故事停在第 ${s.day} 天。`, true);
      }
      return true;
    }

    /** 显式触发已注册抉择，仍需满足同一条件；用于玩家主动洽谈。 */
    function openChoice(ctx, id) {
      const def = choices[id];
      if (ctx.s.over || ctx.s.pending || !def || !condMet(def, ctx.s)) return false;
      ctx.s.pending = { id, data: typeof def.init === 'function' ? def.init(ctx.s, ctx.rand) : {} };
      return true;
    }

    /** 内容更新后移除不存在的待选事件，避免旧档永久阻塞推进。 */
    function reconcile(ctx) {
      if (ctx.s.pending && !Object.hasOwn(choices, ctx.s.pending.id)) {
        ctx.s.pending = null;
        ctx.log('旧存档中的事件已不可用，已恢复经营。');
      }
    }

    return { maybeFire, pendingView, choose, openChoice, reconcile };
  }

  return { createEngine };
});
