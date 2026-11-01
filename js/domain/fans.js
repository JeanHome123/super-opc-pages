// js/domain/fans.js —— P1 粉丝 / 个人 IP：发内容 / 每日衰减 / 快照
// 数据来自 data/fans.js；本模块只写 s.fans / s.cash / s.energy。
OPC.define('domain.fans', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  // TODO(balance): 粉丝上限 / 每日衰减率可迁入 data/balance.js；当前按设计稿首版值。
  const RULES = {
    maxFans: 1000000,
    decayRate: 0.005,
  };

  const finite = (value, fallback = 0) => (
    typeof value === 'number' && isFinite(value) ? value : fallback
  );
  const log = (ctx, text) => { if (ctx && typeof ctx.log === 'function') ctx.log(text); };
  const money = (ctx, value) => (ctx && typeof ctx.yuan === 'function' ? ctx.yuan(value) : String(value));

  function optionalData(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      return null;
    }
  }

  function fanData() {
    const data = optionalData('data.fans');
    if (!data || typeof data !== 'object') return { channels: [], types: [] };
    return {
      channels: Array.isArray(data.channels) ? data.channels : [],
      types: Array.isArray(data.types) ? data.types : [],
    };
  }

  const channelList = () => fanData().channels.filter((channel) => channel && typeof channel.id === 'string');
  const typeList = () => fanData().types.filter((type) => type && typeof type.id === 'string');
  const channelOf = (id) => channelList().find((channel) => channel.id === id) || null;
  const typeOf = (id) => typeList().find((type) => type.id === id) || null;

  /** 粉丝状态：整数、0–1,000,000；旧档缺字段补 0 */
  function ensureState(s) {
    if (!s || typeof s !== 'object') return s;
    s.fans = U.clamp(Math.round(finite(s.fans, 0)), 0, RULES.maxFans);
    return s;
  }

  /** 粉丝层级，给 UI 一个粗略标签 */
  function tierOf(fans) {
    if (fans >= 1000000) return '超级个体';
    if (fans >= 100000) return '有影响力';
    if (fans >= 10000) return '行业熟人';
    if (fans >= 1000) return '小有名气';
    return '刚开号';
  }

  /**
   * 发一条内容：扣现金 / 精力，按渠道基础粉丝 × 内容乘数加粉丝。
   * 失败返回 false + ctx.log；成功返回 true。
   * @param {object} ctx
   * @param {string} channelId
   * @param {string} typeId
   * @returns {boolean}
   */
  function post(ctx, channelId, typeId) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    const channel = channelOf(channelId);
    if (!channel) {
      log(ctx, '没有这个发布渠道。');
      return false;
    }
    const type = typeOf(typeId);
    if (!type) {
      log(ctx, '没有这种内容类型。');
      return false;
    }

    const cost = Math.max(0, Math.round(finite(channel.cost, 0)));
    const energy = Math.max(0, Math.round(finite(channel.energy, 0)));
    const cash = finite(s.cash, 0);
    const energyNow = finite(s.energy, 0);
    if (cash < cost) {
      log(ctx, `在「${channel.name || channel.id}」发内容需要 ${money(ctx, cost)}，现金不足。`);
      return false;
    }
    if (energyNow < energy) {
      log(ctx, `在「${channel.name || channel.id}」发内容需要 ${energy} 点精力，今天不够。`);
      return false;
    }

    s.cash = cash - cost;
    s.energy = U.clamp(energyNow - energy, 0, B.startEnergy);
    const gain = Math.max(0, Math.round(finite(channel.fansBase, 0) * finite(type.fansMul, 1)
      * (1 + (OPC.require('domain.chapters').effects(s).fans || 0))));
    s.fans = U.clamp(s.fans + gain, 0, RULES.maxFans);
    log(ctx, `📣 在「${channel.name || channel.id}」发布「${type.name || type.id}」：粉丝 +${gain}，花费 ${money(ctx, cost)} / ${energy} 精力。`);
    if (typeof ctx.emit === 'function') ctx.emit('fans', { channelId, typeId, gain, fans: s.fans });
    return true;
  }

  /**
   * 每日轻微自然衰减；粉丝太少时取整后不变，不制造负增长。
   * @param {object} ctx
   * @returns {boolean} 是否发生了衰减
   */
  function tick(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    if (s.fans <= 0) return false;
    const next = Math.round(s.fans * (1 - RULES.decayRate));
    if (next >= s.fans) return false;
    s.fans = next;
    return true;
  }

  /**
   * 给 UI 的粉丝快照：当前粉丝 / 层级 / 渠道 / 内容类型。
   * @param {object} s
   * @returns {object}
   */
  function view(s) {
    if (!s || typeof s !== 'object') {
      return { fans: 0, tier: tierOf(0), channels: [], types: [], decayRate: RULES.decayRate, maxFans: RULES.maxFans };
    }
    ensureState(s);
    return {
      fans: s.fans,
      tier: tierOf(s.fans),
      channels: channelList().map((channel) => ({ ...channel })),
      types: typeList().map((type) => ({ ...type })),
      decayRate: RULES.decayRate,
      maxFans: RULES.maxFans,
    };
  }

  return { ensureState, post, tick, view };
});
