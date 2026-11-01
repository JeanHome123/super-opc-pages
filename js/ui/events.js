// js/ui/events.js —— DOM 输入绑定 / 业务事件 toast / 自动推进
OPC.define('ui.events', [], function () {
  'use strict';

  /** 把 domain 的业务事件转成轻量 toast（不打断操作） */
  function bindBus(host) {
    const { bus, Toast, F } = host;
    if (!bus) return;
    bus.on('delivery', payload => Toast.push(`✅ ${payload.project.name} 交付 +${F.money(payload.pay)}`, 'good'));
    bus.on('overdue', payload => Toast.push(`❌ ${payload.project.name} 逾期`, 'bad'));
    bus.on('news', payload => Toast.push(`📰 ${payload.text}`, 'info'));
  }

  /** 绑定点击 / 变更 / 键盘 / 尺寸事件 */
  function bindEvents(host) {
    const { getGame, act, setPane, showOffice, advance, save, refresh, fitCanvas, Team, Modal } = host;

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const action = target.closest('[data-act]');
      if (action) {
        act(action.dataset.act, action);
        return;
      }

      const paneButton = target.closest('button[data-pane]');
      if (paneButton) {
        setPane(paneButton.dataset.pane);
        return;
      }

      if (target.closest('#tabs button[data-view="office"]')) showOffice();
    });

    document.addEventListener('change', event => {
      const game = getGame();
      const el = event.target;
      if (!game || game.s.over || !el || !el.dataset) return;

      if (el.dataset.agent) {
        Team.setModel(game.ctx, Number(el.dataset.agent), el.value);
      } else if (el.dataset.target) {
        Team.setTarget(game.ctx, Number(el.dataset.target), el.value ? Number(el.value) : null);
      } else if (el.dataset.auto) {
        const key = el.dataset.auto;
        Team.configure(game.ctx, key, !!el.checked);
      } else {
        return;
      }
      save();
      refresh();
    });

    document.addEventListener('keydown', event => {
      const game = getGame();
      if (event.code === 'Escape' && Modal.isOpen() && game && !game.s.pending && !game.s.over) {
        if (game.s.negotiation) act('negotiate-skip', null);
        else Modal.close();
        return;
      }
      if (!['Space', 'KeyF'].includes(event.code)) return;
      const active = document.activeElement;
      if (active && /^(SELECT|INPUT|TEXTAREA|BUTTON)$/.test(active.tagName)) return;
      if (Modal.isOpen()) return;
      event.preventDefault();
      advance(event.code === 'KeyF');
    });

    document.addEventListener('focusout', event => {
      const el = event.target;
      if (el && /^(SELECT|INPUT|TEXTAREA)$/.test(el.tagName)) setTimeout(() => refresh(), 0);
    }, true);

    window.addEventListener('resize', () => requestAnimationFrame(fitCanvas));
    window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 120));
    document.addEventListener('fullscreenchange', () => setTimeout(fitCanvas, 120));
  }

  /** 自动推进：速度 0 = 暂停；遇到弹窗、待选事件或结局会自动停住 */
  function createAuto(host) {
    const { getGame, advance, isModalOpen } = host;
    let speed = 0;
    let timer = null;

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function setSpeed(value) {
      stop();
      speed = Number(value) || 0;
      if (!speed) return;
      timer = setInterval(() => {
        const game = getGame();
        if (!game || game.s.over || game.s.pending || isModalOpen()) return;
        advance(false);
      }, Math.round(1100 / speed));
    }

    return { setSpeed, stop, getSpeed: () => speed };
  }

  return { bindBus, bindEvents, createAuto };
});
