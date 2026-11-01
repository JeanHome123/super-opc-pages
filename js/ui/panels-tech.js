// js/ui/panels-tech.js —— P2 技术树：3 条路线 / 12 节点 / 研究
OPC.define('ui.panels-tech',
['ui.dom', 'core.util', 'core.format', 'ui.panels-base'],
function (DOM, U, F, Base) {
  'use strict';

  const { secHead, opt, safe } = Base;
  const EFFECT_LABEL = {
    token: 'token', quality: '质量', accident: '事故', work: '产出',
    modelPrice: '模型价', complianceRisk: '合规风险', rep: '声誉',
    sync: '同步率', fans: '粉丝', compliance: '合规',
  };
  const UNLOCK_LABEL = {
    multimodal: '多模态', orchestration: '多智能体编排',
    ownModel: '自研模型', agi: 'AGI 实验室',
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

  function effectText(key, value) {
    if (key === 'unlock' && typeof value === 'string') return `解锁 ${UNLOCK_LABEL[value] || value}`;
    if (key === 'unlocks' && Array.isArray(value)) return value.map(item => `解锁 ${UNLOCK_LABEL[item] || item}`).join(' · ');
    if (typeof value !== 'number' || !isFinite(value)) return '';
    const label = EFFECT_LABEL[key] || key;
    if (['quality'].includes(key)) return `${label} +${F.percent(value)}`;
    if (['token', 'accident', 'work', 'modelPrice', 'complianceRisk'].includes(key)) return `${label} ×${value}`;
    return `${label} +${value}`;
  }

  function effectTags(effects, changedOnly) {
    if (!effects || typeof effects !== 'object') return '<span class="muted">尚无技术加成。</span>';
    const tags = [];
    for (const [key, value] of Object.entries(effects)) {
      if (key === 'unlocks') {
        if (Array.isArray(value) && value.length) tags.push(`解锁 ${value.map(item => UNLOCK_LABEL[item] || item).join(' / ')}`);
        continue;
      }
      if (changedOnly && ((key === 'quality' && value === 0) || (['token', 'accident', 'work', 'modelPrice', 'complianceRisk'].includes(key) && value === 1))) continue;
      const text = effectText(key, value);
      if (text) tags.push(text);
    }
    if (!tags.length) return '<span class="muted">尚无技术加成。</span>';
    return tags.map(text => `<span class="tag tech-effect">${DOM.esc(text)}</span>`).join('');
  }

  function nameOf(nodes, id) {
    const hit = (nodes || []).find(node => node && node.id === id);
    return hit ? hit.name || hit.id : id;
  }

  function nodeCard(node, allNodes, s) {
    const status = node.status || (node.owned ? 'owned' : node.available ? 'available' : 'locked');
    const statusText = status === 'owned' ? '已研究' : status === 'available' ? '可研究' : '未解锁';
    const requires = Array.isArray(node.requires) ? node.requires : [];
    const reqText = requires.length ? `前置：${requires.map(id => nameOf(allNodes, id)).join('、')}` : '';
    let reason = '';
    if (status === 'available' && !node.affordable) {
      reason = s.cash < (Number(node.cost) || 0)
        ? `现金不足，还差 ${F.money((Number(node.cost) || 0) - s.cash)}`
        : `研发点不足，还差 ${F.int((Number(node.rpCost) || 0) - s.rp)} RP`;
    }
    const action = status === 'available'
      ? `<button type="button" data-act="tech-buy" data-id="${DOM.esc(node.id)}" ${node.affordable ? '' : 'disabled'} title="${DOM.esc(reason || '消耗现金与研发点，解锁这个技术')}">研究</button>`
      : '';
    const desc = node.desc ? `<div class="product-desc">${DOM.esc(node.desc)}</div>` : '';
    const req = reqText ? `<div class="tech-req">${DOM.esc(reqText)}</div>` : '';
    return `<div class="item tech-node ${status}">
      <div class="item-head">
        <span class="tag tech-${status}">${statusText}</span>
        <b>${DOM.esc(node.name || node.id)}</b>
        <span class="spacer"></span>
        <span class="tech-costs">${F.money(node.cost || 0)} · ${F.int(node.rpCost || 0)} RP</span>
        ${action}
      </div>
      ${desc}
      <div class="tech-effects">${effectTags(node.effects)}</div>
      ${req}
      ${reason ? `<div class="deploy-hint">${DOM.esc(reason)}</div>` : ''}
    </div>`;
  }

  function renderTech(s) {
    const el = ensureSection('tech', '技术树', 'upgrades');
    if (!el) return;
    const api = opt('domain.tech');
    const view = api && typeof api.view === 'function' ? safe(() => api.view(s), null) : null;
    if (!view) {
      DOM.paint(el, secHead('技术树', '') + '<div class="empty">技术树数据未接入（P2）。</div>');
      return;
    }
    const lines = Array.isArray(view.lines) ? view.lines : [];
    const nodes = Array.isArray(view.nodes) ? view.nodes : [];
    const owned = Array.isArray(view.owned) ? view.owned : [];
    const pct = nodes.length ? owned.length / nodes.length * 100 : 0;
    const lineHtml = lines.map(line => {
      const lineNodes = Array.isArray(line.nodes) ? line.nodes : [];
      const lineOwned = lineNodes.filter(node => node.owned).length;
      return `<div class="tech-line">
        <div class="tech-line-head">
          <b>${DOM.esc(line.name || line.id)}</b>
          <span class="muted">${lineOwned}/${lineNodes.length}</span>
        </div>
        ${line.desc ? `<div class="product-desc">${DOM.esc(line.desc)}</div>` : ''}
        <div class="tech-nodes">${lineNodes.map(node => nodeCard(node, nodes, s)).join('')}</div>
      </div>`;
    }).join('');

    DOM.paint(el, secHead('技术树', `${owned.length}/${nodes.length}`) + `
      <div class="item tech-summary">
        <div class="item-head">
          <span class="tag tech-rp">研发点 ${F.int(view.rp || 0)} RP</span>
          <span class="muted">已研究 ${owned.length}/${nodes.length}</span>
          <span class="spacer"></span>
          <span class="muted">研究消耗现金 + RP</span>
        </div>
        <div class="bar thin" role="progressbar" aria-label="技术树完成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" style="margin-top:7px"><i style="width:${pct}%"></i></div>
        <div class="tech-effects">${effectTags(view.effects, true)}</div>
      </div>
      <div class="tech-lines">${lineHtml || '<div class="empty">还没有技术路线。</div>'}</div>`);
  }

  return { renderTech };
});
