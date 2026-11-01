// js/ui/panels-orders.js —— 订单 / 客户 / 需求卡 / 进行中项目
OPC.define('ui.panels-orders',
['ui.dom', 'core.util', 'core.format', 'data.copy', 'ui.panels-base', 'data.balance'],
function (DOM, U, F, C, Base, B) {
  'use strict';

  const { tagOf, secHead } = Base;

  // ---------------------------------------------------------------- 订单 2.0 预留
  function clientLine(client) {
    if (!client) return '';
    if (typeof client === 'string') return `<div class="client-line"><b>${DOM.esc(client)}</b></div>`;
    const name = client.name || '甲方';
    const industry = client.industry
      ? `<span class="tag" style="color:var(--info)">${DOM.esc(client.industry)}</span>` : '';
    const quote = client.quote ? `<q class="client-quote">${DOM.esc(client.quote)}</q>` : '';
    return `<div class="client-line">
      <span class="client-avatar" aria-hidden="true">${DOM.esc(String(name).slice(0, 1))}</span>
      <b>${DOM.esc(name)}</b>${industry}${quote}
    </div>`;
  }
  function needsLine(offer) {
    const needs = Array.isArray(offer.needs) ? offer.needs : [];
    if (!needs.length) return '';
    const cards = needs.map(need => {
      const kind = ['core', 'bonus', 'hidden'].includes(need.kind) ? need.kind : 'core';
      const revealed = need.revealed !== false;
      const label = revealed ? (need.label || need.id || '需求') : '隐藏需求';
      const weight = need.weight == null ? '' : `<span class="w">×${need.weight}</span>`;
      return `<span class="need-card kind-${kind} ${revealed ? '' : 'locked'}"
        title="${revealed ? '' : '还没拆解的需求'}">${DOM.esc(label)}${weight}</span>`;
    }).join('');
    const hidden = needs.some(n => n.kind === 'hidden' && !n.revealed);
    return `<div class="needs">${cards}</div><div class="item-meta">验收：可用 ${F.percent(B.contracts.usableQuality)} / 商用 ${F.percent(B.contracts.commercialQuality)} / 惊艳 ${F.percent(B.contracts.stunningQuality)} / 隐藏 ${F.percent(B.contracts.hiddenQuality)}；加急需提前 ${B.contracts.rushDays} 天。需求不符仅返工一次；再次交付按基本质量结款，但需求未满足会损失关系。固定总价返工不涨价；分成卡需低价成交且基本质量达标，交付追加 ${F.percent(B.contracts.bonusRate)}。</div>
      ${hidden ? `<button type="button" data-act="inspect-needs" data-id="${offer.id}">访谈揭示需求 · ${F.money(B.contracts.inspectCost)} / 精力 ${B.contracts.inspectEnergy}（隐藏验收门槛降低 ${F.percent(B.contracts.inspectQuality)}）</button>` : ''}`;
  }
  function quotesLine(s, offer) {
    const quotes = Array.isArray(offer.quotes) ? offer.quotes : [];
    if (!quotes.length) return '';
    const buttons = quotes.map((quote, index) => {
      const pay = quote.payMul == null ? '—' : quote.payMul;
      const accept = F.percent(OPC.require('domain.clients').acceptChance(s, offer, index), 1);
      const relation = quote.relation == null ? 0 : quote.relation;
      const relationText = relation > 0 ? `+${relation}` : String(relation);
      return `<button type="button" class="quote-chip" data-act="accept"
        data-id="${offer.id}" data-q="${index}"
        style="flex:1 1 100%;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;background:var(--surface-2);border-color:var(--line);border-radius:8px;color:var(--text);padding:4px 9px;line-height:1.4"
        title="报酬 ×${pay} · 接受率 ${accept} · 关系 ${relationText}">
        <b>${DOM.esc(quote.label || quote.id || '报价')}</b>
        <span>×${pay} · 接受 ${accept} · 关系 ${relationText}</span>
      </button>`;
    }).join('');
    return `<div class="quote-row" aria-label="三档报价">${buttons}</div>`;
  }

  function projectQuoteLine(project) {
    const quote = project.quote;
    if (!quote) return '';
    const pay = quote.payMul == null ? '—' : quote.payMul;
    const relation = quote.relation == null ? 0 : quote.relation;
    const relationText = relation > 0 ? `+${relation}` : String(relation);
    return `<div class="quote-row" aria-label="成交报价">
      <span class="quote-chip">成交 ${DOM.esc(quote.label || quote.id || '标准')} ×${pay} · 关系 ${relationText}</span>
    </div>`;
  }

  function renderProjects(s) {
    const list = s.projects.map(project => {
      const quality = project.done ? project.qsum / project.done : 0;
      const left = project.deadline - s.day;
      const pct = U.clamp(project.done / project.work * 100, 0, 100);
      const barClass = left < 3 ? 'danger' : left < 6 ? 'warn' : '';
      const qClass = quality && quality < project.minQ ? 'bad' : 'good';
      return `<div class="item">
        <div class="item-head">
          ${tagOf(project.type)}<b>${DOM.esc(project.name)}</b>
          <span class="spacer"></span>
          <span class="mono gold">${F.money(project.reward)}</span>
        </div>
        ${clientLine(project.client)}
        <div class="bar ${barClass}" style="margin:7px 0 6px"><i style="width:${pct}%"></i></div>
        <div class="item-meta">
          <span>${Math.floor(project.done)}/${project.work}</span>
          <span>质量 <b class="${qClass}">${Math.round(quality * 100)}%</b> / 需 ${Math.round(project.minQ * 100)}%</span>
          <span class="${left < 5 ? 'bad' : ''}">剩 ${left} 天</span>
          <span>${project.crew.length} 人在做</span>${project.reworked ? '<span class="bad">已返工一次，请检查质量与需求</span>' : ''}
        </div>
        ${needsLine(project)}${projectQuoteLine(project)}
      </div>`;
    }).join('');

    DOM.paint(DOM.$('projects'),
      secHead('进行中项目', String(s.projects.length)) +
      (list || `<div class="empty">${DOM.esc(C.ui.emptyProjects)}</div>`));
  }

  function renderOffers(s) {
    const list = s.offers.map(offer => {
      const hasQuotes = Array.isArray(offer.quotes) && offer.quotes.length > 0;
      const accept = hasQuotes ? '' :
        `<button type="button" data-act="accept" data-id="${offer.id}">接单</button>`;
      const active = s.negotiation && s.negotiation.offerId === offer.id && !s.negotiation.result;
      const busy = s.negotiation && !active;
      const negotiate = active
        ? `<button type="button" class="primary" data-act="negotiate-start" data-id="${offer.id}">继续谈判</button>`
        : offer.negotiated
          ? '<span class="tag" style="color:var(--service)">已谈判</span>'
          : `<button type="button" class="ghost" data-act="negotiate-start" data-id="${offer.id}" ${busy ? 'disabled' : ''} title="${busy ? '先结束当前谈判' : '和甲方谈价格、工期与关系'}">谈判</button>`;
      return `<div class="item order-card">
        <div class="item-head">
          ${tagOf(offer.type)}<b>${DOM.esc(offer.name)}</b>
          <span class="spacer"></span>
          <span class="mono gold">${F.money(offer.reward)}</span>
          ${negotiate}${accept}
        </div>
        ${clientLine(offer.client)}<div class="item-meta">客户关系 ${(s.clientRelations && offer.client && s.clientRelations[offer.client.archetype]) || 0}</div>
        <div class="item-meta">
          <span>工作量 ${offer.work}</span>
          <span>质量 ≥${Math.round(offer.minQ * 100)}%</span>
          <span>工期 ${offer.days} 天</span>
          <span class="${offer.expires - s.day <= 3 ? 'bad' : ''}">${offer.expires - s.day} 天后过期</span>
          ${active ? `<span class="tag" style="color:var(--accent)">谈判中 ${s.negotiation.round}/3</span>` : ''}
        </div>
        ${needsLine(offer)}${quotesLine(s, offer)}
      </div>`;
    }).join('');

    DOM.paint(DOM.$('offers'),
      secHead('订单板', String(s.offers.length)) +
      (list || `<div class="empty">${DOM.esc(C.ui.emptyOffers)}</div>`));
  }

  return { renderProjects, renderOffers };
});
