// js/domain/negotiation.js —— P1 谈判小游戏：3 回合 / 5 张手牌 / 写回 offer
// 数据来自 data/negotiation.js；本模块只写 s.negotiation / s.offers / s.rep。
OPC.define('domain.negotiation', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  const RULES = {
    rounds: 3,
    handSize: 5,
    initialBars: { budget: 60, patience: 20, bottom: 40, chance: 15 },
    priceMulRange: [0.8, 1.3],
    daysRange: [-5, 5],
    relationRange: [-15, 15],
    failRepLoss: 3,
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

  function negotiationData() {
    const data = optionalData('data.negotiation');
    if (!data || typeof data !== 'object') return { cards: [], rules: {} };
    return {
      cards: Array.isArray(data.cards) ? data.cards : [],
      rules: data.rules && typeof data.rules === 'object' ? data.rules : {},
    };
  }

  function rulesOf() {
    const data = negotiationData().rules || {};
    return {
      ...RULES,
      ...data,
      initialBars: { ...RULES.initialBars, ...(data.initialBars || {}) },
    };
  }

  const cardList = () => negotiationData().cards.filter((card) => card && typeof card.id === 'string');
  const cardOf = (id) => cardList().find((card) => card.id === id) || null;

  /** 状态补全：坏 negotiation 视为 null；活动状态只修常用字段，不重置进度 */
  function ensureState(s) {
    if (!s || typeof s !== 'object') return s;
    if (s.negotiation !== null && (typeof s.negotiation !== 'object' || Array.isArray(s.negotiation))) {
      s.negotiation = null;
    }
    if (!s.negotiation) return s;
    const state = s.negotiation;
    if (!Number.isInteger(state.round) || state.round < 1) state.round = 1;
    if (!Array.isArray(state.hand)) state.hand = [];
    if (!Array.isArray(state.played)) state.played = [];
    state.hand = state.hand.filter((id) => typeof id === 'string');
    state.played = state.played.filter((id) => typeof id === 'string');
    if (!state.bars || typeof state.bars !== 'object' || Array.isArray(state.bars)) {
      state.bars = { ...rulesOf().initialBars };
    } else {
      for (const key of ['budget', 'patience', 'bottom', 'chance']) {
        state.bars[key] = U.clamp(finite(state.bars[key], 0), 0, 100);
      }
    }
    if (state.result !== undefined && state.result !== null && typeof state.result !== 'object') state.result = null;
    return s;
  }

  /** 甲方命门：优先取甲方数据，缺失时用隐藏需求 */
  function weaknessOf(offer) {
    if (!offer) return '';
    const data = optionalData('data.clients');
    const list = data && Array.isArray(data.clients) ? data.clients : [];
    const archetype = offer.client && offer.client.archetype;
    const def = list.find((client) => client && client.id === archetype);
    return def && def.weakness ? def.weakness : (offer.hiddenNeedId || '');
  }

  /**
   * 开始谈判：从 5 张手牌开始，最多 3 回合。
   * @param {object} ctx
   * @param {number} offerId
   * @returns {boolean}
   */
  function start(ctx, offerId) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    if (s.negotiation) {
      log(ctx, '已经有一场谈判在进行，先结束它。');
      return false;
    }
    const offer = (Array.isArray(s.offers) ? s.offers : []).find((item) => item.id === offerId);
    if (!offer) {
      log(ctx, '找不到这张订单，可能已经过期了。');
      return false;
    }
    if (offer.negotiated) {
      log(ctx, '这张订单已经谈过了。');
      return false;
    }
    const rules = rulesOf();
    s.negotiation = {
      offerId: offer.id,
      round: 1,
      hand: cardList().slice(0, rules.handSize).map((card) => card.id),
      played: [],
      bars: { ...rules.initialBars },
      weakness: weaknessOf(offer),
      result: null,
      baseReward: finite(offer.reward, 0),
      baseDays: finite(offer.days, 0),
    };
    log(ctx, `🤝 开始和「${offer.client ? offer.client.name : '客户'}」谈判，底牌：${s.negotiation.weakness || '看不出来'}。`);
    return true;
  }

  /** 给 UI 的谈判快照；无谈判返回 null */
  function pendingView(s) {
    if (!s || typeof s !== 'object') return null;
    ensureState(s);
    const state = s.negotiation;
    if (!state) return null;
    const rules = rulesOf();
    const hand = state.hand.map(cardOf).filter(Boolean).map((card) => ({ ...card, effects: { ...card.effects } }));
    return {
      offerId: state.offerId,
      round: state.round,
      totalRounds: rules.rounds,
      hand,
      played: [...state.played],
      bars: { ...state.bars },
      weakness: state.weakness || '',
      result: state.result ? { ...state.result } : null,
      done: !!state.result,
    };
  }

  /** 应用一张手牌：更新三条 / 机会，第三张或条归零时自动结算 */
  function play(ctx, cardId) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    const state = s.negotiation;
    if (!state) {
      log(ctx, '现在没有正在进行的谈判。');
      return false;
    }
    if (state.result) {
      log(ctx, '这场谈判已经结束了。');
      return false;
    }
    if (!state.hand.includes(cardId) || state.played.includes(cardId)) {
      log(ctx, '这张牌不在手里，或者已经打过了。');
      return false;
    }
    const card = cardOf(cardId);
    if (!card) {
      log(ctx, '没有这张谈判牌。');
      return false;
    }

    const effects = card.effects || {};
    const bars = { ...state.bars };
    for (const key of ['patience', 'budget', 'chance']) {
      if (Number.isFinite(effects[key])) bars[key] = U.clamp(finite(bars[key], 0) + effects[key], 0, 100);
    }
    state.bars = bars;
    state.played.push(card.id);
    state.round = Math.min(rulesOf().rounds, state.round + 1);
    log(ctx, `🃏 打出「${card.name || card.id}」。`);

    const rules = rulesOf();
    if (bars.chance <= 0 || bars.patience <= 0 || state.played.length >= rules.rounds) {
      resolve(ctx);
    }
    return true;
  }

  /** 结算：成功写回 offer.reward / days；大失败移除订单并扣声誉 */
  function resolve(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    const state = s.negotiation;
    if (!state) {
      log(ctx, '现在没有正在进行的谈判。');
      return false;
    }
    if (state.result) return true;

    const rules = rulesOf();
    const failedBars = state.bars.chance <= 0 || state.bars.patience <= 0;
    if (state.played.length < rules.rounds && !failedBars) {
      log(ctx, `还需要出 ${rules.rounds - state.played.length} 张牌才能结算。`);
      return false;
    }

    let priceMul = 1;
    let days = 0;
    let relation = 0;
    for (const id of state.played) {
      const card = cardOf(id);
      if (!card || !card.effects) continue;
      if (Number.isFinite(card.effects.priceMul)) priceMul *= card.effects.priceMul;
      if (Number.isFinite(card.effects.days)) days += card.effects.days;
      if (Number.isFinite(card.effects.relation)) relation += card.effects.relation;
    }
    priceMul = U.clamp(U.round2(priceMul), rules.priceMulRange[0], rules.priceMulRange[1]);
    days = U.clamp(Math.round(days), rules.daysRange[0], rules.daysRange[1]);
    relation = U.clamp(Math.round(relation), rules.relationRange[0], rules.relationRange[1]);

    const offer = (Array.isArray(s.offers) ? s.offers : []).find((item) => item.id === state.offerId);
    if (failedBars || !offer) {
      if (offer) s.offers = s.offers.filter((item) => item.id !== offer.id);
      s.rep = U.clamp(finite(s.rep, 0) - rules.failRepLoss, 0, B.reputationMax);
      state.result = {
        ok: false,
        reason: !offer ? 'offerMissing' : state.bars.patience <= 0 ? 'patience' : 'chance',
        priceMul,
        days,
        relation,
        repLoss: rules.failRepLoss,
      };
      log(ctx, `💥 谈判失败，客户离席，订单消失，声誉 -${rules.failRepLoss}。`);
      if (typeof ctx.emit === 'function') ctx.emit('negotiation', { ok: false, offerId: state.offerId });
      return true;
    }

    offer.reward = Math.max(1, Math.round(finite(state.baseReward, offer.reward) * priceMul));
    offer.days = Math.max(1, Math.round(finite(state.baseDays, offer.days) + days));
    offer.negotiated = true;
    offer.negotiation = { priceMul, days, relation };
    state.result = {
      ok: true,
      priceMul,
      days,
      relation,
      reward: offer.reward,
      daysTotal: offer.days,
    };
    log(ctx, `✅ 谈判达成：报价 ${money(ctx, offer.reward)}（×${priceMul}），工期 ${days >= 0 ? '+' : ''}${days} 天，关系 ${relation >= 0 ? '+' : ''}${relation}。`);
    if (typeof ctx.emit === 'function') ctx.emit('negotiation', { ok: true, offerId: offer.id, result: state.result });
    return true;
  }

  /** 跳过谈判：清空状态并把订单恢复成标准报价 / 原工期 */
  function skip(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);
    const state = s.negotiation;
    if (!state) {
      log(ctx, '现在没有正在进行的谈判。');
      return false;
    }
    const offer = (Array.isArray(s.offers) ? s.offers : []).find((item) => item.id === state.offerId);
    if (offer && !state.result) {
      offer.reward = Math.max(1, Math.round(finite(state.baseReward, offer.reward)));
      offer.days = Math.max(1, Math.round(finite(state.baseDays, offer.days)));
      offer.negotiated = false;
      delete offer.negotiation;
    }
    s.negotiation = null;
    log(ctx, '⏭️ 跳过谈判，按标准报价继续。');
    return true;
  }

  return { ensureState, start, pendingView, play, resolve, skip };
});
