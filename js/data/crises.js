// js/data/crises.js —— P1 危机（12 个）
// 纯静态表：window 是倒计时天数，options.effects 全部是数值（加减 / 乘数），不写函数。
// 文案在 data.copy3.crises；risk 是给 UI 用的资源标签，riskLabels 也在 copy3。
OPC.define('data.crises', ['data.copy3'], function (C) {
  'use strict';

  const TEXT = C.crises;

  const crises = [
    {
      id: 'crisis.hallucination', severity: 2, window: 5,
      options: [
        { id: 'crisis.hallucination.rollback', effects: { cash: -8000, rep: -1 }, risk: 'cash' },
        { id: 'crisis.hallucination.manual', effects: { cash: -3000, quality: 0.03, relation: -2 }, risk: 'time' },
        { id: 'crisis.hallucination.blame', effects: { rep: -6, compliance: -5 }, risk: 'reputation' },
      ],
    },
    {
      id: 'crisis.outage', severity: 3, window: 3,
      options: [
        { id: 'crisis.outage.fix', effects: { cash: -15000, rep: -3 }, risk: 'cash' },
        { id: 'crisis.outage.status', effects: { cash: -2000, rep: 2 }, risk: 'time' },
        { id: 'crisis.outage.hide', effects: { rep: -8, compliance: -5 }, risk: 'reputation' },
      ],
    },
    {
      id: 'crisis.dataLeak', severity: 3, window: 4,
      options: [
        { id: 'crisis.dataLeak.disclose', effects: { cash: -20000, rep: -4, compliance: 3 }, risk: 'cash' },
        { id: 'crisis.dataLeak.patch', effects: { cash: -8000, compliance: 5, quality: 0.02 }, risk: 'time' },
        { id: 'crisis.dataLeak.deny', effects: { rep: -10, compliance: -10 }, risk: 'compliance' },
      ],
    },
    {
      id: 'crisis.injection', severity: 2, window: 4,
      options: [
        { id: 'crisis.injection.patch', effects: { cash: -6000, quality: 0.02 }, risk: 'cash' },
        { id: 'crisis.injection.isolate', effects: { cash: -3000, token: 0.05 }, risk: 'time' },
        { id: 'crisis.injection.ignore', effects: { rep: -5, compliance: -3 }, risk: 'compliance' },
      ],
    },
    {
      id: 'crisis.modelRetire', severity: 2, window: 6,
      options: [
        { id: 'crisis.modelRetire.migrate', effects: { cash: -12000, token: 0.05 }, risk: 'cash' },
        { id: 'crisis.modelRetire.pin', effects: { cash: -4000, quality: -0.03 }, risk: 'quality' },
        { id: 'crisis.modelRetire.fork', effects: { cash: -18000, quality: 0.02, sync: 5 }, risk: 'cash' },
      ],
    },
    {
      id: 'crisis.overload', severity: 2, window: 4,
      options: [
        { id: 'crisis.overload.pause', effects: { cash: -2000, work: -0.05 }, risk: 'time' },
        { id: 'crisis.overload.restart', effects: { cash: -6000, sync: 5 }, risk: 'cash' },
        { id: 'crisis.overload.push', effects: { sync: -10, rep: -2 }, risk: 'quality' },
      ],
    },
    {
      id: 'crisis.conflict', severity: 1, window: 5,
      options: [
        { id: 'crisis.conflict.mediate', effects: { cash: -3000, relation: 5 }, risk: 'cash' },
        { id: 'crisis.conflict.isolate', effects: { work: -0.03, relation: -2 }, risk: 'time' },
        { id: 'crisis.conflict.ignore', effects: { work: -0.08, sync: -5 }, risk: 'quality' },
      ],
    },
    {
      id: 'crisis.churn', severity: 3, window: 7,
      options: [
        { id: 'crisis.churn.discount', effects: { cash: -30000, relation: 5 }, risk: 'cash' },
        { id: 'crisis.churn.replace', effects: { cash: -10000, rep: -3 }, risk: 'reputation' },
        { id: 'crisis.churn.letGo', effects: { rep: -5 }, risk: 'reputation' },
      ],
    },
    {
      id: 'crisis.priceWar', severity: 2, window: 6,
      options: [
        { id: 'crisis.priceWar.match', effects: { rewardMul: 0.85, rep: 1 }, risk: 'cash' },
        { id: 'crisis.priceWar.differentiate', effects: { cash: -5000, quality: 0.03 }, risk: 'time' },
        { id: 'crisis.priceWar.wait', effects: { cash: -10000, rep: -2 }, risk: 'cash' },
      ],
    },
    {
      id: 'crisis.copycat', severity: 2, window: 5,
      options: [
        { id: 'crisis.copycat.accelerate', effects: { cash: -12000, quality: 0.02 }, risk: 'cash' },
        { id: 'crisis.copycat.legal', effects: { cash: -15000, rep: 2 }, risk: 'time' },
        { id: 'crisis.copycat.open', effects: { fans: 0.1, rep: 3, copyRisk: 0.1 }, risk: 'reputation' },
      ],
    },
    {
      id: 'crisis.freeTier', severity: 2, window: 6,
      options: [
        { id: 'crisis.freeTier.bundle', effects: { rewardMul: 0.9, quality: 0.02 }, risk: 'cash' },
        { id: 'crisis.freeTier.niche', effects: { cash: -4000, relation: 5 }, risk: 'time' },
        { id: 'crisis.freeTier.cut', effects: { cash: -8000, quality: -0.02 }, risk: 'quality' },
      ],
    },
    {
      id: 'crisis.audit', severity: 3, window: 7,
      options: [
        { id: 'crisis.audit.cooperate', effects: { cash: -20000, compliance: 8 }, risk: 'cash' },
        { id: 'crisis.audit.lobby', effects: { cash: -10000, rep: -2, compliance: 2 }, risk: 'reputation' },
        { id: 'crisis.audit.resist', effects: { cash: -30000, compliance: -10, rep: -4 }, risk: 'compliance' },
      ],
    },
    {
      id: 'crisis.deepfake', severity: 2, window: 4,
      options: [
        { id: 'crisis.deepfake.disclose', effects: { cash: -6000, rep: 2 }, risk: 'cash' },
        { id: 'crisis.deepfake.legal', effects: { cash: -12000, rep: -1 }, risk: 'time' },
        { id: 'crisis.deepfake.ignore', effects: { rep: -8 }, risk: 'reputation' },
      ],
    },
    {
      id: 'crisis.keyAgent', severity: 3, window: 3,
      options: [
        { id: 'crisis.keyAgent.restore', effects: { cash: -12000, sync: 5 }, risk: 'cash' },
        { id: 'crisis.keyAgent.replace', effects: { cash: -6000, quality: -0.04 }, risk: 'quality' },
        { id: 'crisis.keyAgent.wait', effects: { rep: -4, work: -0.05 }, risk: 'time' },
      ],
    },
    {
      id: 'crisis.lawsuit', severity: 3, window: 7,
      options: [
        { id: 'crisis.lawsuit.settle', effects: { cash: -30000, rep: -2 }, risk: 'cash' },
        { id: 'crisis.lawsuit.fight', effects: { cash: -15000, rep: -4, compliance: 3 }, risk: 'reputation' },
        { id: 'crisis.lawsuit.delay', effects: { cash: -5000, rep: -6 }, risk: 'time' },
      ],
    },
    {
      id: 'crisis.platformBan', severity: 2, window: 5,
      options: [
        { id: 'crisis.platformBan.migrate', effects: { cash: -8000, rep: 1 }, risk: 'cash' },
        { id: 'crisis.platformBan.appeal', effects: { cash: -3000, rep: -2 }, risk: 'time' },
        { id: 'crisis.platformBan.abandon', effects: { rep: -5, cash: -2000 }, risk: 'reputation' },
      ],
    },
  ];

  const result = crises.map((crisis) => {
    const text = TEXT[crisis.id];
    return {
      ...crisis,
      ...text,
      options: crisis.options.map((option) => ({ ...option, ...text.options[option.id] })),
    };
  });

  return { version: 1, crises: result };
});
