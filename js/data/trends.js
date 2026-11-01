// js/data/trends.js —— P1 趋势卡（12 个）
// 纯静态表：effects 全部是数值（乘数或加减），不写函数；文案在 data.copy2.trends。
// orderTypeMul 作用于 orderTypes 里的订单类型；orderTypes 为空表示全部类型。
OPC.define('data.trends', ['data.copy2'], function (C) {
  'use strict';

  const TEXT = C.trends;

  const trends = [
    { id: 'trend.agentBoom', startWeight: 3, duration: [25, 40], orderTypes: ['agent'], effects: { orderTypeMul: 1.8, rewardMul: 1, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0.2 }, tags: ['agent', 'boom'] },
    { id: 'trend.multimodal', startWeight: 3, duration: [20, 35], orderTypes: ['content'], effects: { orderTypeMul: 1.5, rewardMul: 1.3, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0 }, tags: ['content', 'video', 'boom'] },
    { id: 'trend.openSource', startWeight: 2, duration: [20, 40], orderTypes: [], effects: { orderTypeMul: 1, rewardMul: 1, tokenMul: 1, modelPriceMul: 0.6, complianceRisk: 0.1 }, tags: ['model', 'openSource', 'price'] },
    { id: 'trend.computeShortage', startWeight: 2, duration: [20, 35], orderTypes: [], effects: { orderTypeMul: 1, rewardMul: 1, tokenMul: 1.5, modelPriceMul: 1.2, complianceRisk: 0 }, tags: ['token', 'compute'] },
    { id: 'trend.regulation', startWeight: 2, duration: [25, 40], orderTypes: ['audit'], effects: { orderTypeMul: 2, rewardMul: 1, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0.6 }, tags: ['audit', 'compliance'] },
    { id: 'trend.aiSafety', startWeight: 2, duration: [20, 35], orderTypes: ['audit'], effects: { orderTypeMul: 1.8, rewardMul: 1, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0.3 }, tags: ['audit', 'security'] },
    { id: 'trend.priceWar', startWeight: 3, duration: [15, 30], orderTypes: [], effects: { orderTypeMul: 1, rewardMul: 0.75, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0 }, tags: ['price', 'margin'] },
    { id: 'trend.privateDeploy', startWeight: 2, duration: [25, 40], orderTypes: ['agent'], effects: { orderTypeMul: 1.7, rewardMul: 1.4, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0.2 }, tags: ['agent', 'enterprise'] },
    { id: 'trend.aiHardware', startWeight: 2, duration: [20, 35], orderTypes: ['agent'], effects: { orderTypeMul: 1.5, rewardMul: 1, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0.1 }, tags: ['hardware', 'supply'] },
    { id: 'trend.agiPanic', startWeight: 1, duration: [15, 25], orderTypes: [], effects: { orderTypeMul: 0.8, rewardMul: 0.9, tokenMul: 1.2, modelPriceMul: 1.3, complianceRisk: 0.5 }, tags: ['macro', 'endgame'] },
    { id: 'trend.contentBoom', startWeight: 3, duration: [20, 35], orderTypes: ['content'], effects: { orderTypeMul: 1.4, rewardMul: 0.8, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0 }, tags: ['content', 'volume'] },
    { id: 'trend.global', startWeight: 2, duration: [25, 40], orderTypes: ['content', 'agent', 'audit'], effects: { orderTypeMul: 1.6, rewardMul: 1, tokenMul: 1, modelPriceMul: 1, complianceRisk: 0.3 }, tags: ['global', 'compliance'] },
  ].map((row) => ({ ...row, ...TEXT[row.id] }));

  return { version: 1, trends };
});
