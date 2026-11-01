// js/data/tech.js —— P2 技术树（3 条路线 × 4 个节点）
// 纯静态表：cost 是现金，rpCost 是研发点；requires 是同线前置节点 id；effects 只放数值 / unlock 字符串。
// 文案在 data.copy5.js；判定、扣费与效果汇总在 domain/tech.js。
OPC.define('data.tech', ['data.copy5'], function (C) {
  'use strict';

  const TEXT = C.lines || {};
  const NODE_TEXT = C.nodes || {};

  const lines = [
    { id: 'efficiency' },
    { id: 'quality' },
    { id: 'capability' },
  ].map((line) => ({
    ...line,
    name: TEXT[line.id] ? TEXT[line.id].name : line.id,
    desc: TEXT[line.id] ? TEXT[line.id].desc : '',
  }));

  // effects 语义：
  //   token / accident / work 是乘数（0.8 = ×0.8，1.1 = ×1.1）；
  //   quality 是加法加成（0.04 = +4 个百分点）；unlock 是能力解锁标记。
  const nodes = [
    {
      id: 'tech.eff.cache', line: 'efficiency', cost: 8000, rpCost: 3, requires: [],
      effects: { token: 0.8 },
    },
    {
      id: 'tech.eff.router', line: 'efficiency', cost: 16000, rpCost: 5, requires: ['tech.eff.cache'],
      effects: { token: 0.8 },
    },
    {
      id: 'tech.eff.distill', line: 'efficiency', cost: 30000, rpCost: 8, requires: ['tech.eff.router'],
      effects: { token: 0.8, work: 1.05 },
    },
    {
      id: 'tech.eff.automation', line: 'efficiency', cost: 50000, rpCost: 12, requires: ['tech.eff.distill'],
      effects: { token: 0.8, work: 1.1 },
    },
    {
      id: 'tech.quality.rag', line: 'quality', cost: 10000, rpCost: 3, requires: [],
      effects: { quality: 0.04, accident: 0.9 },
    },
    {
      id: 'tech.quality.eval', line: 'quality', cost: 20000, rpCost: 5, requires: ['tech.quality.rag'],
      effects: { quality: 0.05, accident: 0.88 },
    },
    {
      id: 'tech.quality.finetune', line: 'quality', cost: 35000, rpCost: 8, requires: ['tech.quality.eval'],
      effects: { quality: 0.05, accident: 0.85 },
    },
    {
      id: 'tech.quality.redteam', line: 'quality', cost: 55000, rpCost: 12, requires: ['tech.quality.finetune'],
      effects: { quality: 0.06, accident: 0.8 },
    },
    {
      id: 'tech.cap.multimodal', line: 'capability', cost: 20000, rpCost: 5, requires: [],
      effects: { work: 1.05, unlock: 'multimodal' },
    },
    {
      id: 'tech.cap.orchestration', line: 'capability', cost: 35000, rpCost: 8, requires: ['tech.cap.multimodal'],
      effects: { work: 1.08, unlock: 'orchestration' },
    },
    {
      id: 'tech.cap.ownModel', line: 'capability', cost: 80000, rpCost: 15, requires: ['tech.cap.orchestration'],
      effects: { token: 0.8, quality: 0.03, unlock: 'ownModel' },
    },
    {
      id: 'tech.cap.agiLab', line: 'capability', cost: 150000, rpCost: 25, requires: ['tech.cap.ownModel'],
      effects: { work: 1.15, quality: 0.05, unlock: 'agi' },
    },
  ].map((node) => {
    const text = NODE_TEXT[node.id] || {};
    return {
      ...node,
      name: text.name || node.id,
      desc: text.desc || '',
    };
  });

  return { version: 1, lines, nodes };
});
