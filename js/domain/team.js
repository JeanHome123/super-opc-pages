// js/domain/team.js —— agent 团队：实例化 / 换模型 / 指派 / 经验 / 每日生产
// agent 是软件实例，不是员工：没有招聘、工资、离职；生命周期入口在 domain.deploy。
OPC.define('domain.team',
['core.util', 'data.balance', 'data.catalog', 'data.copy', 'domain.economy', 'domain.projects'],
function (U, B, D, C, Econ, Projects) {
  'use strict';

  /** 人格模块可能尚未挂载（分阶段集成）：惰性解析，缺省时降级为无人格加成 */
  const personaApi = () => (OPC.has('domain.persona') ? OPC.require('domain.persona') : null);
  /** 产线模块同理：缺失时不加产线加成 */

  /**
   * 职业 → 项目类型：只认 data.catalog 的自有键（toString / __proto__ 不算）。
   * 未经过迁移的非法 / 缺失职业返回 null，按「没有职业加成」继续处理任务，不抛错。
   * @param {*} role
   * @returns {string|null}
   */
  const roleType = role => (typeof role === 'string' && Object.hasOwn(D.roles, role) ? D.roles[role].type : null);

  /** 深拷贝人格，避免 Fork / 归档共享引用 */
  const clonePersona = persona => (persona ? JSON.parse(JSON.stringify(persona)) : null);

  /**
   * 造一个 agent 实例并加入团队（内部使用；对外请走 domain.deploy）。
   * 名字优先从文案池取未占用的；opts.persona 用于 Fork 时复制人格。
   * @param {object} ctx
   * @param {string} role
   * @param {string} modelId
   * @param {{persona?: object, name?: string}} [opts]
   * @returns {object} agent
   */
  function makeAgent(ctx, role, modelId, opts = {}) {
    const s = ctx.s;
    const seq = Number.isInteger(s.deploySeq) ? s.deploySeq : 1;
    s.deploySeq = seq + 1;

    const used = new Set([...s.agents, ...s.archive].map(agent => agent.name));
    const picked = C.agentNames.find(name => !used.has(name));
    const name = opts.name && !used.has(opts.name) ? opts.name : (picked || `Agent${seq}`);
    const persona = clonePersona(opts.persona) || {
      archetype: null, quirks: [], sync: B.syncDefault, memory: [],
    };

    const agent = {
      id: s.nextId++,
      name,
      role,
      modelId,
      imprint: opts.imprint || (U.byId(s.models, modelId) || {}).imprint || '',
      level: 1,
      xp: 0,
      busy: null,
      target: null,
      persona,
      skills: [],
      skillPoints: 0,
      respecCount: 0,
      version: 1,
      originDay: s.day,
    };
    s.agents.push(agent);
    const Persona = personaApi();
    if (!opts.persona && Persona) Persona.assign(ctx, agent);
    return agent;
  }

  /**
   * 换模型（收迁移费），并触发人格漂移：version +1。
   * @returns {boolean}
   */
  function setModel(ctx, agentId, modelId) {
    const s = ctx.s;
    const agent = s.agents.find(a => a.id === agentId);
    const model = U.byId(s.models, modelId);
    if (!agent || !model || agent.modelId === modelId) return false;
    if (s.cash < B.switchFee) {
      ctx.log('现金不足以支付迁移费。');
      return false;
    }
    s.cash -= B.switchFee;
    const previousModel = U.byId(s.models, agent.modelId);
    agent.modelId = modelId;
    ctx.log(`「${agent.name}」切换到 ${model.name}（迁移费 ${ctx.yuan(B.switchFee)}）。`);
    const Persona = personaApi();
    if (Persona) Persona.drift(ctx, agent, modelId, previousModel);
    return true;
  }

  /** 手动指派项目；projectId 为 null 表示自动分配 */
  function setTarget(ctx, agentId, projectId) {
    const s = ctx.s;
    const agent = s.agents.find(a => a.id === agentId);
    if (!agent) return false;
    agent.target = s.projects.some(p => p.id === projectId) ? projectId : null;
    return true;
  }

  /** 加经验并处理升级（最高 B.maxLevel） */
  function gainXp(ctx, agent, amount) {
    agent.xp += amount;
    while (agent.level < B.maxLevel && agent.xp >= agent.level * B.xpPerLevel) {
      agent.xp -= agent.level * B.xpPerLevel;
      agent.level++;
      agent.skillPoints = (Number.isInteger(agent.skillPoints) ? agent.skillPoints : 0) + 1;
      ctx.log(`⬆️「${agent.name}」升级到 Lv${agent.level}（技能点 +1）`);
    }
  }

  /** 今日 CEO 行动：精力结算 + 行动效果 @param {object} ctx */
  function ceoAction(ctx) {
    const s = ctx.s;
    let action = D.actions[s.action] || D.actions[B.defaultAction];

    // 自动化：精力低时当天改休息（不覆盖玩家选择的行动）
    if (s.auto.rest && s.energy < B.autoRestBelow) action = D.actions.rest;
    // 精力不够就退回日常管理
    if (s.energy + action.energy < 0) action = D.actions.manage;

    s.energy = U.clamp(s.energy + action.energy, 0, 100);
    if (s.report) s.report.action = action.id;

    if (action.id === 'sales') {
      s.offers.push(Projects.makeOffer(ctx, { bonus: B.salesOfferBonus }));
      ctx.log('🤝 你跑了一天客户，带回一个新订单');
    } else if (action.id === 'tweet') {
      s.rep = U.clamp(s.rep + 2, 0, B.reputationMax);
    } else if (action.id === 'tune') {
      s.agents.forEach(a => gainXp(ctx, a, B.xpPerTune));
    }

    const copy = C.actions[action.id] || { name: action.id };
    const tired = s.energy < B.tiredBelow ? ' — 太累了，全员质量 -5%' : '';
    if (s.report) s.report.work.push(`👤 你：${copy.name}（精力 ${s.energy}）${tired}`);
  }

  /** agent 干活 + 烧 token（tick 的 work 阶段） @param {object} ctx */
  function workDay(ctx) {
    const s = ctx.s;
    const Persona = personaApi();
    if (Persona) s.agents.forEach(agent => Persona.ensure(ctx, agent));

    for (const agent of s.agents) {
      // 手动指派优先，否则挑同类型里截止最早的
      let project = s.projects.find(p => p.id === agent.target) || null;
      if (!project) {
        agent.target = null;
        // 非法 / 缺失职业（未迁移旧档）没有类型偏好：退化为按截止日挑任意项目，不抛错
        const type = roleType(agent.role);
        const sameType = type ? s.projects.filter(p => p.type === type) : [];
        const pool = sameType.length ? sameType : s.projects;
        project = pool.reduce((best, p) => (!best || p.deadline < best.deadline ? p : best), null);
      }

      agent.busy = project ? project.id : null;
      if (!project) {
        if (s.report) s.report.work.push(`💤 ${agent.name} 空闲`);
        continue;
      }

      const snapshot = Econ.production(s, agent, project.type, project);
      const cost = snapshot.cost;
      s.cash -= cost;
      s.month.token += cost;
      s.total.token += cost;
      if (s.report) s.report.token += cost;

      const rate = snapshot.rate * OPC.require('domain.modifiers').work(ctx, agent);
      project.done += rate;
      const quality = snapshot.quality;
      project.qsum += rate * quality;
      if (s.report) s.report.work.push(`🤖 ${agent.name} → ${project.name}：产出 ${rate.toFixed(1)}，烧 ${ctx.yuan(cost)}`);
      if (!project.crew.includes(agent.id)) project.crew.push(agent.id);

      gainXp(ctx, agent, B.xpPerWorkDay);
    }
  }

  /** 玩家设置也由领域层写入，结束后不再改变本局。 */
  function configure(ctx, key, value) {
    const s = ctx.s;
    if (s.over) return false;
    if (key === 'mode' && B.modes[value]) s.mode = value;
    else if (key === 'action' && D.actions[value]) s.action = value;
    else if (key === 'accept' || key === 'rest') s.auto[key] = !!value;
    else return false;
    return true;
  }

  return { makeAgent, setModel, setTarget, gainXp, ceoAction, workDay, configure };
});
