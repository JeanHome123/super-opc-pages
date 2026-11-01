// js/ui/panels-world.js —— P1 竞对 / 危机 / HUD 危机 chip
OPC.define('ui.panels-world',
['ui.dom', 'core.util', 'core.format', 'ui.panels-base'],
function (DOM, U, F, Base) {
  'use strict';

  const { secHead, opt, safe } = Base;

  /** 检视器里的动态分区；不新增 index.html 节点也能挂载 */
  function ensureSection(id, label, beforeId) {
    let el = DOM.$(id);
    if (el) return el;
    const body = DOM.$('inspBody');
    if (!body) return null;
    el = document.createElement('section');
    el.id = id;
    el.dataset.pane = 'company';
    el.setAttribute('aria-label', label);
    const before = beforeId ? DOM.$(beforeId) : null;
    body.insertBefore(el, before || null);
    return el;
  }

  function crisisOf(s) {
    const api = opt('domain.crisis');
    return api && typeof api.pendingView === 'function' ? safe(() => api.pendingView(s), null) : null;
  }

  /** HUD 用：无危机时返回空串，不占位置 */
  function crisisChip(s) {
    const view = crisisOf(s);
    if (!view) return '';
    return `<button type="button" class="stat crisis-stat" data-pane="company"
      title="处理危机：${DOM.esc(view.name)}" aria-label="危机：${DOM.esc(view.name)}，剩 ${view.daysLeft} 天">
      <span class="k">危机</span><b class="bad">剩 ${view.daysLeft} 天</b></button>`;
  }

  // ---------------------------------------------------------------- 危机卡
  function renderCrisis(s) {
    const el = ensureSection('crisis', '危机', 'objectives');
    if (!el) return;
    const view = crisisOf(s);
    if (!view) {
      el.style.display = 'none';
      DOM.paint(el, '');
      return;
    }
    el.style.display = '';

    const total = Math.max(1, Number(view.deadline) - Number(view.startDay));
    const left = Math.max(0, Number(view.daysLeft) || 0);
    const pct = U.clamp(left / total * 100, 0, 100);
    const severity = U.clamp(Math.round(Number(view.severity) || 1), 1, 3);
    const options = Array.isArray(view.options) ? view.options : [];
    const buttons = options.map((option, index) => {
      const risk = option.riskLabel
        ? `<span class="tag crisis-risk">风险 · ${DOM.esc(option.riskLabel)}</span>`
        : '';
      return `<button type="button" class="crisis-option" data-act="crisis-resolve" data-index="${index}">
        <span class="crisis-option-label">${DOM.esc(option.label || option.id || '处理')}</span>${risk}
      </button>`;
    }).join('');

    DOM.paint(el, secHead('危机', `剩 ${left} 天`) + `
      <div class="item crisis-card sev-${severity}">
        <div class="item-head">
          <span class="tag crisis-tag">危机</span>
          <b>${DOM.esc(view.name || view.id)}</b>
          <span class="tag crisis-sev">严重度 ${severity}/3</span>
          <span class="spacer"></span>
          <span class="crisis-days">${left} 天内处理</span>
        </div>
        <div class="product-desc">${DOM.esc(view.desc || '')}</div>
        <div class="bar thin ${left <= 2 ? 'danger' : 'warn'}" role="progressbar" aria-label="危机剩余时间" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" style="margin-top:7px"><i style="width:${pct}%"></i></div>
        <div class="crisis-options">${buttons || '<span class="muted">这个危机暂时没有处理方案。</span>'}</div>
      </div>`);
  }

  // ---------------------------------------------------------------- 竞对面板
  function relationBar(entry) {
    const relation = U.clamp(Number(entry.relation) || 0, -100, 100);
    const pct = U.clamp((relation + 100) / 2, 0, 100);
    const tone = relation < 0 ? 'danger' : relation > 0 ? 'good' : 'neutral';
    const text = relation > 0 ? `+${relation}` : String(relation);
    return `<div class="rival-relbar">
      <div class="bar thin ${tone}" role="progressbar" aria-label="与 ${DOM.esc(entry.name)} 的关系" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="${relation}"><i style="width:${pct}%"></i></div>
      <span class="rival-relation ${tone}">关系 ${text}</span>
    </div>`;
  }

  function rivalCard(entry) {
    const actions = (Array.isArray(entry.actions) ? entry.actions : []).map(action =>
      `<span class="tag" style="color:var(--muted)">${DOM.esc(action.label || action.id)}</span>`).join('');
    const last = entry.lastAction;
    const lastLine = last
      ? `<div class="rival-last"><span class="rival-day">D${F.int(last.day || 0)}</span>${DOM.esc(last.label || last.action || '动作')}：${DOM.esc(last.detail || '')}
          ${last.counter ? `<div class="rival-counter">💡 可反制：${DOM.esc(last.counter)}</div>` : ''}</div>`
      : '<div class="rival-last muted">还没交过手。</div>';

    return `<div class="item rival-card">
      <div class="item-head">
        <b>${DOM.esc(entry.name || entry.id)}</b>
        ${entry.personality ? `<span class="tag rival-tag">${DOM.esc(entry.personality)}</span>` : ''}
        <span class="spacer"></span>
        <span class="muted">${Number(entry.cooldown) > 0 ? `冷却 ${F.int(entry.cooldown)} 天` : '即将行动'}</span>
      </div>
      <div class="item-meta">
        <span>强项 ${DOM.esc(entry.strength || '—')}</span>
        <span>弱点 ${DOM.esc(entry.weakness || '—')}</span>
      </div>
      ${relationBar(entry)}
      ${actions ? `<div class="persona-row">${actions}</div>` : ''}
      ${lastLine}
    </div>`;
  }

  function renderRivals(s) {
    const el = ensureSection('rivals', '竞对', 'upgrades');
    if (!el) return;
    const api = opt('domain.rivals');
    const list = api && typeof api.view === 'function' ? safe(() => api.view(s), []) : [];
    const rows = (Array.isArray(list) ? list : []).map(rivalCard).join('');
    DOM.paint(el, secHead('竞对', String(list.length || 0)) +
      (rows || '<div class="empty">竞对数据未接入（P1-C0）。</div>'));
  }

  function renderWorld(s) {
    renderCrisis(s);
    renderRivals(s);
  }

  return { renderWorld, renderCrisis, renderRivals, crisisChip };
});
