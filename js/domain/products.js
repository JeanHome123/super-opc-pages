// js/domain/products.js —— P1 自有产品：选赛道 / 装功能 / 发布 / 增长 / 出售
// 产品 MRR 独立放在 s.product.mrr，不直接写 s.mrr；月结由 Lead 集成。
OPC.define('domain.products', ['core.util', 'data.balance', 'domain.product-state'], function (U, B, ProductState) {
  'use strict';

  /** 运营数值优先读 B.products，缺省时回退首版规则。 */
  const RULES = {
    startCost: 8000,
    maxFeatures: 3,
    seedUsers: 50,
    liveUsers: 300,
    arp: 12,              // 每用户每月收入（再乘质量系数）
    serverCostPerUser: 2, // 每用户每月服务器成本
    growthBase: 0.04,
    growthQuality: 0.08,
    churnBase: 0.08,
    churnQuality: 0.1,
    minChurn: 0.02,
    maxChurn: 0.2,
    sellBase: 10000,
    sellUserValue: 8,
    sellMrrMul: 4,
  };
  const rule = key => (
    B.products && Number.isFinite(B.products[key]) ? B.products[key] : RULES[key]
  );
  /** 惰性读 data.products，内容包未就绪时也能加载本模块 */
  function productData() {
    try {
      const data = OPC.has('data.products') ? OPC.require('data.products') : null;
      if (!data) return { tracks: [], features: [], channels: [] };
      return {
        tracks: Array.isArray(data.tracks) ? data.tracks : [],
        features: Array.isArray(data.features) ? data.features : [],
        channels: Array.isArray(data.channels) ? data.channels : [],
      };
    } catch (error) {
      return { tracks: [], features: [], channels: [] };
    }
  }
  const trackOf = id => productData().tracks.find(track => track && track.id === id) || null;
  const featureOf = id => productData().features.find(feature => feature && feature.id === id) || null;
  const channelOf = id => productData().channels.find(channel => channel && channel.id === id) || null;
  /** 旧档缺 s.product 时补 null；坏对象视为没有产品 */
  function ensureState(s) {
    s.product = ProductState.normalize(s.product, s.day);
    return s;
  }

  /** 赛道启动成本：数据里有 track.cost 就用，否则用首版规则 */
  function startCostOf(track) {
    return Number.isFinite(track && track.cost) ? track.cost : rule('startCost');
  }

  /** 选赛道进入 MVP，返回是否成功。 */
  function start(ctx, trackId) {
    const s = ctx.s;
    ensureState(s);
    if (s.product) {
      ctx.log('已经有一个产品在做了，先把它发布或卖掉。');
      return false;
    }
    const track = trackOf(trackId);
    if (!track) {
      ctx.log('没有这个赛道。');
      return false;
    }
    const cost = startCostOf(track);
    if (s.cash < cost) {
      ctx.log(`做「${track.name || track.id}」的 MVP 需要 ${ctx.yuan(cost)}，现金不足。`);
      return false;
    }
    s.cash -= cost;
    s.product = {
      track: track.id,
      name: track.name || track.id,
      features: [],
      stage: 'mvp',
      users: 0,
      quality: 0,
      mrr: 0,
      churn: 0,
      serverCost: 0,
      createdDay: s.day,
      launchedDay: null,
      lastGrowthDay: null,
    };
    ctx.log(`🧪 开始做「${s.product.name}」MVP，投入 ${ctx.yuan(cost)}。`);
    return true;
  }

  /**
   * 给当前 MVP 装一张功能卡；最多 3 张，不能跨赛道 / 重复。
   * @returns {boolean}
   */
  function addFeature(ctx, featureId) {
    const s = ctx.s;
    ensureState(s);
    const product = s.product;
    if (!product) {
      ctx.log('还没有在做的产品。');
      return false;
    }
    if (product.stage !== 'mvp') {
      ctx.log('产品已经发布了，不能再加 MVP 功能。');
      return false;
    }
    if (product.features.length >= rule('maxFeatures')) {
      ctx.log(`MVP 最多 ${rule('maxFeatures')} 个功能。`);
      return false;
    }
    const feature = featureOf(featureId);
    if (!feature || feature.track !== product.track) {
      ctx.log('这张功能卡不属于当前赛道。');
      return false;
    }
    if (product.features.includes(feature.id)) {
      ctx.log('这个功能已经做过了。');
      return false;
    }
    if (s.cash < feature.cost) {
      ctx.log(`做「${feature.name || feature.id}」需要 ${ctx.yuan(feature.cost)}，现金不足。`);
      return false;
    }
    s.cash -= feature.cost;
    product.features.push(feature.id);
    product.quality = U.clamp(product.quality + (feature.quality || 0), 0, 1);
    ctx.log(`🧩「${product.name}」加上功能「${feature.name || feature.id}」（质量 ${Math.round(product.quality * 100)}%）。`);
    return true;
  }

  /**
   * 发布：需要 3 个功能；进入 beta，种子用户 50。
   * @returns {boolean}
   */
  function launch(ctx) {
    const s = ctx.s;
    ensureState(s);
    const product = s.product;
    if (!product) return false;
    if (product.stage !== 'mvp') {
      ctx.log('产品已经发布过了。');
      return false;
    }
    if (product.features.length < rule('maxFeatures')) {
      ctx.log(`还差 ${rule('maxFeatures') - product.features.length} 个功能才能发布。`);
      return false;
    }
    product.stage = 'beta';
    const track = trackOf(product.track);
    product.users = Number.isFinite(track && track.baseUsers) ? track.baseUsers : rule('seedUsers');
    product.launchedDay = s.day;
    product.churn = churnOf(product);
    product.mrr = mrrOf(product);
    product.serverCost = serverCostOf(product);
    ctx.log(`🚀「${product.name}」发布内测，种子用户 ${product.users} 人。`);
    return true;
  }

  function churnOf(product) {
    const track = trackOf(product.track);
    const base = track && Number.isFinite(track.churn) ? track.churn : rule('churnBase');
    const quality = U.clamp(product.quality || 0, 0, 1);
    return U.clamp(base - quality * rule('churnQuality'), rule('minChurn'), rule('maxChurn'));
  }

  function mrrOf(product) {
    const track = trackOf(product.track);
    const arpu = track && Number.isFinite(track.arpu) ? track.arpu : rule('arp');
    const quality = U.clamp(product.quality || 0, 0, 1);
    return Math.round(product.users * arpu * (0.5 + quality));
  }

  function serverCostOf(product) {
    const track = trackOf(product.track);
    if (track && Number.isFinite(track.serverCost)) return Math.round(track.serverCost);
    return Math.round(product.users * rule('serverCostPerUser'));
  }

  /**
   * 每日产品 tick：用户增长 → churn / MRR / serverCost 重算；达到阈值转 live。
   * 产品 MRR 只写 product.mrr，不写 s.mrr。
   * @returns {boolean} 是否处理了一个已发布产品
   */
  function tick(ctx) {
    const s = ctx.s;
    ensureState(s);
    const product = s.product;
    if (!product || product.stage === 'mvp') return false;

    const quality = U.clamp(product.quality || 0, 0, 1);
    const growth = rule('growthBase') + quality * rule('growthQuality');
    const churn = churnOf(product);
    const nextUsers = Math.max(0, Math.round(product.users * (1 + growth * (1 - churn))));
    product.users = nextUsers;
    product.churn = churn;
    product.mrr = mrrOf(product);
    product.serverCost = serverCostOf(product);

    if (product.stage === 'beta' && product.users >= rule('liveUsers')) {
      product.stage = 'live';
      ctx.log(`🌍「${product.name}」用户达到 ${product.users}，正式上线。`);
    }
    return true;
  }

  /**
   * 买一次增长渠道：只对已发布产品有效；扣渠道成本，按 userGain × speed 加用户。
   * @param {object} ctx
   * @param {string} channelId
   * @returns {boolean}
   */
  function grow(ctx, channelId) {
    const s = ctx.s;
    ensureState(s);
    const product = s.product;
    if (!product) {
      ctx.log('还没有产品可以推广。');
      return false;
    }
    if (product.stage === 'mvp') {
      ctx.log('产品还没发布，先内测再推广。');
      return false;
    }
    if (product.lastGrowthDay === s.day) {
      ctx.log('这个产品今天已投放过，明天可再选择一个渠道。');
      return false;
    }
    const channel = channelOf(channelId);
    if (!channel) {
      ctx.log('没有这个增长渠道。');
      return false;
    }
    const cost = Number.isFinite(channel.cost) ? channel.cost : 0;
    if (s.cash < cost) {
      ctx.log(`「${channel.name || channel.id}」需要 ${ctx.yuan(cost)}，现金不足。`);
      return false;
    }
    const gain = Math.max(0, Math.round(
      (Number.isFinite(channel.userGain) ? channel.userGain : 0)
      * (Number.isFinite(channel.speed) ? channel.speed : 1)
    ));
    s.cash -= cost;
    product.users = Math.max(0, product.users + gain);
    product.lastGrowthDay = s.day;
    refresh(ctx);
    ctx.log(`📣「${product.name}」投放「${channel.name || channel.id}」：+${gain} 用户，花费 ${ctx.yuan(cost)}。`);
    return true;
  }

  /**
   * 出售产品：按用户数 + MRR 倍数一次性换现金，然后清空 s.product。
   * @returns {boolean}
   */
  function sell(ctx) {
    const s = ctx.s;
    ensureState(s);
    const product = s.product;
    if (!product) {
      ctx.log('没有可以卖的产品。');
      return false;
    }
    if (product.stage === 'mvp') {
      ctx.log('产品还没发布，卖不出价。');
      return false;
    }
    const wait = ProductState.saleWait(s);
    if (wait > 0) { ctx.log(`产品需再运营 ${wait} 天才能出售。`); return false; }
    const price = Math.round(
      rule('sellBase') + product.users * rule('sellUserValue') + product.mrr * rule('sellMrrMul')
    );
    s.cash += price;
    s.product = null;
    ctx.log(`🤝 你把「${product.name}」卖了 ${ctx.yuan(price)}，团队回到接单模式。`);
    return true;
  }

  /** 给 UI 的产品快照；没有产品返回 null */
  function view(s) {
    ensureState(s);
    return s.product ? JSON.parse(JSON.stringify(s.product)) : null;
  }
  /** 用户数经投放/发布会改变后立刻重算收入，不额外推进增长。 */
  function refresh(ctx) {
    ensureState(ctx.s);
    const product = ctx.s.product;
    if (!product || product.stage === 'mvp') return false;
    product.churn = churnOf(product);
    product.mrr = mrrOf(product);
    product.serverCost = serverCostOf(product);
    if (product.stage === 'beta' && product.users >= rule('liveUsers')) {
      product.stage = 'live';
      ctx.log(`🌍「${product.name}」达到正式上线规模。`);
    }
    return true;
  }

  return { ensureState, start, addFeature, launch, grow, tick, sell, view, refresh, saleWait: ProductState.saleWait };
});
