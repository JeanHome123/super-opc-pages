// js/data/negotiation.js —— P1 谈判小游戏：5 张手牌
// 纯静态表：effects 全部是数值；priceMul 是乘数，days / relation 是加减，其余是 0–100 的条。
// 文案在 data.copy9.js；三回合 / 失败 / 写回 offer 在 domain/negotiation.js。
OPC.define('data.negotiation', ['data.copy9'], function (C) {
  'use strict';

  const TEXT = C.cards || {};

  const cards = [
    {
      id: 'card.concede',
      effects: { priceMul: 0.8, days: 0, relation: -2, patience: 5, budget: 10, chance: 2 },
    },
    {
      id: 'card.firm',
      effects: { priceMul: 1.2, days: -2, relation: -5, patience: -15, budget: -5, chance: -12 },
    },
    {
      id: 'card.case',
      effects: { priceMul: 1.08, days: 0, relation: 3, patience: 4, budget: 5, chance: 4 },
    },
    {
      id: 'card.dinner',
      effects: { priceMul: 1, days: 0, relation: 8, patience: 10, budget: 0, chance: 5 },
    },
    {
      id: 'card.delay',
      effects: { priceMul: 1.03, days: 5, relation: -1, patience: -10, budget: 0, chance: -8 },
    },
  ].map((row) => {
    const text = TEXT[row.id] || {};
    return {
      ...row,
      name: text.name || row.id,
      desc: text.desc || '',
    };
  });

  // 首版谈判参数：初始三条 + 成交机会；范围与设计稿 5.3 对齐。
  const rules = {
    rounds: 3,
    handSize: 5,
    initialBars: { budget: 60, patience: 20, bottom: 40, chance: 15 },
    priceMulRange: [0.8, 1.3],
    daysRange: [-5, 5],
    relationRange: [-15, 15],
    failRepLoss: 3,
  };

  return { version: 1, cards, rules };
});
