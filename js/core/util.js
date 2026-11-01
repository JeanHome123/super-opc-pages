// js/core/util.js —— 纯工具函数（无副作用、无依赖）
OPC.define('core.util', [], function () {
  'use strict';

  /** 把 v 限制在 [lo, hi] @returns {number} */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /** 从数组里按 rand 均匀取一个 @template T @param {T[]} arr @returns {T} */
  const pick = (arr, rand = Math.random) => arr[Math.floor(rand() * arr.length)];

  /** 求和，可传取值函数 @param {Array} arr @param {Function} [fn] @returns {number} */
  const sum = (arr, fn) => arr.reduce((total, item) => total + (fn ? fn(item) : item), 0);

  /** 按 id 查找 @param {Array<{id:*}>} arr @returns {object|null} */
  const byId = (arr, id) => arr.find(item => item.id === id) || null;

  /** 去重 */
  const unique = arr => [...new Set(arr)];

  /** 保留两位小数（消除浮点噪声） */
  const round2 = n => Math.round(n * 100) / 100;

  /** 保留一位小数 */
  const round1 = n => Math.round(n * 10) / 10;

  /** 洗牌（不改原数组） */
  function shuffle(arr, rand = Math.random) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** 按权重随机取一项 @param {Array<{w:number}>} items @returns {object|null} */
  function weightedPick(items, rand = Math.random) {
    if (!items.length) return null;
    let r = rand() * sum(items, item => item.w || 1);
    for (const item of items) {
      r -= item.w || 1;
      if (r < 0) return item;
    }
    return items[items.length - 1];
  }

  /** 程序错误断言（玩家操作失败请返回 false，不要用这个） */
  function assert(condition, message) {
    if (!condition) throw new Error(`OPC 断言失败: ${message}`);
  }

  return { clamp, pick, sum, byId, unique, round1, round2, shuffle, weightedPick, assert };
});
