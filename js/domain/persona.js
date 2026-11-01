// js/domain/persona.js —— 人格分配 / 同步率 / 关系 / 每日社交 / 换脑漂移
// 人格只影响 ±15% 内的数值；同步率低只影响产出，不触发离职（agent 是实例，不是员工）。
OPC.define('domain.persona', ['core.util', 'data.balance', 'data.personas'], function (U, B, P) {
  'use strict';

  /** 按 id 找本源人格 / 怪癖（数据缺失时返回 null，不让坏数据炸局） */
  const archetypeOf = id => U.byId(P.archetypes || [], id);
  const quirkOf = id => U.byId(P.quirks || [], id);

  /**
   * 给 agent 抽 1 个本源人格 + 2 个不重复怪癖。
   * 已有 memory 保留；重复调用视为「重新认识自己」，不改同步率。
   * @param {object} ctx
   * @param {object} agent
   * @returns {object} 同一个 agent
   */
  function assign(ctx, agent) {
    if (!agent) return agent;
    const archetypes = P.archetypes || [];
    if (!archetypes.length) return agent;

    const prev = agent.persona && typeof agent.persona === 'object' ? agent.persona : {};
    const archetype = U.pick(archetypes, ctx.rand);
    const pool = (P.quirks || []).slice();
    const quirks = [];
    while (quirks.length < B.quirkCount && pool.length) {
      const quirk = pool.splice(Math.floor(ctx.rand() * pool.length), 1)[0];
      quirks.push(quirk.id);
    }

    agent.persona = {
      archetype: archetype.id,
      quirks,
      sync: typeof prev.sync === 'number' && isFinite(prev.sync)
        ? U.clamp(Math.round(prev.sync), B.syncMin, B.syncMax) : B.syncDefault,
      memory: Array.isArray(prev.memory) ? prev.memory : [],
    };

    const quirkNames = quirks.map(id => (quirkOf(id) || { name: id }).name).join(' / ');
    if (ctx.log && archetype.name) {
      ctx.log(`🎭「${agent.name}」本源人格：${archetype.name}；怪癖：${quirkNames}`);
    }
    return agent;
  }

  /** 旧档 / 手动构造的 agent 缺人格时补抽；已有人格则不动 */
  function ensure(ctx, agent) {
    if (!agent.persona || !agent.persona.archetype) assign(ctx, agent);
    return agent;
  }

  /** 同步率 0–100；没有 persona 的旧 agent 按默认值算 */
  function syncOf(agent) {
    const value = agent && agent.persona ? agent.persona.sync : B.syncDefault;
    return typeof value === 'number' && isFinite(value)
      ? U.clamp(value, B.syncMin, B.syncMax) : B.syncDefault;
  }

  /** 调整同步率并夹在 0–100 @returns {number} 新值 */
  function bumpSync(agent, delta) {
    if (!agent || !agent.persona) return B.syncDefault;
    agent.persona.sync = U.clamp(syncOf(agent) + delta, B.syncMin, B.syncMax);
    return agent.persona.sync;
  }

  /** 关系键：稳定与参数顺序无关（"1:2" 与 "2:1" 同键） */
  function relationKey(idA, idB) {
    const a = String(idA);
    const b = String(idB);
    return a <= b ? `${a}:${b}` : `${b}:${a}`;
  }

  /** 读关系值 −100..100；无记录为 0 */
  function relationOf(s, idA, idB) {
    if (idA === idB) return 0;
    const value = s.relations ? s.relations[relationKey(idA, idB)] : 0;
    return typeof value === 'number' && isFinite(value)
      ? U.clamp(value, B.relationMin, B.relationMax) : 0;
  }

  /** 改关系值并夹在 −100..100 @returns {number} 新值 */
  function bumpRelation(s, idA, idB, delta) {
    if (idA === idB) return 0;
    if (!s.relations || typeof s.relations !== 'object') s.relations = {};
    const key = relationKey(idA, idB);
    const next = U.clamp(relationOf(s, idA, idB) + delta, B.relationMin, B.relationMax);
    if (next === 0) delete s.relations[key];
    else s.relations[key] = next;
    return next;
  }

  /**
   * 两人同项目的配合加成。
   * @param {object} s
   * @param {number|string} idA
   * @param {number|string} idB
   * @returns {{work:number, quality:number}} 产出乘数 / 质量加成
   */
  function pairBonus(s, idA, idB) {
    const value = relationOf(s, idA, idB);
    if (value >= B.relationPartner) {
      return { work: 1 + B.relationPartnerBonus, quality: B.relationFriendBonus };
    }
    if (value >= B.relationFriend) return { work: 1, quality: B.relationFriendBonus };
    if (value <= B.relationRival) return { work: 1 - B.relationRivalPenalty, quality: 0 };
    return { work: 1, quality: 0 };
  }

  /**
   * 每日社交：在岗掉同步、空闲回同步；有概率随机两人聊一次。
   * 只改同步率与关系，不产生任何人事变动。
   * @param {object} ctx
   * @returns {boolean} 今天是否发生了社交事件
   */
  function dailySocial(ctx) {
    const s = ctx.s;
    for (const agent of s.agents) {
      const modifier = OPC.require('domain.modifiers').agent(agent, 'sync')
        + (OPC.require('domain.chapters').effects(s).sync || 0);
      const archetype = archetypeOf(agent.persona && agent.persona.archetype);
      const burnout = archetype && archetype.special ? archetype.special.burnout || 0 : 0;
      bumpSync(agent, (agent.busy ? -B.syncWorkDecay * (1 + burnout) : B.syncRestGain) + modifier);
    }
    if (s.agents.length < 2 || ctx.rand() >= B.socialChance) return false;

    const firstAt = Math.floor(ctx.rand() * s.agents.length);
    let secondAt = Math.floor(ctx.rand() * s.agents.length);
    if (secondAt === firstAt) secondAt = (secondAt + 1) % s.agents.length;
    const first = s.agents[firstAt];
    const second = s.agents[secondAt];

    const relation = OPC.require('domain.modifiers').team(s, 'relation', [first.id, second.id]);
    bumpRelation(s, first.id, second.id, B.socialRelationGain * (1 + relation));
    remember(ctx, first, `与${second.name}在咖啡机前交流。`, 'social');
    remember(ctx, second, `与${first.name}在咖啡机前交流。`, 'social');
    bumpSync(first, B.socialSyncGain);
    bumpSync(second, B.socialSyncGain);
    if (ctx.log) ctx.log(`☕「${first.name}」和「${second.name}」在咖啡机前聊了一会儿。`);
    return true;
  }

  /**
   * 换模型后的人格漂移：version +1；不同厂商按数据表概率替换 1 个怪癖。
   * @param {object} ctx
   * @param {object} agent
   * @param {string} modelId 新模型
   * @returns {object} agent
   */
  function drift(ctx, agent, modelId, previousModel) {
    agent.version = (Number.isInteger(agent.version) ? agent.version : 1) + 1;
    const cross = (P.imprints || []).find(item => item.id === 'imprint.crossVendor');
    const model = ctx.s.models.find(m => m.id === modelId);
    const sameVendor = previousModel && model && previousModel.vendor === model.vendor;
    const chance = sameVendor ? 0 : cross ? cross.quirkSwapChance || 0 : 0;
    agent.imprint = model && model.imprint || '';
    let swapped = '';
    if (chance > 0 && agent.persona && agent.persona.quirks.length && ctx.rand() < chance) {
      const current = agent.persona.quirks;
      const pool = (P.quirks || []).filter(item => !current.includes(item.id));
      if (pool.length) {
        const drop = U.pick(current, ctx.rand);
        const add = U.pick(pool, ctx.rand);
        agent.persona.quirks = current.map(id => (id === drop ? add.id : id));
        swapped = `，怪癖「${(quirkOf(drop) || { name: drop }).name}」→「${add.name}」`;
      }
    }
    remember(ctx, agent, `迁移到 ${modelId}，人格版本 v${agent.version}${swapped}`, 'model');
    if (ctx.log) ctx.log(`🧠「${agent.name}」换脑到 ${modelId}，人格漂移 v${agent.version}${swapped}`);
    return agent;
  }

  /**
   * 人格对一项数值的总加成（本源 + 怪癖，单键夹在 ±personaEffectCap）。
   * special 是概率规则，不进常态加成。
   * @param {object} agent
   * @param {string} key work|quality|token|relation|sync|offers|rp|eventWeight
   * @returns {number}
   */
  function effectsOf(agent, key) {
    if (!agent || !agent.persona || typeof agent.persona !== 'object') return key ? 0 : {};
    const total = {};
    const add = effects => {
      if (!effects || typeof effects !== 'object') return;
      for (const [name, value] of Object.entries(effects)) {
        if (typeof value !== 'number' || !isFinite(value)) continue;
        total[name] = (total[name] || 0) + value;
      }
    };
    add((archetypeOf(agent.persona.archetype) || {}).effects);
    add(((P.imprints || []).find(x => x.id === agent.imprint) || {}).effects);
    for (const id of agent.persona.quirks || []) add((quirkOf(id) || {}).effects);
    for (const name of Object.keys(total)) {
      total[name] = U.clamp(total[name], -B.personaEffectCap, B.personaEffectCap);
    }
    return key ? (total[key] || 0) : total;
  }

  /** 记忆有界，Fork 深拷贝、归档和换模型都保留。 */
  function remember(ctx, agent, text, kind) {
    if (!agent || !agent.persona) return;
    if (!Array.isArray(agent.persona.memory)) agent.persona.memory = [];
    agent.persona.memory.push({ day: ctx.s.day, text, kind });
    if (agent.persona.memory.length > B.memoryMax) agent.persona.memory.shift();
  }

  return {
    remember, assign, ensure, syncOf, bumpSync, relationKey, relationOf, bumpRelation,
    pairBonus, dailySocial, drift, effectsOf,
  };
});
