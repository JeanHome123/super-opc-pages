// js/domain/pipeline.js —— P1 产线与编排加成（orchestrator 职业的核心价值）
// 产线只读 s.agents 解析成员；不写 UI，不直接改项目，只给 day / team 提供乘数。
OPC.define('domain.pipeline', ['core.util', 'data.balance', 'data.catalog'], function (U, B, D) {
  'use strict';

  // TODO(balance): 以下常量待迁入 data/balance.js（顶层或 B.pipeline 均可）：
  //   pipelineMax / pipelineMinOthers /
  //   pipelineOutputBonus / pipelineMatchBonus / pipelineNameMax。
  // 迁移前用局部 RULES 兜底，逻辑里不散落魔法数字。
  const RULES = {
    pipelineMax: 3,
    pipelineMinOthers: 2,
    pipelineOutputBonus: 0.1,
    pipelineMatchBonus: 0.05,
    pipelineNameMax: 24,
  };

  /** 优先读 balance 顶层，其次 B.pipeline 分组，最后回退局部 RULES */
  function rule(key) {
    if (Number.isFinite(B[key])) return B[key];
    if (B.pipeline && Number.isFinite(B.pipeline[key])) return B.pipeline[key];
    return RULES[key];
  }

  /** 写日志：测试 / 内容注入的 ctx 可能没有 log，产线操作本身不应因此抛错 */
  const log = (ctx, text) => { if (typeof ctx.log === 'function') ctx.log(text); };

  /** 当前在岗 agent 表：坏档 / 空档按空数组处理 */
  const agentsOf = s => (Array.isArray(s.agents) ? s.agents : []);

  /** 成员里是否有编排师 */
  const hasOrchestrator = (s, pipeline) => pipeline.agents.some(id => {
    const agent = agentsOf(s).find(item => item.id === id);
    return !!agent && agent.role === 'orchestrator';
  });

  /**
   * 产线是否处于可运转状态：全部指定成员都在岗、成员 ID 无重复、
   * 至少 1 名编排师 + 至少 pipelineMinOthers 名非编排师。
   * 归档成员不会改写产线成员，只让产线停机；恢复全部原成员后自动恢复。
   * 注意：本函数只看成员是否齐整，不看 active；加成还要求 pipeline.active。
   * @param {object} s
   * @param {object} pipeline
   * @returns {boolean}
   */
  function operational(s, pipeline) {
    const ids = Array.isArray(pipeline.agents) ? pipeline.agents : [];
    if (!ids.length) return false;
    // 旧档 / 手工编辑可能留下重复 ID：不自动去重，按无效产线处理
    if (new Set(ids).size !== ids.length) return false;
    const members = [];
    for (const id of ids) {
      const agent = agentsOf(s).find(item => item.id === id);
      if (!agent) return false; // 有成员被归档：产线停机
      members.push(agent);
    }
    const orchestrators = members.filter(agent => agent.role === 'orchestrator').length;
    const others = members.length - orchestrators;
    return orchestrators >= 1 && others >= rule('pipelineMinOthers');
  }

  /** 成员覆盖的项目类型（去重，用于 view 展示） */
  function typesOf(s, pipeline) {
    const types = [];
    for (const id of pipeline.agents) {
      const agent = agentsOf(s).find(item => item.id === id);
      const type = agent && D.roles[agent.role] ? D.roles[agent.role].type : null;
      if (type && !types.includes(type)) types.push(type);
    }
    return types;
  }

  /** 单条产线是否匹配某个项目类型：编排师负责协调，不算产线的产出类型 */
  const matchesType = (s, pipeline, projectType) => pipeline.agents.some(id => {
    const agent = agentsOf(s).find(item => item.id === id);
    if (!agent || agent.role === 'orchestrator') return false;
    return !!D.roles[agent.role] && D.roles[agent.role].type === projectType;
  });

  /**
   * 补齐 / 清洗 s.pipelines：坏条目丢弃，缺省字段补默认值。
   * 正式迁移仍由 domain.state 负责；这里保证本模块可独立运行。
   * @param {object} s
   * @returns {object} 同一个 s
   */
  function ensureState(s) {
    if (!s || typeof s !== 'object') return s;
    if (!Array.isArray(s.pipelines)) s.pipelines = [];
    s.pipelines = s.pipelines.filter(item => (
      item && typeof item === 'object' && !Array.isArray(item)
      && Number.isInteger(item.id) && typeof item.name === 'string'
      && Array.isArray(item.agents)
    ));
    for (const pipeline of s.pipelines) {
      pipeline.name = pipeline.name.trim() || `产线 ${pipeline.id}`;
      pipeline.agents = pipeline.agents.filter(id => Number.isInteger(id));
      pipeline.createdAt = Number.isInteger(pipeline.createdAt) && pipeline.createdAt >= 0
        ? pipeline.createdAt : 0;
      pipeline.active = pipeline.active !== false;
    }
    return s;
  }

  /** 校验 agentIds：数组、非空、无重复、每个都在岗 */
  function resolveAgents(s, agentIds) {
    if (!Array.isArray(agentIds) || !agentIds.length) return { error: '产线至少需要 1 名编排师和 2 名其他 agent。' };
    if (new Set(agentIds).size !== agentIds.length) return { error: '同一个 agent 不能重复加入同一条产线。' };
    const agents = [];
    for (const id of agentIds) {
      const agent = agentsOf(s).find(item => item.id === id);
      if (!agent) return { error: '产线成员里有人不在岗，先确认 agent 没有被归档。' };
      agents.push(agent);
    }
    return { agents };
  }

  /**
   * 创建一条产线：至少 1 名 orchestrator + 2 名其他 agent；同时最多 3 条启用中的产线。
   * 失败返回 false 并写日志；成功返回 true。
   * @param {object} ctx
   * @param {string} name
   * @param {number[]} agentIds
   * @returns {boolean}
   */
  function create(ctx, name, agentIds) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);

    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      log(ctx, '产线需要一个名字，方便以后在编排槽里认出来。');
      return false;
    }
    const checked = resolveAgents(s, agentIds);
    if (checked.error) {
      log(ctx, checked.error);
      return false;
    }

    const orchestrators = checked.agents.filter(agent => agent.role === 'orchestrator').length;
    const others = checked.agents.length - orchestrators;
    if (orchestrators < 1 || others < rule('pipelineMinOthers')) {
      log(ctx, '产线至少要 1 名智能体编排师 + 2 名其他 agent。');
      return false;
    }

    const active = s.pipelines.filter(pipeline => pipeline.active).length;
    if (active >= rule('pipelineMax')) {
      log(ctx, `最多同时启用 ${rule('pipelineMax')} 条产线，先停用一条再新建。`);
      return false;
    }

    const maxId = s.pipelines.reduce((max, pipeline) => Math.max(max, pipeline.id), 0);
    const seq = Number.isInteger(s.nextId) ? s.nextId : 1;
    const id = Math.max(seq, maxId + 1);
    s.nextId = id + 1;
    const displayName = trimmed.slice(0, rule('pipelineNameMax'));
    const pipeline = {
      id,
      name: displayName,
      agents: checked.agents.map(agent => agent.id),
      createdAt: Number.isInteger(s.day) ? s.day : 0,
      active: true,
    };
    s.pipelines.push(pipeline);
    log(ctx, `🏭 产线「${displayName}」上线：${checked.agents.map(agent => agent.name).join(' + ')}。`);
    if (typeof ctx.emit === 'function') ctx.emit('pipeline', { pipeline });
    return true;
  }

  /**
   * 停用一条产线（保留记录，释放编排槽）。
   * @param {object} ctx
   * @param {number} id
   * @returns {boolean}
   */
  function archive(ctx, id) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);

    const pipeline = s.pipelines.find(item => item.id === id);
    if (!pipeline) {
      log(ctx, '找不到这条产线，可能已经删除了。');
      return false;
    }
    if (!pipeline.active) {
      log(ctx, `产线「${pipeline.name}」已经停用了。`);
      return false;
    }

    pipeline.active = false;
    log(ctx, `🏭 产线「${pipeline.name}」已停用，编排槽空出来了。`);
    if (typeof ctx.emit === 'function') ctx.emit('pipeline-archive', { pipeline });
    return true;
  }

  /**
   * 产线对某类项目的加成：取启用中且成员齐整（operational）的最优一条，不叠加。
   * 基础 +10% 产出；成员职业类型匹配项目类型时再 +5% 产出与质量。
   * 成员被归档后产线停机，加成随之失效；恢复全部原成员后自动恢复。
   * 返回形状与 Persona.pairBonus 一致：{ work, quality }。
   * @param {object} s
   * @param {string} projectType
   * @returns {{work:number, quality:number}}
   */
  function bonus(s, projectType, agentId) {
    const neutral = { work: 1, quality: 0 };
    if (!s || typeof s !== 'object') return neutral;
    ensureState(s);

    let best = neutral;
    for (const pipeline of s.pipelines) {
      if (!pipeline.active || !operational(s, pipeline)) continue;
      if (agentId != null && !pipeline.agents.includes(agentId)) continue;
      const matched = matchesType(s, pipeline, projectType);
      const work = U.round2(1 + rule('pipelineOutputBonus') + (matched ? rule('pipelineMatchBonus') : 0));
      const quality = matched ? U.round2(rule('pipelineMatchBonus')) : 0;
      if (work > best.work || (work === best.work && quality > best.quality)) {
        best = { work, quality };
      }
    }
    return best;
  }

  /**
   * 给 UI 的产线快照（含成员名 / 职业 / 覆盖类型），返回新对象，不暴露内部引用。
   * @param {object} s
   * @returns {Array<object>}
   */
  function view(s) {
    if (!s || typeof s !== 'object') return [];
    ensureState(s);
    return s.pipelines.map(pipeline => {
      const agents = pipeline.agents.map(id => {
        const agent = agentsOf(s).find(item => item.id === id);
        return agent
          ? { id: agent.id, name: agent.name, role: agent.role, type: D.roles[agent.role] ? D.roles[agent.role].type : null }
          : { id, name: '已归档', role: null, type: null };
      });
      return {
        id: pipeline.id,
        name: pipeline.name,
        createdAt: pipeline.createdAt,
        active: pipeline.active,
        // 只读：成员是否齐整（不看 active），加成生效还需 active 为 true
        operational: operational(s, pipeline),
        agents,
        orchestrator: hasOrchestrator(s, pipeline),
        types: typesOf(s, pipeline),
      };
    });
  }

  return { ensureState, create, archive, bonus, view };
});
