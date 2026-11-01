// js/ui/panels-log.js —— 日报 / 公司日志
OPC.define('ui.panels-log',
['ui.dom', 'core.format', 'data.copy', 'ui.panels-base'],
function (DOM, F, C, Base) {
  'use strict';

  const { secHead } = Base;

  function renderReport(s, lastRun) {
    if (!s.report) {
      DOM.paint(DOM.$('report'), secHead('日报', '') +
        '<div class="empty">新公司开张。接几个单子、配好模型，然后点「下一天」。</div>');
      return;
    }
    const runNote = lastRun
      ? `<div class="run-note">⏩ 连续推进 ${lastRun.days} 天，停下原因：${DOM.esc(lastRun.reason)}</div>`
      : '';
    const head = `<div class="report-head">
      <b>第 ${s.report.day} 天</b>
      <span class="good">收入 ${F.money(s.report.income)}</span>
      <span class="bad">token ${F.money(s.report.token)}</span>
    </div>`;
    const lines = [...s.report.work, ...s.report.lines]
      .map(text => `<div class="line">${DOM.esc(text)}</div>`).join('');
    DOM.paint(DOM.$('report'), secHead('日报', '') + runNote + head + lines);
  }

  function renderLog(s) {
    const body = s.log.length
      ? s.log.map(entry => `<div class="line"><span class="day">D${entry.day}</span>${DOM.esc(entry.text)}</div>`).join('')
      : `<div class="empty">${DOM.esc(C.ui.emptyLog)}</div>`;
    DOM.paint(DOM.$('log'), secHead('公司日志', String(s.log.length)) + body);
  }

  return { renderReport, renderLog };
});
