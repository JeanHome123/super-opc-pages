// js/domain/clients.js —— 甲方 / 需求卡 / 三档报价装饰
// 数据来自 data.clients；本模块只抽卡与拼装，不写 UI，也不改项目结算公式。
OPC.define('domain.clients', ['core.util', 'data.balance', 'data.clients'], function (U, B, D) {
  'use strict';

  /**
   * P0 三档报价规则表。
   * 数值来自 GAMEPLAY 5.2：低价接受率 +30% / 关系 −5；标准 0；高价接受率 −20% / 关系 +5。
   * 支付乘数按 5.3 的 0.8–1.3 取整档。P1 若要做谈判，再把这张表迁进 balance。
   */
  const QUOTE_TIERS = [
    { id: 'quote.low', label: '低价', payMul: 0.8, acceptMul: 1.3, relation: -5 },
    { id: 'quote.standard', label: '标准', payMul: 1, acceptMul: 1, relation: 0 },
    { id: 'quote.high', label: '高价', payMul: 1.2, acceptMul: 0.8, relation: 5 },
  ];

  const clone = value => JSON.parse(JSON.stringify(value));

  /**
   * 内容专用确定性随机源：同一 offer.id + 天数总是得到同一套甲方/需求卡。
   * 订单装饰属于内容选择，不消耗经济 tick 的 ctx.rand 序列，避免接单随机性被 UI 文案系统扰动。
   * 算法与 core.rng 同族（mulberry32），不使用 Math.random。
   * @param {number} seed
   * @returns {() => number}
   */
  function contentRand(seed) {
    let a = (seed >>> 0) || 1;
    return function random() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** 数据表里的需求卡按 id 查；缺失返回 null，不让坏数据炸局 */
  const needOf = id => U.byId(D.needs || [], id);

  /** 数据表里的甲方按 id 查 */
  const clientOf = id => U.byId(D.clients || [], id);

  /**
   * 从甲方图鉴抽一个甲方。
   * 只返回数据快照，不写 s；空表时返回 null。
   * @param {object} ctx
   * @param {() => number} [rand] 省略时用 ctx.rand（独立调用可注入）
   * @returns {object|null}
   */
  function makeClient(ctx, rand) {
    const list = D.clients || [];
    if (!list.length) return null;
    return clone(U.pick(list, rand || ctx.rand));
  }

  /**
   * 给一张需求卡补上 domain 需要的字段。
   * @param {object} need data.clients.needs 的一条
   * @param {boolean} isHidden 是否是甲方隐藏需求
   * @returns {object}
   */
  function needCard(need, isHidden) {
    return {
      id: need.id,
      label: need.label || need.id,
      kind: isHidden ? 'hidden' : need.kind,
      revealed: isHidden ? false : need.defaultRevealed !== false,
      weight: typeof need.weight === 'number' ? need.weight : 1,
    };
  }

  /**
   * 从甲方的 needPool 抽 2–4 张需求卡，且必含 1 张 hidden。
   * @param {object} ctx
   * @param {object} client makeClient 的返回值
   * @param {() => number} [rand]
   * @returns {Array<object>}
   */
  function buildNeeds(ctx, client, rand) {
    const random = rand || ctx.rand;
    const source = client || makeClient(ctx, random);
    if (!source) return [];
    const pool = (source.needPool || []).map(needOf).filter(Boolean);
    const fallbackPool = (D.needs || []).filter(need => need.kind !== 'hidden');
    const all = pool.length ? pool : fallbackPool;
    if (!all.length) return [];

    const hidden = needOf(source.hiddenNeed) || all.find(need => need.kind === 'hidden') || null;
    const visible = all.filter(need => !hidden || need.id !== hidden.id);
    const total = Math.min(all.length, 2 + Math.floor(random() * 3));
    const picks = [];
    if (hidden) picks.push(hidden);

    const remaining = visible.slice();
    while (picks.length < total && remaining.length) {
      const at = Math.floor(random() * remaining.length);
      picks.push(remaining.splice(at, 1)[0]);
    }
    return picks.map(need => needCard(need, hidden && need.id === hidden.id));
  }

  /**
   * 给 offer 加甲方 / 需求卡 / 三档报价。幂等：已经装饰过的直接返回。
   * @param {object} ctx
   * @param {object} offer Projects.makeOffer 的产物
   * @returns {object} 同一个 offer
   */
  function decorateOffer(ctx, offer) {
    if (!offer || typeof offer !== 'object') return offer;
    if (offer.client && Array.isArray(offer.needs) && Array.isArray(offer.quotes)) return offer;

    const client = makeClient(ctx, contentRand((offer.id || 0) * 2654435761 + (ctx.s ? ctx.s.day : 0)));
    if (!client) return offer;
    const rand = contentRand((offer.id || 0) * 2654435761 + (ctx.s ? ctx.s.day : 0) + 1);
    const needs = buildNeeds(ctx, client, rand);
    const hiddenNeed = needs.find(need => need.kind === 'hidden');
    offer.client = {
      archetype: client.id,
      name: client.name || client.id,
      industry: client.industry || '',
      quote: client.quote || '',
    };
    offer.needs = needs;
    offer.quotes = QUOTE_TIERS.map(quote => ({ ...quote }));
    // 供 P1 报价 / 谈判使用的轻量标记；P0 只展示，不参与结算。
    if (hiddenNeed) offer.hiddenNeedId = hiddenNeed.id;
    return offer;
  }

  /**
   * 取某档报价；索引非法返回 null。默认标准档（兼容旧 UI 的 accept(id)）。
   * @param {object} offer
   * @param {number} [quoteIndex]
   * @returns {object|null}
   */
  function quoteOf(offer, quoteIndex) {
    const quotes = offer && Array.isArray(offer.quotes) ? offer.quotes : [];
    if (!quotes.length) return null;
    const index = quoteIndex == null ? 1 : Number(quoteIndex);
    if (!Number.isInteger(index) || index < 0 || index >= quotes.length) return null;
    return quotes[index];
  }

  /** 标准与低价保证成交；仅高价受客户关系影响，UI 与规则共用。 */
  function acceptChance(s, offer, quoteIndex) {
    const quote = quoteOf(offer, quoteIndex);
    if (!quote) return 0;
    if (quote.acceptMul >= 1) return 1;
    const id = offer.client && offer.client.archetype;
    const relation = s.clientRelations && s.clientRelations[id] || 0;
    return U.clamp(quote.acceptMul + relation / B.quoteRelationDivisor, 0, 1);
  }

  return { QUOTE_TIERS, makeClient, buildNeeds, decorateOffer, quoteOf, acceptChance };
});
