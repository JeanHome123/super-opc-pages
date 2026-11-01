// js/data/skills.js —— P1 技能树：12 个通用技能 + 21 个职业技能
// 职业技能复用 data.personas.skills（按 role 分组，文案沿用 data.copy.skills）；
// 通用技能结构与效果在这里，文案在 data.copy8.js。
OPC.define('data.skills', ['data.personas', 'data.copy8'], function (P, C) {
  'use strict';

  const TEXT = C.skills || {};

  // 通用技能：level 是学习门槛；effects 与人格 / 职业技能同一套加法语义。
  const generic = [
    { id: 'selfReview', level: 1, effects: { quality: 0.04 } },
    { id: 'decompose', level: 1, effects: { work: 0.05 } },
    { id: 'emotionStable', level: 2, effects: { sync: 0.08 } },
    { id: 'crossFunctional', level: 2, effects: { work: 0.03, quality: 0.03 } },
    { id: 'docObsession', level: 3, effects: { quality: 0.05, work: -0.02 } },
    { id: 'clientMind', level: 3, effects: { relation: 0.08 } },
    { id: 'rapidProto', level: 4, effects: { work: 0.08, quality: -0.02 } },
    { id: 'crisisPR', level: 4, effects: { accident: -0.06, relation: 0.04 } },
    { id: 'mentor', level: 5, effects: { sync: 0.05, quality: 0.03 } },
    { id: 'timeManagement', level: 5, effects: { work: 0.04, token: -0.03 } },
    { id: 'contrarian', level: 5, effects: { quality: 0.04, accident: 0.03 } },
    { id: 'retrospective', level: 5, effects: { quality: 0.03, work: 0.02 } },
  ].map((row) => ({
    ...row,
    kind: 'generic',
    name: TEXT[row.id] ? TEXT[row.id].name : row.id,
    desc: TEXT[row.id] ? TEXT[row.id].desc : '',
  }));

  // 职业技能：index 0–1 → Lv1，2–3 → Lv3，4–5 → Lv5。
  const roleSkills = [];
  for (const [role, list] of Object.entries(P.skills || {})) {
    (Array.isArray(list) ? list : []).forEach((row, index) => {
      roleSkills.push({
        ...row,
        role,
        kind: 'role',
        level: Math.min(5, 1 + Math.floor(index / 2) * 2),
      });
    });
  }

  return { version: 1, generic, roleSkills };
});
