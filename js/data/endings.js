// js/data/endings.js —— P2 八结局（纯静态表）
// 条件只用声明式 metric / op / target，支持 { all: [] } / { any: [] } 组合；不写函数。
// 文案在 data.copy4.js；判定与遗产点在 domain/endings.js。
OPC.define('data.endings', ['data.balance', 'data.copy4'], function (B, C) {
  'use strict';

  const TEXT = C.endings || {};

  // 结局阈值：属于内容设计值，集中放在数据表；后续可迁入 data/balance.js。
  const T = {
    productUsers: 10000,
    hiddenMrr: 30000,
    hiddenRep: 80,
    compliance: 90,
    freelancerCash: 300000,
    freelancerAgents: 3,
  };

  const endings = [
    {
      id: 'ending.bankrupt',
      priority: 100,
      condition: {
        any: [
          { metric: 'over', op: 'eq', target: 'lose' },
          { metric: 'cash', op: 'lte', target: -B.credit },
        ],
      },
    },
    {
      id: 'ending.acquired',
      priority: 90,
      condition: {
        any: [
          { metric: 'over', op: 'eq', target: 'sold' },
          { metric: 'soldFor', op: 'gt', target: 0 },
        ],
      },
    },
    {
      id: 'ending.complianceBenchmark',
      priority: 80,
      condition: { metric: 'compliance', op: 'gte', target: T.compliance },
    },
    {
      id: 'ending.productEmpire',
      priority: 70,
      condition: { metric: 'productUsers', op: 'gte', target: T.productUsers },
    },
    {
      id: 'ending.hiddenChampion',
      priority: 65,
      condition: {
        all: [
          { metric: 'mrr', op: 'gte', target: T.hiddenMrr },
          { metric: 'rep', op: 'gte', target: T.hiddenRep },
        ],
      },
    },
    {
      id: 'ending.superIndividual',
      priority: 60,
      condition: { metric: 'operatingCash', op: 'gte', target: B.goal },
    },
    {
      id: 'ending.freelancer',
      priority: 40,
      condition: {
        all: [
          { metric: 'operatingCash', op: 'gte', target: T.freelancerCash },
          { metric: 'agents', op: 'lte', target: T.freelancerAgents },
        ],
      },
    },
    {
      id: 'ending.ordinary',
      priority: 0,
      condition: { metric: 'day', op: 'gte', target: 0 },
    },
  ].map((row) => {
    const text = TEXT[row.id] || {};
    return {
      ...row,
      name: text.name || row.id,
      desc: text.desc || '',
      yearbook: text.yearbook || '',
    };
  });

  return { version: 1, thresholds: T, endings };
});
