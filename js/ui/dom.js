// js/ui/dom.js —— DOM 小工具：查询 / 转义 / 重绘（保滚动与焦点）/ 事件委托
OPC.define('ui.dom', [], function () {
  'use strict';

  /** @param {string} id @returns {HTMLElement|null} */
  const $ = id => document.getElementById(id);

  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** 把任意值转成可安全插入 innerHTML 的文本 */
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);

  /** 会打断用户输入的原生控件 */
  const EDITABLE = /^(SELECT|INPUT|TEXTAREA)$/;

  /**
   * 用户此刻是否正在这个容器里操作表单控件（尤其是展开的下拉框）。
   * 原生 select 的弹出层属于浏览器，一旦重建 DOM 就会被强行收回——所以这种情况必须跳过重绘。
   * @param {HTMLElement|null} el
   * @returns {boolean}
   */
  function isEditing(el) {
    const active = document.activeElement;
    return !!(el && active && el.contains(active) && EDITABLE.test(active.tagName));
  }

  /**
   * 重绘一个容器：保留滚动位置与（带 data-focus-key 的）焦点。
   * 全量重绘比手写 diff 更适合这个体量的游戏，且永不会状态不同步。
   * @param {HTMLElement|null} el
   * @param {string} html
   * @returns {boolean} 是否真的重绘了（用户正在输入时返回 false）
   */
  function paint(el, html) {
    if (!el) return false;
    if (isEditing(el)) return false;
    const { scrollTop, scrollLeft } = el;
    const active = document.activeElement;
    const inside = active && el.contains(active);
    const focusKey = inside ? active.getAttribute('data-focus-key') : null;
    const caret = inside && typeof active.selectionStart === 'number' ? active.selectionStart : null;

    el.innerHTML = html;
    el.scrollTop = scrollTop;
    el.scrollLeft = scrollLeft;

    if (focusKey) {
      const next = el.querySelector(`[data-focus-key="${focusKey}"]`);
      if (next) {
        next.focus();
        if (caret != null && typeof next.setSelectionRange === 'function') {
          try { next.setSelectionRange(caret, caret); } catch (error) { /* 非文本输入忽略 */ }
        }
      }
    }
  }

  /**
   * 事件委托：在 root 上监听，命中 selector 才触发 handler。
   * @param {HTMLElement|Document} root
   * @param {string} type
   * @param {string} selector
   * @param {(el: HTMLElement, event: Event) => void} handler
   */
  function delegate(root, type, selector, handler) {
    root.addEventListener(type, event => {
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      if (target && root.contains(target)) handler(target, event);
    });
  }

  /** 数值转 data 属性用的整数 */
  const intAttr = value => String(Math.round(Number(value) || 0));

  return { $, esc, paint, isEditing, delegate, intAttr };
});
