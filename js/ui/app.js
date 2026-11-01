// js/ui/app.js —— 表现层控制器：装配状态、绑定输入、驱动重绘与存档
// 只做「把玩家意图转成 domain 调用」，不实现任何规则。
OPC.define('ui.app',
['core.util', 'core.format', 'data.balance', 'data.catalog', 'data.copy',
  'domain.state', 'domain.context', 'domain.events', 'domain.chains', 'domain.day', 'domain.economy',
  'domain.team', 'domain.projects', 'domain.endings', 'domain.finance', 'domain.launch', 'content.news', 'content.choices', 'content.chains',
  'ui.dom', 'ui.toast', 'ui.panels', 'ui.modal', 'ui.actions', 'ui.canvas', 'ui.events', 'ui.meta', 'ui.save-status',
  // ui.panels 会聚合这些子面板；显式列出让依赖与加载顺序可读
  'ui.panels-team', 'ui.panels-company', 'ui.panels-orders', 'ui.panels-log', 'ui.panels-product', 'ui.panels-world', 'ui.panels-tech', 'ui.panels-finance'],
function (U, F, B, D, C, State, Ctx, Events, Chains, Day, Econ, Team, Projects, Endings, Finance, Launch, News, Choices, ChainContent, DOM, Toast, Panels, Modal, Actions, Canvas, UiEvents, Meta, SaveStatus) {
  'use strict';

  const SAVE_KEY = 'opc.save';
  const PANES = ['team', 'orders', 'company', 'log'];

  /** @type {{s: object, ctx: object}|null} */
  let game = null;
  let lastRun = null;
  let frame = 0;
  let renderer = null;
  let deps = null;
  const Auto = UiEvents.createAuto({
    getGame: () => game,
    advance,
    isModalOpen: () => Modal.isOpen(),
  });

  // ---------------------------------------------------------------- 画布适配
  /** 立刻画一帧（UI 刷新、尺寸变化后调用，保证画面不会停留在被清空的空帧） */
  function repaint() {
    if (!renderer) return;
    frame += 1;
    renderer.draw(game ? game.s : Canvas.PREVIEW_STATE, frame);
  }

  /** 画布尺寸由 CSS 决定；这里让渲染层按实际像素重算字号与紧凑模式，并在尺寸变化后立即补画 */
  function fitCanvas() {
    const canvas = DOM.$('cv');
    if (!renderer || !canvas) return;
    const before = canvas.width + 'x' + canvas.height;
    renderer.resize();
    if (before !== canvas.width + 'x' + canvas.height) repaint();
  }

  // ---------------------------------------------------------------- 生命周期
  function makeGame(dirId, saved) {
    const s = saved || State.create(dirId, deps.rand);
    if (!s.runId) {
      // getRandomValues 也可用于局域网 HTTP；randomUUID 仅在安全上下文可用。
      const words = crypto.getRandomValues(new Uint32Array(4));
      OPC.require('domain.meta').identify(s, Array.from(words, n => n.toString(16).padStart(8, '0')).join(''));
    }
    const ctx = Ctx.createContext(s, { rand: deps.rand, bus: deps.bus });
    ctx.events = Events.createEngine({ news: News.news, choices: Choices.choices });
    ctx.events.reconcile(ctx);
    if (s.negotiation && (s.negotiation.result || !s.offers.some(o => o.id === s.negotiation.offerId))) OPC.require('domain.negotiation').skip(ctx);
    ctx.chains = Chains.createEngine({ chains: ChainContent.chains });
    if (!saved) Day.startGame(ctx);
    else Endings.check(ctx);
    game = { s, ctx };
    lastRun = null;
    return game;
  }

  function finalize() {
    if (!game) return;
    Endings.check(game.ctx);
  }

  function save() {
    if (!game) return;
    finalize();
    // 两类写入分开记录：本局进度失败会丢当前局，跨局档案失败只影响遗产/图鉴/年鉴
    const metaOk = Meta.recordMeta(game.s, Endings) !== false;
    let gameOk = true;
    try { localStorage.setItem(SAVE_KEY, State.serialize(game.s)); }
    catch (error) { gameOk = false; console.warn('[ui] 存档失败', error); }
    SaveStatus.report({ game: gameOk, meta: metaOk });
  }

  function loadSaved() {
    try {
      return State.deserialize(localStorage.getItem(SAVE_KEY));
    } catch (error) {
      return null;
    }
  }

  // ---------------------------------------------------------------- 重绘
  function refresh() {
    if (!game) {
      Panels.renderTurnButtons({ over: true, pending: null });
      repaint();
      return;
    }
    Panels.renderAll(game.s, {
      lastRun,
      speed: Auto.getSpeed(),
      chain: game.ctx.chains ? game.ctx.chains.pendingView(game.s) : null,
    });
    Panels.renderTurnButtons(game.s);
    repaint();
  }

  function milestoneTitle(id) {
    const found = C.milestones.find(m => m.id === id);
    return found ? found.title : id;
  }

  function afterAdvance() {
    const s = game.s;

    s.agents.forEach((agent, index) => {
      if (agent.busy && renderer) renderer.tokenBurst(index);
    });
    if (s.report && renderer) {
      const headline = s.report.lines.find(text => /^(✅|❌|📰)/.test(text));
      if (headline) {
        const color = headline.startsWith('✅') ? '#a8b263' : headline.startsWith('❌') ? '#e2574c' : '#ffc46b';
        const label = headline.startsWith('✅') ? '交付！+¥' : headline.startsWith('❌') ? '逾期…' : '突发！';
        renderer.floatText(label, color);
      }
    }

    save();
    refresh();
    Modal.showPopups(s, milestoneTitle);
    if (!Modal.isOpen() && s.pending) {
      const view = game.ctx.events.pendingView(s);
      if (view) Modal.showPending(view);
    }
  }

  // ---------------------------------------------------------------- 视图切换
  function syncNav() {
    const pane = (DOM.$('inspector') || { dataset: {} }).dataset.pane || 'team';
    const view = document.body.dataset.view || 'office';
    // 桌面端左侧导航始终高亮当前面板；移动端底部导航只在高亮态切到面板时点亮
    document.querySelectorAll('#rail button[data-pane]').forEach(button => {
      button.classList.toggle('on', button.dataset.pane === pane);
    });
    document.querySelectorAll('#tabs button[data-pane]').forEach(button => {
      button.classList.toggle('on', view === 'panel' && button.dataset.pane === pane);
    });
    const officeButton = document.querySelector('#tabs button[data-view="office"]');
    if (officeButton) officeButton.classList.toggle('on', view === 'office');
    const tabs = DOM.$('inspTabs');
    if (tabs) tabs.querySelectorAll('button[data-pane]').forEach(button => {
      button.classList.toggle('on', button.dataset.pane === pane);
    });
  }

  /** @param {'team'|'orders'|'company'|'log'} pane */
  function setPane(pane) {
    if (!PANES.includes(pane)) return;
    const inspector = DOM.$('inspector');
    if (inspector) inspector.dataset.pane = pane;
    document.body.dataset.view = 'panel';
    syncNav();
    requestAnimationFrame(fitCanvas);
  }

  function showOffice() {
    document.body.dataset.view = 'office';
    syncNav();
    requestAnimationFrame(fitCanvas);
  }

  // ---------------------------------------------------------------- 操作
  function advance(fast) {
    if (!game || game.s.over || game.s.pending || Modal.isOpen()) return;
    lastRun = fast ? Day.runUntil(game.ctx, 30) : null;
    if (!fast) Day.tick(game.ctx);
    afterAdvance();
  }

  function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
        if (!request) return;
        const result = request.call(document.documentElement);
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (!exit) return;
        const result = exit.call(document);
        if (result && typeof result.catch === 'function') result.catch(() => {});
      }
    } catch (error) {
      console.warn('[ui] 全屏切换失败', error);
    }
  }

  /**
   * 2.0 领域调用：模块未合并时提示并返回 false，绝不在 UI 里改 s。
   * @param {string} moduleName @param {string} fn @param {...*} args
   * @returns {boolean}
   */
  function domainCall(moduleName, fn, ...args) {
    if (!game) return false;
    let api = null;
    try {
      api = OPC.has(moduleName) ? OPC.require(moduleName) : null;
    } catch (error) {
      console.warn('[ui] 领域模块读取失败：' + moduleName, error);
    }
    if (!api || typeof api[fn] !== 'function') {
      Toast.push(`${moduleName}.${fn} 尚未接入`, 'warn');
      return false;
    }
    if (game.s.over) return false;
    const result = api[fn](game.ctx, ...args);
    finalize();
    return result;
  }

  /** 玩家操作统一交给 ui.actions；生命周期回调在这里注入。 */
  const act = Actions.createActions({
    B, D, Econ, Team, Projects, Launch, Finance, DOM, Toast, Modal, OPC,
    getGame: () => game,
    setGame: value => { game = value; },
    getLastRun: () => lastRun,
    setLastRun: value => { lastRun = value; },
    setSpeed: value => Auto.setSpeed(value),
    makeGame,
    loadSaved,
    save,
    refresh,
    recordMeta: s => SaveStatus.report({ meta: Meta.recordMeta(s, Endings) !== false }),
    milestoneTitle,
    domainCall,
    advance,
    toggleFullscreen,
    saveKey: SAVE_KEY,
    showCollection: () => Modal.open(OPC.require('ui.collection').render(Meta.read())),
    purchaseLegacy: id => Meta.purchase(game.s, id),
  });

  // ---------------------------------------------------------------- 自动推进 / 通知
  // ---------------------------------------------------------------- 启动
  function mount(options) {
    deps = options;
    const canvas = DOM.$('cv');
    renderer = Canvas.resolveRenderer(canvas);
    renderer.init(canvas);

    UiEvents.bindEvents({
      getGame: () => game,
      act,
      setPane,
      showOffice,
      advance,
      save,
      refresh,
      fitCanvas,
      Team,
      Modal,
    });
    UiEvents.bindBus({ bus: deps.bus, Toast, F });
    showOffice();
    fitCanvas();

    const saved = loadSaved();
    if (saved) {
      makeGame(saved.dir, saved);
      save();
      refresh();
      if (saved.pending) {
        const view = game.ctx.events.pendingView(saved);
        if (view) Modal.showPending(view);
      } else if (saved.ending && saved.ending.day === saved.day) {
        Modal.showPopups(saved, milestoneTitle);
      }
    } else {
      refresh();
      Modal.showStart(null);
    }

    let lastPaint = 0;
    const paint = now => {
      if (!lastPaint || now - lastPaint >= 90) {
        lastPaint = now;
        frame += 1;
        if (renderer) renderer.draw(game ? game.s : Canvas.PREVIEW_STATE, frame);
      }
      requestAnimationFrame(paint);
    };
    requestAnimationFrame(paint);

    const stage = DOM.$('stage');
    if (stage && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => requestAnimationFrame(fitCanvas)).observe(stage);
    }
  }

  return { mount, advance, refresh, fitCanvas, act, setPane, showOffice };
});
