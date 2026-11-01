// 需求验收与甲方关系；不依赖 UI，也不自行发放交付款。
OPC.define('domain.contracts', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  /** 只读需求判定；未见过的旧卡按项目基本质量要求验收。 */
  function evaluate(s, project, quality) {
    return (project.needs || []).map(need => {
      let met = quality >= project.minQ;
      if (need.id === 'need.feature.core') met = project.done >= project.work && quality >= project.minQ;
      if (need.id === 'need.quality.usable') met = quality >= B.contracts.usableQuality;
      if (need.id === 'need.quality.commercial') met = quality >= B.contracts.commercialQuality;
      if (need.id === 'need.quality.stunning') met = quality >= B.contracts.stunningQuality;
      if (need.id === 'need.schedule.normal') met = s.day <= project.deadline;
      if (need.id === 'need.schedule.rush') met = s.day <= project.deadline - B.contracts.rushDays;
      if (need.id === 'need.budget.fixed') met = true; // 返工不涨合同价，额外成本由公司承担。
      if (need.id === 'need.budget.share') met = !!project.quote && project.quote.payMul < 1 && quality >= project.minQ;
      if (need.kind === 'hidden') met = quality + (project.inspected ? B.contracts.inspectQuality : 0) >= B.contracts.hiddenQuality;
      return { id: need.id, label: need.label, kind: need.kind, met };
    });
  }

  /** 调研仅一次；揭示原有卡片，不额外添加需求或暗扣钱。 */
  function inspect(ctx, id) {
    const s = ctx.s;
    const project = [...s.offers, ...s.projects].find(p => p.id === id);
    if (s.over || !project || !(project.needs || []).some(n => n.kind === 'hidden' && !n.revealed)) return false;
    if (s.cash < B.contracts.inspectCost || s.energy < B.contracts.inspectEnergy) {
      ctx.log('需求访谈需要现金和精力，当前不足。');
      return false;
    }
    project.inspected = true;
    s.cash -= B.contracts.inspectCost;
    s.energy -= B.contracts.inspectEnergy;
    project.needs.forEach(n => { n.revealed = true; });
    ctx.log(`🔎 已确认「${project.name}」全部需求；隐藏需求要求质量达到 ${B.contracts.hiddenQuality * 100}%。`);
    return true;
  }

  /** 第一次验收遗漏核心或隐藏需求时给一次返工；失败后仍可降价交付。 */
  function review(ctx, project, quality) {
    const result = evaluate(ctx.s, project, quality);
    const missed = result.filter(n => !n.met && n.kind !== 'bonus');
    if (!missed.length || project.reworked) return false;
    project.reworked = true;
    project.work = Math.max(project.work, project.done) * (1 + B.contracts.reworkRatio);
    project.deadline = Math.max(project.deadline, ctx.s.day) + B.contracts.reworkDays;
    (project.needs || []).forEach(n => { n.revealed = true; });
    ctx.log(`🔧「${project.name}」验收需返工：${missed.map(n => n.label).join('、')}；工作量增加 ${B.contracts.reworkRatio * 100}%，宽限 ${B.contracts.reworkDays} 天。`, true);
    return true;
  }

  /** 客户关系有界、稳定存档；报价、谈判、技能均在交付时生效。 */
  function settle(ctx, project, quality, failed = false) {
    const s = ctx.s;
    const id = project.client && project.client.archetype;
    if (!id) return;
    if (!s.clientRelations) s.clientRelations = {};
    const fx = OPC.require('domain.modifiers').team(s, 'relation', project.crew || []);
    const creed = OPC.require('domain.chapters').effects(s);
    const satisfied = quality >= project.minQ && evaluate(s, project, quality).every(n => n.kind === 'bonus' || n.met);
    const base = !failed && satisfied ? B.contracts.relationGain : -B.contracts.relationLoss;
    const bonus = (project.quote && project.quote.relation || 0) + (project.negotiation && project.negotiation.relation || 0);
    const gain = U.round2(base * (1 + fx + (creed.relation || 0)) + (failed ? 0 : bonus));
    s.clientRelations[id] = U.clamp((s.clientRelations[id] || 0) + gain, B.relationMin, B.relationMax);
    ctx.log(`🤝 ${project.client.name}关系 ${gain >= 0 ? '+' : ''}${gain}，当前 ${s.clientRelations[id]}。`);
  }

  return { evaluate, inspect, review, settle };
});
