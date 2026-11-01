// js/ui/panels-fans.js —— P1 个人 IP：粉丝 / 渠道 / 内容类型 / 发布
OPC.define('ui.panels-fans',
['ui.dom', 'core.util', 'core.format', 'ui.panels-base'],
function (DOM, U, F, Base) {
  'use strict';

  const { secHead, opt, safe } = Base;
  const RISK_LABEL = {
    public: '公开', image: '形象', leak: '泄密', time: '耗时', burnout: '过劳', spam: '刷屏',
    low: '低', vulnerable: '示弱', controversy: '争议', clientPrivacy: '客户隐私',
  };

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

  function riskLabel(risk) {
    return RISK_LABEL[risk] || risk || '—';
  }

  function renderFans(s) {
    const el = ensureSection('fans', '个人 IP', 'upgrades');
    if (!el) return;
    const api = opt('domain.fans');
    const view = api && typeof api.view === 'function' ? safe(() => api.view(s), null) : null;
    if (!view) {
      DOM.paint(el, secHead('个人 IP', '') + '<div class="empty">粉丝数据未接入（P1）。</div>');
      return;
    }
    const channels = Array.isArray(view.channels) ? view.channels : [];
    const types = Array.isArray(view.types) ? view.types : [];
    const defaultType = types[0] ? types[0].id : '';
    const typeOptions = types.map(type =>
      `<option value="${DOM.esc(type.id)}">${DOM.esc(type.name || type.id)}（×${type.fansMul || 1} · 风险 ${DOM.esc(riskLabel(type.risk))}）</option>`).join('');

    const cards = channels.map(channel => {
      const cost = Number(channel.cost) || 0;
      const energy = Number(channel.energy) || 0;
      const disabled = s.cash < cost || s.energy < energy;
      const reason = s.cash < cost
        ? `现金不足，还差 ${F.money(cost - s.cash)}`
        : s.energy < energy ? `精力不足，还差 ${energy - s.energy} 点` : '发布这条内容';
      return `<div class="item fans-channel">
        <div class="item-head">
          <b>${DOM.esc(channel.name || channel.id)}</b>
          <span class="tag fans-risk">风险 ${DOM.esc(riskLabel(channel.risk))}</span>
          <span class="spacer"></span>
          <button type="button" data-act="fans-post" data-channel="${DOM.esc(channel.id)}" data-type="${DOM.esc(defaultType)}" ${disabled ? 'disabled' : ''} title="${DOM.esc(reason)}">发布</button>
        </div>
        <div class="product-desc">${DOM.esc(channel.desc || '')}</div>
        <div class="item-meta">
          <span>基础 +${F.int(channel.fansBase || 0)} 粉丝</span>
          <span>成本 ${F.money(cost)}</span>
          <span>精力 ${F.int(energy)}</span>
        </div>
        ${disabled ? `<div class="deploy-hint">${DOM.esc(reason)}</div>` : ''}
      </div>`;
    }).join('');

    DOM.paint(el, secHead('个人 IP', `${F.int(view.fans || 0)} 粉丝`) + `
      <div class="item fans-summary">
        <div class="item-head">
          <span class="tag fans-tier">${DOM.esc(view.tier || '刚开号')}</span>
          <b>${F.int(view.fans || 0)} 粉丝</b>
          <span class="spacer"></span>
          <span class="muted">每日自然衰减 ${F.percent(view.decayRate || 0, 1)}</span>
        </div>
        <div class="item-meta"><span>粉丝上限 ${F.int(view.maxFans || 0)}</span><span>发布消耗现金与精力</span><span>预计粉丝 = 基础粉丝 × 内容乘数</span></div>
      </div>
      <div class="fans-type-row"><label for="fansType">内容类型</label>
        <select id="fansType" data-focus-key="fansType" aria-label="选择内容类型">${typeOptions || '<option value="">暂无内容类型</option>'}</select>
      </div>
      <div class="fans-channels">${cards || '<div class="empty">还没有发布渠道。</div>'}</div>`);
  }

  return { renderFans };
});
