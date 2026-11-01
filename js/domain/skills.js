// js/domain/skills.js —— P1 技能树：候选 / 学习 / 效果汇总 / 洗点
// 通用技能来自 data/skills.js；职业技能复用 data.personas.skills。
OPC.define('domain.skills', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  // TODO(balance): 洗点价格可迁入 data/balance.js；当前按设计稿首版值。
  const RULES = {
    skillPointCost: 1,
    respecCost: 8000,
  };

  const finite = (value, fallback = 0) => (
    typeof value === 'number' && isFinite(value) ? value : fallback
  );
  const log = (ctx, text) => { if (ctx && typeof ctx.log === 'function') ctx.log(text); };

  function optionalData(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      return null;
    }
  }

  function skillData() {
    const data = optionalData('data.skills');
    if (!data || typeof data !== 'object') return { generic: [], roleSkills: [] };
    return {
      generic: Array.isArray(data.generic) ? data.generic : [],
      roleSkills: Array.isArray(data.roleSkills) ? data.roleSkills : [],
    };
  }

  const genericList = () => skillData().generic.filter((skill) => skill && typeof skill.id === 'string');
  const roleList = () => skillData().roleSkills.filter((skill) => skill && typeof skill.id === 'string');
  const skillById = (id) => genericList().concat(roleList()).find((skill) => skill.id === id) || null;
  const levelOf = (skill) => (Number.isInteger(skill && skill.level) && skill.level > 0 ? skill.level : 1);
  const clone = (skill) => ({ ...skill, effects: { ...(skill.effects || {}) } });

  /** 某 agent 可学的候选池：通用 + 当前职业，未学且等级够 */
  function poolOf(agent) {
    const learned = new Set(Array.isArray(agent && agent.skills) ? agent.skills : []);
    const level = Number.isInteger(agent && agent.level) ? agent.level : 1;
    const role = agent && agent.role;
    const filter = (skill) => !learned.has(skill.id) && levelOf(skill) <= level;
    const byLevel = (a, b) => levelOf(a) - levelOf(b) || a.id.localeCompare(b.id);
    return {
      generic: genericList().filter(filter).sort(byLevel),
      role: roleList().filter((skill) => skill.role === role).filter(filter).sort(byLevel),
    };
  }

  /**
   * 返回 3 个候选（通用 + 职业交替），按等级 / 未学过滤。
   * 候选池不足 3 个时返回剩余数量。
   * @param {object} agent
   * @returns {Array<object>}
   */
  function available(agent) {
    if (!agent || typeof agent !== 'object') return [];
    const pool = poolOf(agent);
    const result = [];
    const max = Math.max(pool.generic.length, pool.role.length);
    for (let i = 0; i < max && result.length < 3; i += 1) {
      if (pool.generic[i]) result.push(clone(pool.generic[i]));
      if (pool.role[i] && result.length < 3) result.push(clone(pool.role[i]));
    }
    return result;
  }

  /**
   * 学习技能：消耗 agent.skillPoints，写入 agent.skills。
   * 失败返回 false + ctx.log；成功返回 true。
   * @param {object} ctx
   * @param {number} agentId
   * @param {string} skillId
   * @returns {boolean}
   */
  function learn(ctx, agentId, skillId) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    const agent = (Array.isArray(s.agents) ? s.agents : []).find((item) => item.id === agentId);
    if (!agent) {
      log(ctx, '找不到这个 agent，可能已经归档了。');
      return false;
    }
    const skill = skillById(skillId);
    if (!skill) {
      log(ctx, '没有这个技能。');
      return false;
    }
    if (skill.kind === 'role' && skill.role !== agent.role) {
      log(ctx, `「${skill.name || skill.id}」是${skill.role}的专属技能，这个 agent 学不了。`);
      return false;
    }
    if (!Array.isArray(agent.skills)) agent.skills = [];
    if (agent.skills.includes(skill.id)) {
      log(ctx, `「${skill.name || skill.id}」已经学过了。`);
      return false;
    }
    if ((Number.isInteger(agent.level) ? agent.level : 1) < levelOf(skill)) {
      log(ctx, `「${skill.name || skill.id}」需要 Lv${levelOf(skill)}。`);
      return false;
    }
    const points = Math.max(0, Math.round(finite(agent.skillPoints, 0)));
    if (points < RULES.skillPointCost) {
      log(ctx, '技能点不够，先升级或攒点。');
      return false;
    }

    agent.skillPoints = points - RULES.skillPointCost;
    agent.skills.push(skill.id);
    log(ctx, `🧠「${agent.name}」学会了「${skill.name || skill.id}」。`);
    if (typeof ctx.emit === 'function') ctx.emit('skill', { agentId: agent.id, skillId: skill.id });
    return true;
  }

  /**
   * 汇总 agent 已学技能的效果；同一 key 相加，保留两位小数。
   * 返回至少包含 work / quality / token / sync / accident 等常用键。
   * @param {object} agent
   * @returns {object}
   */
  function effects(agent) {
    const out = {};
    if (agent && Array.isArray(agent.skills)) {
      for (const id of agent.skills) {
        const skill = skillById(id);
        if (!skill || !skill.effects || typeof skill.effects !== 'object') continue;
        for (const [key, value] of Object.entries(skill.effects)) {
          if (typeof value !== 'number' || !isFinite(value)) continue;
          out[key] = (Number.isFinite(out[key]) ? out[key] : 0) + value;
        }
      }
    }
    for (const key of ['work', 'quality', 'token', 'sync', 'accident', 'relation', 'compliance']) {
      if (!Number.isFinite(out[key])) out[key] = 0;
    }
    for (const key of Object.keys(out)) out[key] = U.round2(out[key]);
    return out;
  }

  /**
   * 洗点：清空技能并退回技能点；首次免费，之后扣现金。
   * 失败返回 false + ctx.log；成功返回 true。
   * @param {object} ctx
   * @param {number} agentId
   * @returns {boolean}
   */
  function respec(ctx, agentId) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    const agent = (Array.isArray(s.agents) ? s.agents : []).find((item) => item.id === agentId);
    if (!agent) {
      log(ctx, '找不到这个 agent，可能已经归档了。');
      return false;
    }
    const learned = Array.isArray(agent.skills) ? agent.skills.filter((id) => typeof id === 'string') : [];
    if (!learned.length) {
      log(ctx, '这个 agent 还没有学过技能，不用洗点。');
      return false;
    }

    const count = Number.isInteger(agent.respecCount) && agent.respecCount >= 0 ? agent.respecCount : 0;
    const cost = count === 0 ? 0 : RULES.respecCost;
    if (cost > 0 && finite(s.cash, 0) < cost) {
      log(ctx, `洗点需要 ${typeof ctx.yuan === 'function' ? ctx.yuan(cost) : cost}，现金不足。`);
      return false;
    }
    if (cost > 0) s.cash -= cost;
    agent.skills = [];
    agent.skillPoints = Math.max(0, Math.round(finite(agent.skillPoints, 0))) + learned.length;
    agent.respecCount = count + 1;
    log(ctx, `🧼「${agent.name}」洗点完成，退回 ${learned.length} 技能点${cost ? `，花费 ${typeof ctx.yuan === 'function' ? ctx.yuan(cost) : cost}` : '（首次免费）'}。`);
    if (typeof ctx.emit === 'function') ctx.emit('respec', { agentId: agent.id, refund: learned.length, cost });
    return true;
  }

  return { available, learn, effects, respec };
});
