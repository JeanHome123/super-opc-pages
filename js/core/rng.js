// js/core/rng.js —— 可注入的随机源
// 规则：业务代码一律通过参数接收 rand，不直接调用 Math.random（否则测试无法复现）。
OPC.define('core.rng', [], function () {
  'use strict';

  /**
   * mulberry32：小而快的可复现伪随机数生成器。
   * @param {number} seed
   * @returns {() => number} [0,1) 均匀分布
   */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** 系统随机源（正式运行时使用） */
  const system = () => Math.random;

  /** 固定种子随机源（测试 / 回放使用） */
  const seeded = seed => mulberry32(seed);

  /** 只返回 true 的概率函数，便于表达「40% 概率」 */
  const chance = (p, rand = Math.random) => rand() < p;

  return { mulberry32, seeded, system, chance };
});
