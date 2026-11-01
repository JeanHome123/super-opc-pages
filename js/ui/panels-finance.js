// js/ui/panels-finance.js —— P2 融资：轮次 / 投资人 / 估值 / 签约确认
OPC.define('ui.panels-finance',
['ui.dom', 'core.util', 'core.format', 'ui.panels-base'],
function (DOM, U, F, Base) {
  'use strict';

  const { secHead, opt, safe, table } = Base;
  const STYLE_LABEL = { friendly: '友好', aggressive: '激进', resourceful: '资源型', fraud: '高估值' };

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

  function investorName(list, id) {
    const hit = list.find(item => item && item.id === id);
    return hit ? hit.name || hit.id : (id || '—');
  }

  function roundStatus(round) {
    if (round.done) return '已完成';
    if (round.current) return round.available ? '可融资' : `还要等 ${round.daysUntil} 天`;
    return round.daysUntil > 0 ? `还要等 ${round.daysUntil} 天` : '未轮到';
  }

  function investorCard(investor, round, offer, s) {
    const amount = offer && Number.isFinite(offer.amount) ? offer.amount : investor.amount;
    const equity = offer && Number.isFinite(offer.equity) ? offer.equity : investor.equity;
    const mul = offer && Number.isFinite(offer.valuationMul) ? offer.valuationMul : investor.valuationMul;
    const available = !!(round.current && offer && offer.available);
    const reason = round.done ? '这一轮已经完成'
      : !round.current ? (round.daysUntil > 0 ? `还要等 ${round.daysUntil} 天` : '还没轮到这一轮')
        : !offer || !offer.available ? '投资人还没到看这一轮的时间'
          : '';
    const action = available
      ? `<button type="button" class="primary" data-act="finance-raise" data-round="${DOM.esc(round.id)}" data-investor="${DOM.esc(investor.id)}">融资</button>`
      : `<button type="button" disabled title="${DOM.esc(reason)}">融资</button>`;
    return `<div class="item finance-investor ${available ? 'available' : 'locked'}">
      <div class="item-head">
        <b>${DOM.esc(investor.name || investor.id)}</b>
        <span class="tag finance-style">${DOM.esc(STYLE_LABEL[investor.style] || '投资人')}</span>
        <span class="spacer"></span>${action}
      </div>
      <div class="product-desc">${DOM.esc(investor.desc || '')}</div>
      <div class="item-meta">
        <span>到账 ${F.money(amount || 0)}</span>
        <span>出让 ${F.percent(equity || 0, 1)}</span>
        <span>估值倍率 ×${Number.isFinite(mul) ? mul : 1}</span>
      </div>
      <div class="finance-term">${DOM.esc(investor.term || round.term || '')}</div>
      ${reason ? `<div class="deploy-hint">${DOM.esc(reason)}</div>` : ''}
    </div>`;
  }

  function renderFinance(s) {
    const el = ensureSection('finance', '融资', 'upgrades');
    if (!el) return;
    const api = opt('domain.finance');
    const view = api && typeof api.view === 'function' ? safe(() => api.view(s), null) : null;
    if (!view) {
      DOM.paint(el, secHead('融资', '') + '<div class="empty">融资数据未接入（P2）。</div>');
      return;
    }
    const rounds = Array.isArray(view.rounds) ? view.rounds : [];
    const offers = Array.isArray(view.offers) ? view.offers : [];
    const offerMap = new Map(offers.map(offer => [offer.id, offer]));
    const investors = table('data.finance', 'investors');
    const current = rounds.find(round => round.current) || null;
    const next = rounds.find(round => !round.done) || null;
    const equityPct = U.clamp(Number(view.equity) || 0, 0, 1) * 100;
    const investor = investorName(investors, view.investor);
    const roundLabel = view.round > 0 ? `已完成 ${view.round}/3 轮` : '尚未融资';

    const roundCards = rounds.map(round => {
      const ids = Array.isArray(round.investors) ? round.investors : [];
      const cards = ids.map(id => {
        const investorDef = investors.find(item => item && item.id === id);
        return investorDef ? investorCard(investorDef, round, offerMap.get(id), s) : '';
      }).join('');
      const status = roundStatus(round);
      return `<div class="item finance-round ${round.done ? 'done' : round.current ? 'current' : 'locked'}">
        <div class="item-head">
          <span class="tag finance-round-tag">第 ${round.round} 轮</span>
          <b>${DOM.esc(round.name || round.id)}</b>
          <span class="spacer"></span>
          <span class="mono">${F.money(round.amount || 0)} · ${F.percent(round.equity || 0, 1)}</span>
        </div>
        <div class="product-desc">${DOM.esc(round.desc || '')}</div>
        <div class="finance-term">${DOM.esc(round.term || '')}</div>
        <div class="finance-status">${DOM.esc(status)}</div>
        <div class="finance-investors">${cards || '<div class="empty">这一轮没有可谈的投资人。</div>'}</div>
      </div>`;
    }).join('');

    DOM.paint(el, secHead('融资', roundLabel) + `
      <p class="dim">融资可用于经营，但不计入净经营现金通关目标或遗产现金得分。</p>
      <div class="item finance-summary">
        <div class="item-head">
          <span class="tag finance-valuation">估值 ${F.money(view.valuation || 0)}</span>
          <b>${DOM.esc(current ? current.name : '融资已完成')}</b>
          <span class="spacer"></span>
          <span class="mono gold">已融 ${F.money(view.raised || 0)}</span>
        </div>
        <div class="item-meta">
          <span>当前股权 <b>${F.percent(view.equity || 0, 1)}</b></span>
          <span>投资人 ${DOM.esc(investor)}</span>
          <span>${next ? `下一轮 ${DOM.esc(next.name)} · ${DOM.esc(roundStatus(next))}` : '三轮融资已完成'}</span>
        </div>
        <div class="bar thin" role="progressbar" aria-label="累计出让股权" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(equityPct)}" style="margin-top:7px"><i style="width:${equityPct}%"></i></div>
        ${view.term ? `<div class="finance-pressure">董事会 / 条款：${DOM.esc(view.term)}</div>` : ''}
      </div>
      <div class="finance-rounds">${roundCards || '<div class="empty">还没有融资轮次。</div>'}</div>`);
  }

  return { renderFinance };
});
