// js/app.js —— 应用装配入口
// 唯一的「把所有层接起来」的地方：随机源、事件总线、表现层控制器。
OPC.define('app', ['core.rng', 'core.bus', 'ui.app'], function (RNG, Bus, UIApp) {
  'use strict';

  function start() {
    const bus = Bus.createBus();
    UIApp.mount({ bus, rand: RNG.system() });
  }

  return { start };
});
