// js/data/rivals.js —— P1 竞对（6 家）
// 纯静态表：aggression 0–1，actions 为可执行动作 id；文案在 data.copy2.rivals / rivalActions。
OPC.define('data.rivals', ['data.copy2'], function (C) {
  'use strict';

  const TEXT = C.rivals;

  const rivals = [
    { id: 'rival.giant', aggression: 0.7, actions: ['launch', 'priceWar', 'pr', 'copy'] },
    { id: 'rival.starlight', aggression: 0.9, actions: ['stealOffer', 'bid', 'launch', 'pr'] },
    { id: 'rival.laozhang', aggression: 0.8, actions: ['stealOffer', 'bid', 'priceWar', 'pr'] },
    { id: 'rival.trio', aggression: 0.6, actions: ['stealOffer', 'priceWar', 'pr'] },
    { id: 'rival.oss', aggression: 0.3, actions: ['launch', 'pr'] },
    { id: 'rival.global', aggression: 0.5, actions: ['bid', 'launch', 'priceWar', 'copy'] },
  ].map((row) => ({ ...row, ...TEXT[row.id] }));

  return { version: 1, rivals, actionLabels: C.rivalActions };
});
