// js/data/fans.js —— P1 粉丝 / 个人 IP：6 个渠道 + 6 种内容
// 纯静态表：cost 现金，energy 精力，fansBase 基础粉丝，fansMul 内容乘数；risk 是给 UI / 事件用的标签。
// 文案在 data.copy10.js；发布 / 衰减 / 快照在 domain/fans.js。
OPC.define('data.fans', ['data.copy10'], function (C) {
  'use strict';

  const CHANNEL_TEXT = C.channels || {};
  const TYPE_TEXT = C.types || {};

  const channels = [
    { id: 'channel.x', cost: 0, energy: 10, fansBase: 120, risk: 'public' },
    { id: 'channel.xiaohongshu', cost: 2000, energy: 12, fansBase: 180, risk: 'image' },
    { id: 'channel.github', cost: 0, energy: 15, fansBase: 90, risk: 'leak' },
    { id: 'channel.podcast', cost: 5000, energy: 18, fansBase: 260, risk: 'time' },
    { id: 'channel.live', cost: 8000, energy: 25, fansBase: 420, risk: 'burnout' },
    { id: 'channel.community', cost: 1000, energy: 8, fansBase: 80, risk: 'spam' },
  ].map((row) => {
    const text = CHANNEL_TEXT[row.id] || {};
    return {
      ...row,
      name: text.name || row.id,
      desc: text.desc || '',
    };
  });

  const types = [
    { id: 'type.progress', fansMul: 1, risk: 'low' },
    { id: 'type.failure', fansMul: 0.8, risk: 'vulnerable' },
    { id: 'type.revenue', fansMul: 1.4, risk: 'leak' },
    { id: 'type.tutorial', fansMul: 1.1, risk: 'low' },
    { id: 'type.opinion', fansMul: 0.9, risk: 'controversy' },
    { id: 'type.case', fansMul: 1.2, risk: 'clientPrivacy' },
  ].map((row) => {
    const text = TYPE_TEXT[row.id] || {};
    return {
      ...row,
      name: text.name || row.id,
      desc: text.desc || '',
    };
  });

  return { version: 1, channels, types };
});
