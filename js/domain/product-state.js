// 产品存档形状与时间约束；迁移和实际规则共用，不访问 DOM。
OPC.define('domain.product-state', ['core.util', 'data.balance'], function (U, B) {
  'use strict';
  function normalize(product, day = 0) {
    if (!product || typeof product !== 'object' || Array.isArray(product)
      || typeof product.track !== 'string' || !product.track) return null;
    if (OPC.has('data.products') && !OPC.require('data.products').tracks.some(t => t.id === product.track)) return null;
    const number = (n, fallback = 0) => Number.isFinite(n) ? U.clamp(n, 0, Number.MAX_SAFE_INTEGER) : fallback;
    product.name = typeof product.name === 'string' ? product.name : product.track;
    product.features = Array.isArray(product.features) ? [...new Set(product.features.filter(id => typeof id === 'string'))] : [];
    product.stage = ['mvp', 'beta', 'live'].includes(product.stage) ? product.stage : 'mvp';
    product.createdDay = Math.min(day, Math.floor(number(product.createdDay, day)));
    product.launchedDay = product.stage === 'mvp' ? null : Math.min(day, Math.floor(number(product.launchedDay, day)));
    for (const key of ['users', 'mrr', 'serverCost']) product[key] = number(product[key]);
    product.users = Math.floor(product.users);
    product.quality = U.clamp(number(product.quality), 0, 1);
    product.churn = U.clamp(number(product.churn), 0, 1);
    product.lastGrowthDay = Number.isInteger(product.lastGrowthDay) && product.lastGrowthDay >= 0
      && product.lastGrowthDay <= day ? product.lastGrowthDay : null;
    return product;
  }
  function saleWait(s) {
    const product = s.product;
    if (!product || product.stage === 'mvp') return B.products.minSaleDays;
    const launchedDay = Number.isFinite(product.launchedDay) ? product.launchedDay : s.day;
    return Math.max(0, B.products.minSaleDays - Math.max(0, s.day - launchedDay));
  }
  return { normalize, saleWait };
});
