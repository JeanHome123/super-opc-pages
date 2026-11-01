// 效果的共同入口：同一项技能不能只显示在卡片上。
OPC.define('domain.modifiers', ['core.util', 'data.personas', 'domain.persona', 'domain.skills'],
function (U, P, Persona, Skills) {
  'use strict';

  /** 人格与技能的加法效果，不改变状态。 */
  function agent(agent, key) {
    return (Persona.effectsOf(agent, key) || 0) + (Skills.effects(agent)[key] || 0);
  }

  /** 公司效果取在岗实例平均值，避免堆人数无限叠加。 */
  function team(s, key, ids) {
    const agents = (s.agents || []).filter(a => !ids || ids.includes(a.id));
    return agents.length ? U.sum(agents, a => agent(a, key)) / agents.length : 0;
  }

  /** 人格随机行为只在实际工作时抽取；界面估计不消耗随机源。 */
  function work(ctx, agent) {
    const archetype = U.byId(P.archetypes, agent.persona && agent.persona.archetype);
    const special = archetype && archetype.special;
    if (!special) return 1;
    if (special.slackChance && ctx.rand() < special.slackChance) return special.slackWorkMul;
    if (special.refuseChance && ctx.rand() < special.refuseChance) {
      ctx.log(`💭「${agent.name}」今天要求重新解释任务，暂停了产出。`);
      return 0;
    }
    if (special.highChance) {
      const roll = ctx.rand();
      if (roll < special.highChance) return special.highMul;
      if (roll < special.highChance + special.lowChance) return special.lowMul;
    }
    return 1;
  }

  return { agent, team, work };
});
