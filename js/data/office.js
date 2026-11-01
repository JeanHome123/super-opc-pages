// js/data/office.js —— 2.0 办公室阶段
// 纯静态表：slots 是并发工位上限，rent 是月租，cost 是升到该阶段的一次性费用。
// 中文名 / 描述 / 搬迁台词在 data.copy.office.stages。
OPC.define('data.office', ['data.copy'], function (C) {
  'use strict';

  const TEXT = C.office.stages;

  // index 0 = 开局客厅，cost 为 0；后续 cost 是搬迁 + 装修的一次性支出。
  const stages = [
    { id: 'livingRoom', index: 0, slots: 2, rent: 2500, cost: 0, facilitySlots: 1 },
    { id: 'coworking', index: 1, slots: 4, rent: 5000, cost: 15000, facilitySlots: 2 },
    { id: 'studio', index: 2, slots: 6, rent: 12000, cost: 45000, facilitySlots: 3 },
    { id: 'floor', index: 3, slots: 8, rent: 30000, cost: 150000, facilitySlots: 4 },
    { id: 'campus', index: 4, slots: 12, rent: 60000, cost: 400000, facilitySlots: 6 },
  ].map((row) => ({ ...row, ...TEXT[row.id] }));

  return { version: 1, initialStage: 'livingRoom', stages };
});
