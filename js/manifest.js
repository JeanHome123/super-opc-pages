// js/manifest.js —— 模块文件清单（唯一事实来源）
// 新增任何 js 文件：只在这里加一行 + 在 docs/ARCHITECTURE.md 的模块清单里加一行。
// index.html 只加载本文件与 boot.js；node 测试也用这份清单。
(function (global) {
  'use strict';

  const MODULES = [
    // ---- core：基础设施（零依赖） ----
    'js/core/module.js',
    'js/core/util.js',
    'js/core/rng.js',
    'js/core/format.js',
    'js/core/bus.js',

    // ---- data：静态数据（只依赖 core） ----
    'js/data/balance.js',
    'js/data/catalog.js',
    'js/data/copy.js',
    'js/data/personas.js',
    'js/data/office.js',
    'js/data/chapters.js',
    'js/data/clients.js',
    'js/data/copy2.js',
    'js/data/copy3.js',
    'js/data/copy4.js',
    'js/data/copy5.js',
    'js/data/copy6.js',
    'js/data/copy7.js',
    'js/data/copy8.js',
    'js/data/copy9.js',
    'js/data/copy10.js',
    'js/data/trends.js',
    'js/data/rivals.js',
    'js/data/products.js',
    'js/data/crises.js',
    'js/data/endings.js',
    'js/data/tech.js',
    'js/data/finance.js',
    'js/data/skills.js',
    'js/data/negotiation.js',
    'js/data/fans.js',

    // ---- domain：游戏规则（只依赖 core + data） ----
    'js/domain/product-state.js',
    'js/domain/state.js',
    'js/domain/economy.js',
    'js/domain/persona.js',
    'js/domain/skills.js',
    'js/domain/modifiers.js',
    'js/domain/team.js',
    'js/domain/deploy.js',
    'js/domain/clients.js',
    'js/domain/contracts.js',
    'js/domain/meta.js',
    'js/domain/projects.js',
    'js/domain/office.js',
    'js/domain/chapters.js',
    'js/domain/trends.js',
    'js/domain/products.js',
    'js/domain/rivals.js',
    'js/domain/crisis.js',
    'js/domain/audit.js',
    'js/domain/pipeline.js',
    'js/domain/endings.js',
    'js/domain/tech.js',
    'js/domain/finance.js',
    'js/domain/launch.js',
    'js/domain/negotiation.js',
    'js/domain/fans.js',
    'js/domain/market.js',
    'js/domain/events.js',
    'js/domain/chains.js',
    'js/domain/context.js',
    'js/domain/day.js',

    // ---- content：事件内容（只依赖 core + data） ----
    'js/content/news.js',
    'js/content/choices.js',
    'js/content/chains.js',

    // ---- render：画布表现层 ----
    'js/render/sprites.js',
    'js/render/particles.js',
    'js/render/office.js',

    // ---- ui：DOM 表现层 ----
    'js/ui/dom.js',
    'js/ui/toast.js',
    'js/ui/panels.js',
    'js/ui/panels-team.js',
    'js/ui/panels-company.js',
    'js/ui/panels-orders.js',
    'js/ui/panels-log.js',
    'js/ui/panels-story.js',
    'js/ui/panels-product.js',
    'js/ui/panels-world.js',
    'js/ui/panels-tech.js',
    'js/ui/panels-finance.js',
    'js/ui/panels-fans.js',
    'js/ui/modal.js',
    'js/ui/actions-p2.js',
    'js/ui/actions.js',
    'js/ui/canvas.js',
    'js/ui/events.js',
    'js/ui/meta.js',
    'js/ui/deploy-form.js',
    'js/ui/save-status.js',
    'js/ui/collection.js',
    'js/ui/app.js',

    // ---- app：装配入口 ----
    'js/app.js',
  ];

  global.OPC_MANIFEST = MODULES;
  if (typeof module !== 'undefined' && module.exports) module.exports = MODULES;
})(typeof globalThis !== 'undefined' ? globalThis : this);
