// js/domain/rivals.js —— P1 竞对系统：初始化 / 行动 / 关系
// 竞对只抢单、抢标、发产品、价格战、公关、抄袭；不涉及人员变动或榜单。
OPC.define('domain.rivals', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  /**
   * 首版竞对规则。内容表只有身份 / 侵略性 / 可用动作，效果数值放这里；
   * 若 balance 以后提供同名字段则优先使用（便于统一校准）。
   */
  const RULES = {
    gapMin: 40,
    gapMax: 70,
    bidOfferMul: 0.95,
    priceWarOfferMul: 0.92,
    launchUserCut: 0.03,
    copyUserCut: 0.06,
    repLoss: { stealOffer: 1, bid: 1, launch: 1, priceWar: 2, pr: 2, copy: 1 },
    relationDelta: { stealOffer: -4, bid: -3, launch: -2, priceWar: -5, pr: -1, copy: -6 },
    counters: {
      stealOffer: '下次报价时留一手，别把底价一次说透。',
      bid: '用交付案例把标书拉开差距，而不是继续降价。',
      launch: '加快自己的产品迭代，用差异化抢回用户。',
      priceWar: '算清毛利再跟价，必要时换客户而非换价格。',
      pr: '准备一份可核对的事实清单，别让对方定义你。',
      copy: '保留版本和发布记录，下次对方抄的时候有证据。',
    },
  };

  const rule = key => (B.rivals && Number.isFinite(B.rivals[key]) ? B.rivals[key] : RULES[key]);

  /** 惰性读取 data.rivals；内容包未就绪时允许模块空转 */
  function rivalData() {
    try {
      const data = OPC.has('data.rivals') ? OPC.require('data.rivals') : null;
      if (!data) return { list: [], labels: {} };
      if (Array.isArray(data)) return { list: data, labels: {} };
      return {
        list: Array.isArray(data.rivals) ? data.rivals : [],
        labels: data.actionLabels && typeof data.actionLabels === 'object' ? data.actionLabels : {},
      };
    } catch (error) {
      return { list: [], labels: {} };
    }
  }

  const defOf = id => rivalData().list.find(def => def && def.id === id) || null;

  /** 取运行状态（ensure 兼容 ctx 或裸 state） */
  function stateOf(source) {
    return source && source.s && typeof source.s === 'object' ? source.s : source;
  }

  /** 只接受有限数字，避免坏档把 NaN 写进关系 / 倒计时 */
  function finite(value, fallback) {
    return typeof value === 'number' && isFinite(value) ? value : fallback;
  }

  /**
   * 首次调用时从 data.rivals 初始化 s.rivals；之后只补齐缺失项，不重置已有关系。
   * @param {object} source ctx 或 state
   * @returns {Array<object>}
   */
  function ensure(source) {
    const s = stateOf(source);
    if (!s || typeof s !== 'object') return [];
    if (!Array.isArray(s.rivals)) s.rivals = [];

    const defs = rivalData().list.filter(def => def && typeof def.id === 'string');
    if (!defs.length) return s.rivals;

    const previous = new Map();
    for (const entry of s.rivals) {
      if (entry && typeof entry === 'object' && typeof entry.id === 'string') previous.set(entry.id, entry);
    }

    s.rivals = defs.map(def => {
      const old = previous.get(def.id);
      return {
        id: def.id,
        relation: U.clamp(finite(old && old.relation, 0), B.relationMin, B.relationMax),
        cooldown: Math.max(0, Math.round(finite(old && old.cooldown, 0))),
        lastAction: old && old.lastAction && typeof old.lastAction === 'object' ? old.lastAction : null,
      };
    });
    return s.rivals;
  }

  /** 按 aggression 取权重；缺失时用 0.5，避免坏数据让抽签永远偏向某个 0 */
  function aggressionOf(def) {
    return U.clamp(finite(def && def.aggression, 0.5), 0, 1);
  }

  /** 随机间隔 15–30 天；随机源一律走 ctx.rand */
  function nextGap(ctx) {
    const low = Math.max(1, Math.round(rule('gapMin')));
    const high = Math.max(low, Math.round(rule('gapMax')));
    const roll = ctx && typeof ctx.rand === 'function' ? U.clamp(ctx.rand(), 0, 0.999999) : 0;
    return low + Math.floor(roll * (high - low + 1));
  }

  /** 日志金额：优先 ctx.yuan */
  function yuan(ctx, amount) {
    return ctx && typeof ctx.yuan === 'function' ? ctx.yuan(amount) : String(amount);
  }

  /** 修改声誉并夹在当前版本允许范围内 */
  function addRep(s, delta) {
    s.rep = U.clamp(s.rep + delta, 0, B.reputationMax);
  }

  /** 当前出价最高的订单；没有订单返回 null */
  function bestOffer(s) {
    const offers = Array.isArray(s.offers) ? s.offers : [];
    return offers.reduce((best, offer) => {
      if (!best) return offer;
      return finite(offer.reward, 0) > finite(best.reward, 0) ? offer : best;
    }, null);
  }

  /** 按比例削减所有订单报价，返回削减前的总额（用于日志） */
  function cutAllOffers(s, mul) {
    const offers = Array.isArray(s.offers) ? s.offers : [];
    let lost = 0;
    for (const offer of offers) {
      if (!offer || !Number.isFinite(offer.reward)) continue;
      const before = offer.reward;
      offer.reward = Math.max(1, Math.round(before * mul));
      lost += before - offer.reward;
    }
    return lost;
  }

  /** 削减产品用户，返回实际减少人数 */
  function cutProductUsers(s, rate) {
    const product = s.product;
    if (!product || product.stage === 'mvp' || !Number.isFinite(product.users) || product.users <= 0) return 0;
    const lost = Math.max(1, Math.round(product.users * rate));
    product.users = Math.max(0, product.users - lost);
    return lost;
  }

  /** 动作的领域效果；返回给日志 / UI 的可解释说明 */
  function applyAction(ctx, def, action) {
    const s = ctx.s;
    const name = def.name || def.id;
    let detail = '';
    let target = '';

    if (action === 'stealOffer') {
      const offer = bestOffer(s);
      if (offer) {
        s.offers = s.offers.filter(item => item !== offer);
        target = offer.name || offer.id || '一单';
        detail = `${name} 抢走了订单「${target}」，丢掉约 ${yuan(ctx, finite(offer.reward, 0))} 的报价。`;
      } else {
        detail = `${name} 想抢单，但你的订单板上正好没有可抢的报价。`;
      }
    } else if (action === 'bid') {
      const offer = bestOffer(s);
      if (offer && Number.isFinite(offer.reward)) {
        const before = offer.reward;
        offer.reward = Math.max(1, Math.round(before * rule('bidOfferMul')));
        detail = `${name} 用更低的标价抢「${offer.name || offer.id}」，你的报价被迫下调 ${yuan(ctx, before - offer.reward)}。`;
      } else {
        detail = `${name} 去投了一个标，你的订单板没有直接损失。`;
      }
    } else if (action === 'launch') {
      const lost = cutProductUsers(s, rule('launchUserCut'));
      detail = lost
        ? `${name} 发布同类产品，你的产品用户被分走 ${lost} 人。`
        : `${name} 发布同类产品，暂时没抢走你的用户。`;
    } else if (action === 'priceWar') {
      const lost = cutAllOffers(s, rule('priceWarOfferMul'));
      detail = lost
        ? `${name} 打价格战，你所有在板报价合计少了 ${yuan(ctx, lost)}。`
        : `${name} 打价格战，你的订单板没有可降的报价。`;
    } else if (action === 'pr') {
      detail = `${name} 发了一篇公关稿，行业群里开始有人拿你们比较。`;
    } else if (action === 'copy') {
      const lost = cutProductUsers(s, rule('copyUserCut'));
      detail = lost
        ? `${name} 抄了你的产品，你的产品用户少了 ${lost} 人。`
        : `${name} 抄了你的产品方向，但你的产品还没上线，暂时没有用户损失。`;
    } else {
      detail = `${name} 在市场上有了新动作，暂时没有直接影响你。`;
    }

    const repLoss = finite(RULES.repLoss[action], 0);
    if (repLoss) addRep(s, -repLoss);
    return { detail, target };
  }

  /** 给 UI 的只读快照：数据表的身份 + 运行时的关系 / 冷却 / 上次行动 */
  function view(s) {
    if (!s || typeof s !== 'object') return [];
    ensure(s);
    const data = rivalData();
    const labels = data.labels || {};
    return s.rivals.map(entry => {
      const def = defOf(entry.id) || {};
      return {
        id: entry.id,
        name: def.name || entry.id,
        personality: def.personality || '',
        strength: def.strength || '',
        weakness: def.weakness || '',
        aggression: aggressionOf(def),
        relation: entry.relation,
        cooldown: entry.cooldown,
        lastAction: entry.lastAction ? { ...entry.lastAction } : null,
        actions: (Array.isArray(def.actions) ? def.actions : []).map(id => ({
          id,
          label: labels[id] || id,
        })),
      };
    });
  }

  /** 当前关系值；未知竞对返回 0 */
  function relationOf(s, id) {
    const list = s && Array.isArray(s.rivals) ? s.rivals : [];
    const hit = list.find(entry => entry && entry.id === id);
    return hit && Number.isFinite(hit.relation) ? hit.relation : 0;
  }

  /**
   * 每日 tick：冷却到点后抽一个竞对（按 aggression 加权）和一个动作。
   * @param {object} ctx
   * @returns {boolean} 是否发生了竞对行动
   */
  function tick(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensure(ctx);
    if (!s.rivals.length) return false;

    const due = s.rivals.filter(entry => entry.cooldown <= 0);
    if (!due.length) {
      s.rivals.forEach(entry => { entry.cooldown = Math.max(0, entry.cooldown - 1); });
      return false;
    }

    const pool = due
      .map(entry => ({ entry, def: defOf(entry.id) }))
      .filter(item => item.def)
      .map(item => ({ ...item, w: aggressionOf(item.def) }));
    const hit = U.weightedPick(pool, ctx.rand);
    if (!hit) return false;

    const actions = (Array.isArray(hit.def.actions) ? hit.def.actions : [])
      .filter(id => typeof id === 'string' && RULES.repLoss[id] !== undefined);
    const copyRisk = OPC.require('domain.chapters').effects(s).copyRisk || 0;
    const poolActions = actions.map(id => ({ id, w: id === 'copy' || id === 'copyProduct' ? 1 + copyRisk : 1 }));
    const pickedAction = U.weightedPick(poolActions, ctx.rand);
    const action = pickedAction ? pickedAction.id : null;
    const label = (rivalData().labels || {})[action] || action || '动作';
    const result = action ? applyAction(ctx, hit.def, action) : { detail: '', target: '' };

    hit.entry.lastAction = {
      action: action || '',
      label,
      day: s.day,
      detail: result.detail,
      counter: RULES.counters[action] || '',
      flag: action ? `rival.${action}` : 'rival.unknown',
    };
    const relationDelta = finite(RULES.relationDelta[action], 0);
    hit.entry.relation = U.clamp(hit.entry.relation + relationDelta, B.relationMin, B.relationMax);

    const gap = nextGap(ctx);
    s.rivals.forEach(entry => { entry.cooldown = gap; });

    if (result.detail) ctx.log(`⚔️ ${result.detail}`);
    if (hit.entry.lastAction.counter) ctx.log(`💡 可反制：${hit.entry.lastAction.counter}`);
    if (typeof ctx.emit === 'function') {
      ctx.emit('rival', { id: hit.entry.id, action, detail: result.detail });
    }
    return true;
  }

  return { ensure, view, tick, relationOf };
});
