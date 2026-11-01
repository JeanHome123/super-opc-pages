// js/domain/deploy.js —— agent 生命周期：部署 / 归档 / 恢复 / Fork
// 语义是「实例化软件」，不是招聘：没有面试、工资、离职、挖角。
OPC.define('domain.deploy',
['core.util', 'data.balance', 'data.catalog', 'data.copy', 'domain.economy', 'domain.team', 'domain.persona'],
function (U, B, D, C, Econ, Team, Persona) {
  'use strict';

  /**
   * 当前工位上限：优先 domain.office（A5），其次 data.office 的阶段表，最后回退 balance。
   * 用惰性解析，保证 A5 合并前 A4 也能独立跑。
   * @param {object} s
   * @returns {number}
   */
  function slotsOf(s) {
    try {
      if (OPC.has('domain.office')) return OPC.require('domain.office').slots(s);
    } catch (error) {
      // A5 未就绪：继续走数据表 / 回退值
    }
    try {
      if (OPC.has('data.office')) {
        const table = OPC.require('data.office');
        const stage = table.stages[s.office ? s.office.stage : 0];
        if (stage && typeof stage.slots === 'number') return stage.slots;
      }
    } catch (error) {
      // 数据表未就绪：继续回退
    }
    return B.maxAgents;
  }

  /** 职业的中文名（copy 缺失时回退 id，部署不因文案缺失失败） */
  const roleName = role => (C.roles[role] && C.roles[role].name) || role;

  /**
   * 部署一个新 agent 实例。
   * 失败条件：职业非法 / 模型非法 / 工位满 / 现金不足。
   * @param {object} ctx
   * @param {string} role
   * @param {string} [modelId] 省略时用当前可用模型列表第一个
   * @returns {boolean}
   */
  function deploy(ctx, role, modelId) {
    const s = ctx.s;
    if (!D.roles[role]) {
      ctx.log(`没有「${role}」这个职业，部署取消。`);
      return false;
    }
    const wanted = modelId || (s.models[0] && s.models[0].id);
    const model = U.byId(s.models, wanted);
    if (!model) {
      ctx.log('这个模型还没有上线，换一个再部署。');
      return false;
    }
    const slots = slotsOf(s);
    if (s.agents.length >= slots) {
      ctx.log(`工位已满（${slots} 个），先升级办公室或归档一个 agent。`);
      return false;
    }
    const cost = Econ.deployCost(s);
    if (s.cash < cost) {
      ctx.log(`部署需要 ${ctx.yuan(cost)}，现金不足。`);
      return false;
    }

    s.cash -= cost;
    const agent = Team.makeAgent(ctx, role, model.id);
    ctx.log(`🚀 部署「${agent.name}」（${roleName(role)} · ${model.name}），花费 ${ctx.yuan(cost)}。`);
    ctx.emit('deploy', { agent });
    return true;
  }

  /**
   * 归档：从在岗移到归档区，保留人格 / 等级 / 记忆，不占工位。
   * @param {object} ctx
   * @param {number} agentId
   * @returns {boolean}
   */
  function archive(ctx, agentId) {
    const s = ctx.s;
    const at = s.agents.findIndex(agent => agent.id === agentId);
    if (at < 0) {
      ctx.log('找不到这个 agent，可能已经归档了。');
      return false;
    }
    const cost = Econ.archiveCost(s);
    if (s.cash < cost) {
      ctx.log(`归档需要 ${ctx.yuan(cost)}，现金不足。`);
      return false;
    }

    s.cash -= cost;
    const [agent] = s.agents.splice(at, 1);
    s.projects.forEach(project => {
      project.crew = project.crew.filter(id => id !== agent.id);
    });
    const snapshot = JSON.parse(JSON.stringify(agent));
    snapshot.archivedDay = s.day;
    s.archive.push(snapshot);
    ctx.log(`📦「${agent.name}」已归档（${ctx.yuan(cost)}），人格与记忆保留。`);
    ctx.emit('archive', { agent });
    return true;
  }

  /**
   * 从归档区恢复：检查工位与冷却时间；恢复不收费。
   * @param {object} ctx
   * @param {number} archiveId 归档快照的 agent id
   * @returns {boolean}
   */
  function restore(ctx, archiveId) {
    const s = ctx.s;
    const at = s.archive.findIndex(item => item.id === archiveId);
    if (at < 0) {
      ctx.log('归档区里没有这个 agent。');
      return false;
    }
    const snapshot = s.archive[at];
    const archivedDay = typeof snapshot.archivedDay === 'number' ? snapshot.archivedDay : 0;
    const wait = B.restoreCooldownDays - (s.day - archivedDay);
    if (wait > 0) {
      ctx.log(`「${snapshot.name}」刚归档，还要 ${wait} 天才能恢复。`);
      return false;
    }
    const slots = slotsOf(s);
    if (s.agents.length >= slots) {
      ctx.log(`工位已满（${slots} 个），恢复前先腾一个位置。`);
      return false;
    }

    s.archive.splice(at, 1);
    const { archivedDay: ignored, ...agent } = snapshot;
    if (!s.models.some(m => m.id === agent.modelId)) {
      const previous = D.models.find(m => m.id === agent.modelId);
      const sameVendor = previous && s.models.filter(m => m.vendor === previous.vendor);
      const pool = sameVendor && sameVendor.length ? sameVendor : s.models;
      const fallback = pool.slice().sort((a, b) => b.release - a.release)[0];
      if (fallback) {
        agent.modelId = fallback.id;
        Persona.drift(ctx, agent, fallback.id, previous);
        ctx.log(`旧模型已下线，恢复时迁移到 ${fallback.name}。`);
      }
    }
    s.agents.push(agent);
    Persona.ensure(ctx, agent);
    ctx.log(`♻️「${agent.name}」已恢复，重新接入工作区。`);
    ctx.emit('restore', { agent });
    return true;
  }

  /**
   * Fork：复制一个人格到新实例。等级从 1 开始，人格 / 怪癖 / 记忆复制。
   * @param {object} ctx
   * @param {number} agentId
   * @returns {boolean}
   */
  function fork(ctx, agentId) {
    const s = ctx.s;
    const source = s.agents.find(agent => agent.id === agentId);
    if (!source) {
      ctx.log('找不到要 Fork 的 agent。');
      return false;
    }
    const slots = slotsOf(s);
    if (s.agents.length >= slots) {
      ctx.log(`工位已满（${slots} 个），Fork 需要先腾位置。`);
      return false;
    }
    const cost = Econ.forkCost(s, source);
    if (s.cash < cost) {
      ctx.log(`Fork 需要 ${ctx.yuan(cost)}，现金不足。`);
      return false;
    }

    s.cash -= cost;
    const persona = source.persona ? JSON.parse(JSON.stringify(source.persona)) : null;
    const copy = Team.makeAgent(ctx, source.role, source.modelId, { persona, imprint: source.imprint });
    ctx.log(`🧬 Fork「${source.name}」→「${copy.name}」（${ctx.yuan(cost)}），人格已复制。`);
    ctx.emit('fork', { source, copy });
    return true;
  }

  return { deploy, archive, restore, fork, slotsOf };
});
