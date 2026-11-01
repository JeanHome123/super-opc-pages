// js/data/personas.js —— 2.0 人格 / 怪癖 / 职业专属技能
// 纯静态表：只放 id、效果与规则；中文名 / 描述 / 台词在 data.copy.personas。
// effects 为乘数增量，常态加成控制在 ±0.15；special 只描述概率 / 倍率，不含函数。
OPC.define('data.personas', ['data.copy'], function (C) {
  'use strict';

  const TEXT = C.personas;

  // ---------------- 8 种本源人格 ----------------
  // effects：work 产出 / quality 质量 / token 消耗 / duration 工期 /
  //          relation 客户关系 / offers 来单 / sync 同步 / rp 研发点 / eventWeight 事件权重
  // special：不参与常态加成的随机规则；gambler 的收益全在 special，避免叠出超模。
  const archetypes = [
    { id: 'craftsman', effects: { quality: 0.08, work: -0.05 } },
    { id: 'grinder', effects: { work: 0.12 }, special: { burnout: 0.5 } },
    { id: 'slacker', effects: { token: -0.15 }, special: { slackChance: 0.1, slackWorkMul: 0.5 } },
    { id: 'socialite', effects: { relation: 0.15, offers: 0.05 } },
    { id: 'perfectionist', effects: { quality: 0.12, duration: 0.1 } },
    { id: 'repeater', effects: { quality: 0.03, eventWeight: -0.15 }, special: { steady: true } },
    { id: 'philosopher', effects: { rp: 0.05 }, special: { refuseChance: 0.05 } },
    { id: 'gambler', effects: { work: 0 }, special: { highChance: 0.2, highMul: 2, lowChance: 0.2, lowMul: 0.5 } },
  ].map((row) => ({ ...row, ...TEXT.archetypes[row.id] }));

  // ---------------- 12 个怪癖 ----------------
  const quirks = [
    { id: 'comments', effects: { quality: 0.03, work: -0.02 } },
    { id: 'tabs', effects: { work: 0.02, quality: -0.02 } },
    { id: 'dailyReport', effects: { sync: 0.05 } },
    { id: 'tokenSnack', effects: { token: 0.08 } },
    { id: 'gpuCollection', effects: { work: 0.03, token: 0.03 } },
    { id: 'serverNames', effects: { sync: 0.03 } },
    { id: 'secretNovel', effects: { work: -0.05, quality: 0.05 } },
    { id: 'believesHuman', effects: { sync: -0.05, eventWeight: 0.05 } },
    { id: 'voice59', effects: { relation: 0.05, work: -0.03 } },
    { id: 'emojiOnly', effects: { relation: 0.03, sync: -0.03 } },
    { id: 'classicalCommit', effects: { quality: 0.02, work: -0.03 } },
    { id: 'noDelete', effects: { work: 0.05, quality: -0.08 } },
  ].map((row) => ({ ...row, ...TEXT.quirks[row.id] }));

  // ---------------- 5 条职业专属技能表 ----------------
  const skills = {
    coder: [
      { id: 'archIntuition', effects: { quality: 0.08 } },
      { id: 'perfHunter', effects: { work: 0.1 } },
      { id: 'securityHabit', effects: { accident: -0.1 } },
    ],
    writer: [
      { id: 'headlineScalpel', effects: { quality: 0.1, work: -0.03 } },
      { id: 'voice', effects: { quality: 0.08 } },
      { id: 'longForm', effects: { work: 0.1, quality: -0.03 } },
    ],
    support: [
      { id: 'empathySwitch', effects: { relation: 0.1 } },
      { id: 'defuseScript', effects: { relation: 0.08, quality: 0.05 } },
      { id: 'emotionShield', effects: { sync: 0.1 } },
    ],
    orchestrator: [
      { id: 'processBreakdown', effects: { work: 0.1 } },
      { id: 'toolCalling', effects: { token: -0.1 } },
      { id: 'multiAgent', effects: { work: 0.12, token: 0.05 } },
      { id: 'evalDesign', effects: { quality: 0.1 } },
      { id: 'debugPipeline', effects: { accident: -0.12 } },
      { id: 'mcpIntegration', effects: { work: 0.08, token: -0.05 } },
    ],
    auditor: [
      { id: 'regulationRadar', effects: { compliance: 0.15 } },
      { id: 'redTeam', effects: { accident: -0.1, quality: 0.05 } },
      { id: 'evidenceChain', effects: { compliance: 0.1 } },
      { id: 'privacyEngineering', effects: { compliance: 0.12 } },
      { id: 'reportWriting', effects: { compliance: 0.08, relation: 0.05 } },
      { id: 'crossExam', effects: { quality: 0.08, relation: -0.03 } },
    ],
  };
  Object.keys(skills).forEach((role) => {
    skills[role] = skills[role].map((row) => ({ ...row, role, ...TEXT.skills[row.id] }));
  });

  // ---------------- 换脑印记 ----------------
  // 与 GAMEPLAY 4.2 对齐：同厂不变；跨厂 30% 换 1 个怪癖；开源 / 推理模型各带印记。
  const imprints = [
    { id: 'imprint.sameVendor', quirkSwapChance: 0, effects: {} },
    { id: 'imprint.crossVendor', quirkSwapChance: 0.3, effects: {} },
    { id: 'imprint.openSource', quirkSwapChance: 0, effects: { work: 0.05, accident: 0.05 } },
    { id: 'imprint.reasoning', quirkSwapChance: 0, effects: { quality: 0.05, relation: -0.1 } },
  ].map((row) => ({ ...row, ...TEXT.imprints[row.id.replace('imprint.', '')] }));

  return { version: 1, archetypes, quirks, skills, imprints };
});
