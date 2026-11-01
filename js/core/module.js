// js/core/module.js —— 极简模块内核（零构建下的模块化）
// 唯一全局：OPC。所有模块用 OPC.define 声明，OPC.require 按依赖图解析。
(function (global) {
  'use strict';

  /** @type {Map<string, {deps: string[], factory: Function}>} */
  const registry = new Map();
  /** @type {Map<string, object>} */
  const cache = new Map();
  /** 解析栈，用于循环依赖检测 */
  const stack = [];

  /**
   * 声明一个模块。
   * @param {string} name 点分模块名，例如 'domain.economy'
   * @param {string[]} deps 依赖的模块名
   * @param {Function} factory 工厂函数，参数为依赖模块的导出，返回本模块导出
   */
  function define(name, deps, factory) {
    if (registry.has(name)) throw new Error(`OPC: 模块重复定义「${name}」`);
    if (typeof deps === 'function') { factory = deps; deps = []; }
    registry.set(name, { deps, factory });
  }

  /**
   * 解析模块（带缓存与循环依赖检测）。
   * @param {string} name
   * @returns {object}
   */
  function resolve(name) {
    const hit = cache.get(name);
    if (hit) return hit;

    const def = registry.get(name);
    if (!def) throw new Error(`OPC: 模块未定义「${name}」，检查 js/manifest.js 是否漏了文件`);

    const at = stack.indexOf(name);
    if (at >= 0) throw new Error(`OPC: 循环依赖 ${stack.slice(at).concat(name).join(' → ')}`);

    stack.push(name);
    const api = def.factory.apply(null, def.deps.map(resolve)) || {};
    stack.pop();

    cache.set(name, api);
    return api;
  }

  global.OPC = {
    define,
    require: resolve,
    boot: resolve,
    has: name => registry.has(name),
    list: () => [...registry.keys()],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.OPC;
})(typeof globalThis !== 'undefined' ? globalThis : this);
