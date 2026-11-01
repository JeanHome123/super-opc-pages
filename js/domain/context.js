// js/domain/context.js —— 运行时上下文（依赖注入容器）
// domain 与 content 之间的唯一接口：content 只认 ctx，不认识任何 domain 模块。
OPC.define('domain.context',
['core.util', 'core.format', 'data.balance', 'data.catalog', 'domain.economy',
  'domain.persona', 'domain.team', 'domain.deploy', 'domain.projects',
  'domain.office', 'domain.chapters'],
function (U, F, B, D, Econ, Persona, Team, Deploy, Projects, Office, Chapters) {
  'use strict';

  /**
   * 创建一次游戏运行的上下文。
   * @param {object} s 状态
   * @param {{rand?: () => number, bus?: object}} [deps]
   * @returns {object} ctx
   */
  function createContext(s, deps = {}) {
    const rand = deps.rand || Math.random;
    const bus = deps.bus || null;

    const ctx = {
      s,
      rand,
      bus,
      B,
      D,

      /**
       * 写公司日志（同时进日报与弹窗队列）。
       * @param {string} text
       * @param {boolean} [popup]
       */
      log(text, popup = false) {
        s.log.unshift({ day: s.day, text });
        if (s.log.length > B.logMax) s.log.length = B.logMax;
        if (s.report) s.report.lines.push(text);
        if (popup) s.popups.push(text);
      },

      /** 通知表现层（粒子 / 飘字 / 音效），domain 不关心谁在听 */
      emit(type, payload) {
        if (bus) bus.emit(type, payload);
      },

      /** 生成订单（content 事件里发新单用） */
      offer(opts) {
        return Projects.makeOffer(ctx, opts);
      },

      /** 加经验 */
      xp(agent, amount) {
        Team.gainXp(ctx, agent, amount);
      },

      /** 按 id 取模型 */
      model(modelId) {
        return U.byId(s.models, modelId);
      },

      /** 当前升级效果 */
      boosts() {
        return Econ.boosts(s);
      },

      yuan: F.money,
      pick: arr => U.pick(arr, rand),
      clamp: U.clamp,

      // 2.0 领域能力（content 只能通过 ctx 使用）
      persona: Persona,
      deploy: Deploy,
      office: Office,
      chapters: Chapters,
      ensurePersona(agent) { return Persona.ensure(ctx, agent); },
    };

    return ctx;
  }

  return { createContext };
});
