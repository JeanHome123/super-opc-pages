// js/data/chapters.js —— 2.0 四幕章节与信条
// 目标只用声明式 metric / target / op，不写函数；文案在 data.copy.chapters。
// op 目前只有 'gte'；判定为每幕全部目标达成（AND），到 endDay 仍未达成时由 domain 写日志后放行。
OPC.define('data.chapters', ['data.copy', 'data.balance'], function (C, B) {
  'use strict';

  const TEXT = C.chapters;

  const acts = [
    {
      id: 'act.survive',
      index: 1,
      startDay: 1,
      endDay: 30,
      goals: [
        { id: 'goal.survive.orders', metric: 'delivered', op: 'gte', target: 3 },
        { id: 'goal.survive.cash', metric: 'cash', op: 'gte', target: 0 },
      ],
    },
    {
      id: 'act.foothold',
      index: 2,
      startDay: 31,
      endDay: 90,
      goals: [
        { id: 'goal.foothold.mrr', metric: 'mrr', op: 'gte', target: 5000 },
        { id: 'goal.foothold.agents', metric: 'agents', op: 'gte', target: 3 },
        { id: 'goal.foothold.delivered', metric: 'delivered', op: 'gte', target: 10 },
      ],
    },
    {
      id: 'act.expand',
      index: 3,
      startDay: 91,
      endDay: 180,
      goals: [
        { id: 'goal.expand.agents', metric: 'agents', op: 'gte', target: 5 },
        { id: 'goal.expand.mrr', metric: 'mrr', op: 'gte', target: 20000 },
        { id: 'goal.expand.cash', metric: 'cash', op: 'gte', target: 300000 },
      ],
    },
    {
      id: 'act.define',
      index: 4,
      startDay: 181,
      endDay: 365,
      goals: [
        { id: 'goal.define.cash', metric: 'operatingCash', op: 'gte', target: B.goal },
        { id: 'goal.define.rep', metric: 'rep', op: 'gte', target: 80 },
        { id: 'goal.define.agents', metric: 'agents', op: 'gte', target: 8 },
      ],
    },
  ].map((act) => ({
    ...act,
    ...TEXT.acts[act.id],
    goals: act.goals.map((goal) => ({ ...goal, ...TEXT.goals[goal.id] })),
  }));

  // 8 个信条，每幕结束可记录 1 个；effects 由 economy.boosts 汇总。
  const creeds = [
    { id: 'creed.quality', effects: { quality: 0.05, duration: 0.1 } },
    { id: 'creed.speed', effects: { work: 0.1, quality: -0.05 } },
    { id: 'creed.agent', effects: { sync: 0.1, token: 0.1 } },
    { id: 'creed.profit', effects: { revenue: 0.05, rep: -3 } },
    { id: 'creed.open', effects: { fans: 0.2, copyRisk: 0.3 } },
    { id: 'creed.independent', effects: { valuation: 0.1, cashPressure: 0.1 } },
    { id: 'creed.customer', effects: { relation: 0.15, profit: -0.05 } },
    { id: 'creed.tech', effects: { rp: 0.2, commercialization: -0.1 } },
  ].map((row) => ({ ...row, ...TEXT.creeds[row.id] }));

  return { version: 1, acts, creeds, creedSlots: 1 };
});
