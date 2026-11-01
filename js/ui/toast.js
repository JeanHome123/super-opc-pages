// js/ui/toast.js —— 轻量通知条（右下角冒出来，自动消失）
// 参考商业经营模拟的反馈模式：重要弹窗、次要 toast，避免用弹窗打断节奏。
OPC.define('ui.toast', ['ui.dom'], function (DOM) {
  'use strict';

  const MAX = 4;
  const LIFE = 3600;

  /**
   * @param {string} text
   * @param {'info'|'good'|'bad'|'warn'} [tone]
   */
  function push(text, tone = 'info') {
    const host = DOM.$('toasts');
    if (!host) return;

    const el = document.createElement('div');
    el.className = `toast ${tone}`;
    el.textContent = text;
    host.appendChild(el);

    while (host.children.length > MAX) host.firstChild.remove();

    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 240);
    }, LIFE);
  }

  function clear() {
    const host = DOM.$('toasts');
    if (host) host.innerHTML = '';
  }

  return { push, clear };
});
