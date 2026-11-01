// js/data/products.js —— P1 自有产品：6 赛道 / 18 功能卡 / 6 增长渠道
// 纯静态表：quality 是质量加成，users 是内测初始用户；文案在 data.copy3。
OPC.define('data.products', ['data.copy3'], function (C) {
  'use strict';

  const TEXT = C.tracks;
  const TEXT_F = C.features;
  const TEXT_CH = C.channels;

  const tracks = [
    { id: 'track.efficiency', cost: 15000, baseUsers: 50, arpu: 12, churn: 0.04, serverCost: 800 },
    { id: 'track.saas', cost: 20000, baseUsers: 40, arpu: 25, churn: 0.03, serverCost: 1200 },
    { id: 'track.content', cost: 12000, baseUsers: 80, arpu: 8, churn: 0.06, serverCost: 600 },
    { id: 'track.agent', cost: 30000, baseUsers: 30, arpu: 40, churn: 0.02, serverCost: 2000 },
    { id: 'track.education', cost: 18000, baseUsers: 45, arpu: 18, churn: 0.05, serverCost: 900 },
    { id: 'track.game', cost: 25000, baseUsers: 35, arpu: 15, churn: 0.07, serverCost: 1100 },
  ].map((row) => ({ ...row, ...TEXT[row.id] }));

  // 每条赛道 3 张功能卡；cost / buildDays 是 MVP 投入，quality / users 是基线收益，risk 是事件标签。
  const features = [
    { id: 'feature.efficiency.meeting', track: 'track.efficiency', cost: 4000, buildDays: 6, quality: 0.06, users: 120, risk: 'privacy' },
    { id: 'feature.efficiency.todo', track: 'track.efficiency', cost: 3000, buildDays: 4, quality: 0.04, users: 200, risk: 'low' },
    { id: 'feature.efficiency.kb', track: 'track.efficiency', cost: 8000, buildDays: 10, quality: 0.1, users: 80, risk: 'retrieval' },
    { id: 'feature.saas.chat', track: 'track.saas', cost: 6000, buildDays: 8, quality: 0.07, users: 90, risk: 'service' },
    { id: 'feature.saas.booking', track: 'track.saas', cost: 7000, buildDays: 9, quality: 0.08, users: 70, risk: 'calendar' },
    { id: 'feature.saas.member', track: 'track.saas', cost: 5000, buildDays: 7, quality: 0.05, users: 110, risk: 'migration' },
    { id: 'feature.content.novel', track: 'track.content', cost: 5000, buildDays: 7, quality: 0.08, users: 150, risk: 'copyright' },
    { id: 'feature.content.script', track: 'track.content', cost: 4000, buildDays: 5, quality: 0.07, users: 220, risk: 'platform' },
    { id: 'feature.content.distribute', track: 'track.content', cost: 9000, buildDays: 12, quality: 0.09, users: 60, risk: 'api' },
    { id: 'feature.agent.orchestrate', track: 'track.agent', cost: 12000, buildDays: 14, quality: 0.12, users: 40, risk: 'complexity' },
    { id: 'feature.agent.host', track: 'track.agent', cost: 15000, buildDays: 18, quality: 0.1, users: 30, risk: 'ops' },
    { id: 'feature.agent.eval', track: 'track.agent', cost: 10000, buildDays: 11, quality: 0.13, users: 35, risk: 'benchmark' },
    { id: 'feature.education.tutor', track: 'track.education', cost: 6000, buildDays: 9, quality: 0.08, users: 100, risk: 'compliance' },
    { id: 'feature.education.defense', track: 'track.education', cost: 5000, buildDays: 8, quality: 0.07, users: 80, risk: 'content' },
    { id: 'feature.education.grade', track: 'track.education', cost: 7000, buildDays: 10, quality: 0.09, users: 120, risk: 'accuracy' },
    { id: 'feature.game.npc', track: 'track.game', cost: 12000, buildDays: 15, quality: 0.11, users: 50, risk: 'latency' },
    { id: 'feature.game.text', track: 'track.game', cost: 6000, buildDays: 8, quality: 0.08, users: 90, risk: 'content' },
    { id: 'feature.game.level', track: 'track.game', cost: 9000, buildDays: 12, quality: 0.09, users: 70, risk: 'balance' },
  ].map((row) => ({ ...row, ...TEXT_F[row.id] }));

  // userGain：一次投放的预期新增用户；speed：见效速度 0–1；risk：副作用标签。
  const channels = [
    { id: 'channel.seo', cost: 3000, userGain: 120, speed: 0.25, risk: 'slow' },
    { id: 'channel.community', cost: 2000, userGain: 80, speed: 0.2, risk: 'moderation' },
    { id: 'channel.ads', cost: 12000, userGain: 500, speed: 0.8, risk: 'cash' },
    { id: 'channel.referral', cost: 4000, userGain: 300, speed: 0.5, risk: 'quality' },
    { id: 'channel.kol', cost: 15000, userGain: 800, speed: 0.7, risk: 'reputation' },
    { id: 'channel.opensource', cost: 1000, userGain: 150, speed: 0.3, risk: 'copy' },
  ].map((row) => ({ ...row, ...TEXT_CH[row.id] }));

  return { version: 1, tracks, features, channels };
});
