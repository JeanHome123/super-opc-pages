// js/data/clients.js —— 2.0 甲方图鉴 / 需求卡 / 合同类型
// 纯静态表：budget / patience 是倍率，需求卡只放分类、类型与权重；文案在 data.copy.clients。
// offer.client 使用 { archetype: id, name, industry, quote }；offer.needs 从 needPool 抽 2–4 张。
OPC.define('data.clients', ['data.copy'], function (C) {
  'use strict';

  const TEXT = C.clients;

  // ---------------- 8 个甲方原型 ----------------
  // budget：预算倍率 0.6–1.5；patience：耐心倍率 0.5–1.2（越高越等得起）。
  // hiddenNeed：隐藏需求卡 id，必在 needPool 里；weakness 是甲方命门文案。
  const clients = [
    { id: 'client.wang', industry: '传统制造', budget: 0.6, patience: 0.7, hiddenNeed: 'need.hidden.export', needPool: ['need.feature.core', 'need.feature.bonus', 'need.quality.usable', 'need.schedule.normal', 'need.budget.fixed', 'need.hidden.export'] },
    { id: 'client.li', industry: '连锁餐饮', budget: 0.8, patience: 0.8, hiddenNeed: 'need.hidden.moments', needPool: ['need.feature.core', 'need.quality.stunning', 'need.schedule.normal', 'need.budget.fixed', 'need.hidden.moments'] },
    { id: 'client.zhang', industry: '投资机构', budget: 1.4, patience: 0.5, hiddenNeed: 'need.hidden.export', needPool: ['need.feature.core', 'need.feature.bonus', 'need.quality.commercial', 'need.schedule.normal', 'need.budget.fixed', 'need.hidden.export'] },
    { id: 'client.chen', industry: 'MCN', budget: 1.5, patience: 0.9, hiddenNeed: 'need.hidden.moments', needPool: ['need.feature.bonus', 'need.quality.stunning', 'need.schedule.rush', 'need.budget.share', 'need.hidden.moments'] },
    { id: 'client.zhao', industry: '国企', budget: 1.0, patience: 1.2, hiddenNeed: 'need.hidden.login', needPool: ['need.feature.core', 'need.quality.commercial', 'need.schedule.normal', 'need.budget.fixed', 'need.hidden.login'] },
    { id: 'client.lin', industry: '独立游戏', budget: 0.6, patience: 1.0, hiddenNeed: 'need.hidden.moments', needPool: ['need.feature.core', 'need.quality.stunning', 'need.schedule.normal', 'need.budget.share', 'need.hidden.moments'] },
    { id: 'client.sun', industry: '律所', budget: 1.3, patience: 0.5, hiddenNeed: 'need.hidden.export', needPool: ['need.feature.core', 'need.quality.commercial', 'need.schedule.normal', 'need.budget.fixed', 'need.hidden.export'] },
    { id: 'client.zhou', industry: '高校', budget: 0.7, patience: 1.1, hiddenNeed: 'need.hidden.export', needPool: ['need.feature.core', 'need.quality.usable', 'need.schedule.normal', 'need.budget.fixed', 'need.hidden.export'] },
  ].map((row) => ({ ...row, ...TEXT.archetypes[row.id] }));

  // ---------------- 12 张需求卡 ----------------
  // category：功能 / 质量 / 工期 / 预算 / 隐藏；kind：core / bonus / hidden；weight 供 domain 抽卡。
  const needs = [
    { id: 'need.feature.core', category: 'feature', kind: 'core', weight: 3, defaultRevealed: true },
    { id: 'need.feature.bonus', category: 'feature', kind: 'bonus', weight: 2, defaultRevealed: true },
    { id: 'need.quality.usable', category: 'quality', kind: 'core', weight: 2, defaultRevealed: true },
    { id: 'need.quality.commercial', category: 'quality', kind: 'core', weight: 2, defaultRevealed: true },
    { id: 'need.quality.stunning', category: 'quality', kind: 'bonus', weight: 1, defaultRevealed: true },
    { id: 'need.schedule.normal', category: 'schedule', kind: 'core', weight: 2, defaultRevealed: true },
    { id: 'need.schedule.rush', category: 'schedule', kind: 'bonus', weight: 1, defaultRevealed: true },
    { id: 'need.budget.fixed', category: 'budget', kind: 'core', weight: 2, defaultRevealed: true },
    { id: 'need.budget.share', category: 'budget', kind: 'bonus', weight: 1, defaultRevealed: true },
    { id: 'need.hidden.login', category: 'hidden', kind: 'hidden', weight: 2, defaultRevealed: false },
    { id: 'need.hidden.export', category: 'hidden', kind: 'hidden', weight: 2, defaultRevealed: false },
    { id: 'need.hidden.moments', category: 'hidden', kind: 'hidden', weight: 2, defaultRevealed: false },
  ].map((row) => ({ ...row, ...TEXT.needs[row.id] }));

  // ---------------- 5 种合同 ----------------
  // payMul 是相对标准报价的乘数；risk 是 domain / 事件层可识别的风险标签。
  const contracts = [
    { id: 'contract.fixed', payMul: 1, risk: 'scope' },
    { id: 'contract.hourly', payMul: 0.95, risk: 'schedule' },
    { id: 'contract.share', payMul: 0.5, risk: 'client' },
    { id: 'contract.retainer', payMul: 0.9, risk: 'capacity' },
    { id: 'contract.penalty', payMul: 1.05, risk: 'penalty' },
  ].map((row) => ({ ...row, ...TEXT.contracts[row.id] }));

  return { version: 1, clients, needs, contracts };
});
