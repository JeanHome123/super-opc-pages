// js/data/finance.js —— P2 融资：3 轮 + 4 位投资人
// 纯静态表：amount 是现金，equity 是出让比例（0~1），minDay 是最早可谈日期。
// 文案在 data.copy6.js；估值 / 校验 / 历史在 domain/finance.js。
OPC.define('data.finance', ['data.copy6'], function (C) {
  'use strict';

  const TEXT = C.rounds || {};
  const INVESTOR_TEXT = C.investors || {};

  const rounds = [
    {
      id: 'round.angel', round: 1, amount: 500000, equity: 0.1, minDay: 0,
      valuationMul: 1,
    },
    {
      id: 'round.preA', round: 2, amount: 2000000, equity: 0.15, minDay: 90,
      valuationMul: 1,
    },
    {
      id: 'round.a', round: 3, amount: 10000000, equity: 0.2, minDay: 180,
      valuationMul: 1,
    },
  ].map((row) => {
    const text = TEXT[row.id] || {};
    return {
      ...row,
      name: text.name || row.id,
      desc: text.desc || '',
      term: text.term || '',
    };
  });

  // 投资人：round 表示领投轮次；amount / equity 是该投资人给出的具体条款。
  // valuationMul 只影响展示估值，不改变现金与股权；骗子用高估值换信任，随后卷款。
  const investors = [
    {
      id: 'investor.laozhang', name: '老张', round: 1, amount: 500000, equity: 0.1,
      minDay: 0, valuationMul: 1, style: 'friendly',
    },
    {
      id: 'investor.lisa', name: 'Lisa', round: 2, amount: 2000000, equity: 0.15,
      minDay: 90, valuationMul: 1.1, style: 'aggressive',
    },
    {
      id: 'investor.wang', name: '王总', round: 3, amount: 10000000, equity: 0.2,
      minDay: 180, valuationMul: 1.2, style: 'resourceful',
    },
    {
      id: 'investor.fraud', name: '骗子', round: 3, amount: 10000000, equity: 0.05,
      minDay: 180, valuationMul: 2, style: 'fraud',
      fraudLossRate: 0.8, fraudRepLoss: 20,
    },
  ].map((row) => {
    const text = INVESTOR_TEXT[row.id] || {};
    return {
      ...row,
      name: text.name || row.name,
      desc: text.desc || '',
      term: text.term || '',
    };
  });

  return { version: 1, rounds, investors };
});
