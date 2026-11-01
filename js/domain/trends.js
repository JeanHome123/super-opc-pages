// js/domain/trends.js —— P1 趋势系统：当前趋势 / 到期 / 乘数读取
// 只读 data.trends，不写 projects / economy；Lead 在 tick 与订单/成本处消费 modifier。
OPC.define('domain.trends', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  /** 趋势从第 20 天开始出现；优先使用 balance 的覆盖值 */
  const START_DAY = typeof B.trendStartDay === 'number' ? B.trendStartDay : 20;
  const HISTORY_MAX = typeof B.trendHistoryMax === 'number' ? B.trendHistoryMax : 40;

  /** 惰性读数据表：内容包未挂载时也允许加载本模块并跑空测试 */
  function trendData() {
    try {
      const data = OPC.has('data.trends') ? OPC.require('data.trends') : null;
      if (!data) return [];
      if (Array.isArray(data)) return data;
      return Array.isArray(data.trends) ? data.trends : [];
    } catch (error) {
      return [];
    }
  }

  const byId = id => trendData().find(item => item && item.id === id) || null;

  /** 补状态字段并清理坏值；state 正式迁移仍由 domain.state 负责 */
  function ensureState(s) {
    if (!s.trend || typeof s.trend !== 'object' || Array.isArray(s.trend)) s.trend = null;
    if (s.trend) {
      const valid = typeof s.trend.id === 'string'
        && Number.isFinite(s.trend.startDay) && Number.isFinite(s.trend.endDay)
        && s.trend.endDay >= s.trend.startDay;
      if (!valid) s.trend = null;
    }
    if (!Array.isArray(s.trendHistory)) s.trendHistory = [];
    s.trendHistory = s.trendHistory.filter(item => item && typeof item.id === 'string'
      && Number.isFinite(item.startDay) && Number.isFinite(item.endDay));
    if (s.trendHistory.length > HISTORY_MAX) s.trendHistory.splice(0, s.trendHistory.length - HISTORY_MAX);
    return s;
  }

  /** 当前趋势的数据快照（含 startDay / endDay）；无趋势返回 null */
  function current(s) {
    ensureState(s);
    if (!s.trend) return null;
    const def = byId(s.trend.id);
    if (!def) return { id: s.trend.id, startDay: s.trend.startDay, endDay: s.trend.endDay, effects: {} };
    return { ...def, startDay: s.trend.startDay, endDay: s.trend.endDay };
  }

  /** 趋势持续时间；duration 支持数字或 [min,max] */
  function durationOf(def, rand) {
    if (typeof def.duration === 'number' && isFinite(def.duration)) return Math.max(1, Math.round(def.duration));
    const range = Array.isArray(def.duration) ? def.duration : [15, 30];
    const low = Number.isFinite(range[0]) ? range[0] : 15;
    const high = Number.isFinite(range[1]) ? range[1] : low;
    return Math.max(1, Math.round(low + rand() * (high - low)));
  }

  /**
   * tick：有趋势时检查到期；没有趋势且 day>=20 时按 startWeight 抽一张。
   * @returns {boolean} 是否发生了开始 / 到期事件
   */
  function tick(ctx) {
    const s = ctx.s;
    ensureState(s);

    if (s.trend) {
      if (s.day < s.trend.endDay) return false;
      const expired = s.trend;
      const def = byId(expired.id);
      s.trendHistory.push({ id: expired.id, startDay: expired.startDay, endDay: expired.endDay });
      s.trend = null;
      ctx.log(`📉 趋势「${def ? def.name || def.id : expired.id}」结束。`);
      return true;
    }

    if (s.day < START_DAY) return false;
    const pool = trendData()
      .filter(def => def && def.id)
      .map(def => ({ def, w: Number.isFinite(def.startWeight) ? def.startWeight : (Number.isFinite(def.w) ? def.w : 1) }));
    const hit = U.weightedPick(pool, ctx.rand);
    if (!hit) return false;

    const duration = durationOf(hit.def, ctx.rand);
    s.trend = { id: hit.def.id, startDay: s.day, endDay: s.day + duration };
    ctx.log(`📈 趋势「${hit.def.name || hit.def.id}」开始，持续 ${duration} 天。`);
    return true;
  }

  /** 读取当前趋势的某个 effect；没有趋势时返回中性值 */
  function modifier(s, key, type) {
    const trend = current(s);
    if (!trend) return key === 'complianceRisk' ? 0 : 1;
    const effects = trend.effects || {};
    // orderTypes 是白名单：不是该类型的订单不吃 orderTypeMul
    if (key === 'orderTypeMul' && Array.isArray(trend.orderTypes) && trend.orderTypes.length
      && !trend.orderTypes.includes(type)) return 1;
    return Number.isFinite(effects[key]) ? effects[key] : (key === 'complianceRisk' ? 0 : 1);
  }

  const orderTypeMul = (s, type) => modifier(s, 'orderTypeMul', type);
  const rewardMul = s => modifier(s, 'rewardMul');
  const tokenMul = s => modifier(s, 'tokenMul');
  const modelPriceMul = s => modifier(s, 'modelPriceMul');

  return {
    ensureState, current, tick, modifier,
    orderTypeMul, rewardMul, tokenMul, modelPriceMul,
  };
});
