// js/ui/canvas.js —— 画布预览状态与渲染器解析
OPC.define('ui.canvas', [], function () {
  'use strict';

  /** 开局前给画布一张「有人在办公」的静态背景，避免一片死黑 */
  const PREVIEW_STATE = {
    day: 8, cash: 0, rep: 0, energy: 0, mrr: 0, throttle: 0,
    hist: [30000, 31500, 30200, 33000, 35600, 34100, 37200, 39800, 38600, 41200],
    models: [
      { id: 'cl35', color: '#e88b4a' },
      { id: 'qw3', color: '#d98fa6' },
      { id: 'op4m', color: '#a8b263' },
    ],
    agents: [
      { id: 1, name: '小码', role: 'coder', modelId: 'cl35', level: 2, xp: 3, busy: 1, target: 1 },
      { id: 2, name: '阿文', role: 'writer', modelId: 'qw3', level: 1, xp: 0, busy: 2, target: 2 },
      { id: 3, name: 'Echo', role: 'support', modelId: 'op4m', level: 1, xp: 0, busy: null, target: null },
    ],
    projects: [],
    offers: [],
  };

  /** 渲染模块缺失时也能玩：退化成一块提示画布 */
  function resolveRenderer(canvas) {
    if (OPC.has('render.office')) return OPC.require('render.office');
    console.warn('[ui] 未找到 render.office，使用占位画布');
    const ctx2d = canvas.getContext('2d');
    return {
      init() {}, resize() {}, slotOf: () => ({ x: 0, y: 0 }), tokenBurst() {}, floatText() {},
      draw() {
        ctx2d.setTransform(1, 0, 0, 1, 0, 0);
        ctx2d.fillStyle = '#070a0e';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = '#3a4a5a';
        ctx2d.font = '22px sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('渲染模块未加载（js/render/office.js）', canvas.width / 2, canvas.height / 2);
      },
    };
  }

  return { PREVIEW_STATE, resolveRenderer };
});
