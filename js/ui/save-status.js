// js/ui/save-status.js —— 存档失败提示：失败时给一次 toast，并保留常驻状态直到写入恢复
// 只负责「玩家看得见」：存储保护、双键事务仍在 ui.meta / ui.app 里，这里不改存储。
OPC.define('ui.save-status', ['ui.dom', 'ui.toast'], function (DOM, Toast) {
  'use strict';

  /** true = 该类写入正常 */
  let state = { game: true, meta: true };
  /** 是否已经为当前这轮失败提示过，避免每次自动保存都刷屏 */
  let announced = false;

  /** 常驻提示文案；两类失败分开说，便于玩家判断会不会丢进度 */
  function text() {
    const gameFailed = !state.game;
    const metaFailed = !state.meta;
    if (!gameFailed && !metaFailed) return '';
    if (gameFailed && metaFailed) return '⚠️ 本局进度和跨局档案都没有写入，刷新页面会丢失本局进度。';
    if (gameFailed) return '⚠️ 本局进度没有写入存档，刷新页面会丢失；请检查浏览器存储空间。';
    return '⚠️ 跨局档案（遗产 / 图鉴 / 年鉴）暂未保存。';
  }

  /** 常驻提示：只在文案变化时改 DOM，避免每次保存都重排 */
  function paint() {
    const el = DOM.$('saveStatus');
    if (!el) return;
    const message = text();
    if (!message) {
      if (!el.hidden || el.textContent) {
        el.hidden = true;
        el.textContent = '';
      }
      return;
    }
    if (el.hidden || el.textContent !== message) {
      el.hidden = false;
      el.textContent = message;
    }
  }

  /**
   * 上报一次保存结果。省略的字段保持原状态，避免只上报一类时误清另一类失败。
   * @param {{game?:boolean, meta?:boolean}} result 省略 / true = 成功，false = 失败
   */
  function report(result) {
    const next = {
      game: result && Object.prototype.hasOwnProperty.call(result, 'game') ? result.game !== false : state.game,
      meta: result && Object.prototype.hasOwnProperty.call(result, 'meta') ? result.meta !== false : state.meta,
    };
    const before = state;
    state = next;

    const justFailed = (!next.game && before.game) || (!next.meta && before.meta);
    const allOk = next.game && next.meta;
    if (justFailed) {
      announced = true;
      Toast.push(text(), 'bad');
    } else if (allOk && announced) {
      announced = false;
      Toast.push('存档已恢复正常。', 'good');
    }
    paint();
  }

  /** 当前状态副本（测试 / 调试用） */
  function current() {
    return { game: state.game, meta: state.meta };
  }

  /** 复位（测试用） */
  function reset() {
    state = { game: true, meta: true };
    announced = false;
  }

  return { report, reset, current };
});
