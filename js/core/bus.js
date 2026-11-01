// js/core/bus.js —— 极简事件总线
// 用途：domain 只发「发生了什么」，UI/渲染层自行订阅（粒子、飘字、音效），
// 这样 domain 不需要知道任何表现层细节。
OPC.define('core.bus', [], function () {
  'use strict';

  /** @returns {{on:Function, off:Function, emit:Function, clear:Function}} */
  function createBus() {
    /** @type {Map<string, Function[]>} */
    const listeners = new Map();

    function on(type, handler) {
      const list = listeners.get(type);
      if (list) list.push(handler);
      else listeners.set(type, [handler]);
      return () => off(type, handler);
    }

    function off(type, handler) {
      const list = listeners.get(type);
      if (!list) return;
      const at = list.indexOf(handler);
      if (at >= 0) list.splice(at, 1);
    }

    function emit(type, payload) {
      const list = listeners.get(type);
      if (!list) return;
      for (const handler of list.slice()) {
        try {
          handler(payload);
        } catch (error) {
          // 表现层的错误不能打断游戏逻辑
          console.error(`[bus] 订阅者异常 (${type})`, error);
        }
      }
    }

    function clear() {
      listeners.clear();
    }

    return { on, off, emit, clear };
  }

  return { createBus };
});
