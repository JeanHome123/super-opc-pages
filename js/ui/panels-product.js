// js/ui/panels-product.js —— P1 自有产品：赛道 / MVP 功能槽 / 发布 / 增长 / 出售；市场趋势条
OPC.define('ui.panels-product',
['ui.dom', 'core.util', 'core.format', 'data.balance', 'data.copy', 'ui.panels-base'],
function (DOM, U, F, B, C, Base) {
  'use strict';

  const { secHead, opt, safe, table } = Base;
  const MAX_FEATURES = (B.products && B.products.maxFeatures) || 3;

  /** 检视器里的动态分区；manifest 不新增 index.html 节点也能挂载 */
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

  function dataOf() {
    return {
      tracks: table('data.products', 'tracks'),
      features: table('data.products', 'features'),
      channels: table('data.products', 'channels'),
    };
  }

  function productOf(s) {
    const api = opt('domain.products');
    if (api && typeof api.view === 'function') return safe(() => api.view(s), null);
    return s.product && typeof s.product === 'object' ? s.product : null;
  }

  function stageLabel(stage) {
    return stage === 'mvp' ? 'MVP' : stage === 'beta' ? '内测' : stage === 'live' ? '已上线' : String(stage || '产品');
  }

  function featureName(features, id) {
    const hit = features.find(item => item && item.id === id);
    return hit ? hit.name || hit.id : id;
  }

  // ---------------------------------------------------------------- 趋势条
  function effectTags(trend) {
    const effects = trend.effects || {};
    const tags = [];
    const num = key => Number(effects[key]);
    const mul = (key, label) => {
      const value = num(key);
      if (isFinite(value) && value !== 1) tags.push(`${label} ×${value}`);
    };
    if (isFinite(num('orderTypeMul')) && num('orderTypeMul') !== 1) {
      const types = Array.isArray(trend.orderTypes) && trend.orderTypes.length
        ? trend.orderTypes.map(type => (C.types[type] || {}).name || type).join('/')
        : '全类型';
      tags.push(`${types}订单 ×${num('orderTypeMul')}`);
    }
    mul('rewardMul', '报酬');
    mul('tokenMul', 'token');
    mul('modelPriceMul', '模型价');
    if (num('complianceRisk') > 0) tags.push(`合规风险 +${F.percent(num('complianceRisk'))}`);
    if (!tags.length) return '<span class="muted">影响中性</span>';
    return tags.map(text => `<span class="tag trend-tag">${DOM.esc(text)}</span>`).join('');
  }

  function renderTrend(s) {
    const el = ensureSection('trend', '市场趋势', DOM.$('product') ? 'product' : 'upgrades');
    if (!el) return;
    const api = opt('domain.trends');
    const trend = api && typeof api.current === 'function' ? safe(() => api.current(s), null) : null;
    if (!trend) {
      DOM.paint(el, secHead('市场趋势', '平静') + `
        <div class="item trend-card calm">
          <div class="trend-head"><b>市场平静</b><span class="trend-days">暂无趋势</span></div>
          <div class="trend-desc">没有风口，也没有坏消息。按自己的节奏接单。</div>
        </div>`);
      return;
    }
    const total = Math.max(1, Number(trend.endDay) - Number(trend.startDay));
    const left = Math.max(0, Math.round(Number(trend.endDay) - s.day));
    const pct = U.clamp(left / total * 100, 0, 100);
    DOM.paint(el, secHead('市场趋势', `剩 ${left} 天`) + `
      <div class="item trend-card">
        <div class="trend-head">
          <b>${DOM.esc(trend.name || trend.id)}</b>
          <span class="trend-days">${left} 天后结束</span>
        </div>
        <div class="trend-desc">${DOM.esc(trend.desc || '')}</div>
        <div class="bar thin" role="progressbar" aria-label="趋势剩余时间" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" style="margin-top:7px"><i style="width:${pct}%"></i></div>
        <div class="trend-effects">${effectTags(trend)}</div>
      </div>`);
  }

  // ---------------------------------------------------------------- 产品
  function renderTrackPicker(s, tracks) {
    const cards = tracks.map(track => {
      const cost = Number(track.cost) || 0;
      const disabled = s.cash < cost;
      const reason = disabled ? `现金不足，还差 ${F.money(cost - s.cash)}` : '开始做这个赛道的 MVP';
      return `<div class="item product-card">
        <div class="item-head">
          <b>${DOM.esc(track.name || track.id)}</b>
          <span class="spacer"></span>
          <span class="product-cost">${F.money(cost)}</span>
        </div>
        <div class="product-desc">${DOM.esc(track.desc || '')}</div>
        <div class="item-meta"><span>启动成本 ${F.money(cost)}</span><span>种子用户 ${F.int(track.baseUsers || 0)}</span><span>月费 ${F.money(track.arpu || 0)}/人</span></div>
        <div class="product-actions">
          <button type="button" class="primary" data-act="product-start" data-track="${DOM.esc(track.id)}" ${disabled ? 'disabled' : ''} title="${DOM.esc(reason)}">开始 MVP</button>
          <span class="muted">${DOM.esc(reason)}</span>
        </div>
      </div>`;
    }).join('');
    return secHead('自有产品', `${tracks.length} 条赛道`) + `
      <div class="item product-card">
        <div class="item-head"><b>做点自己的东西</b></div>
        <div class="product-desc">选一条赛道，装三个功能，发布后按用户和 MRR 赚钱。产品会占用现金，但不用每天盯交付。</div>
      </div>
      <div class="product-grid">${cards || '<div class="empty">产品数据未接入（P1-C0）。</div>'}</div>`;
  }

  function renderMvp(s, product, tracks, features) {
    const track = tracks.find(item => item && item.id === product.track);
    const trackName = product.name || (track && track.name) || product.track;
    const featureIds = Array.isArray(product.features) ? product.features : [];
    const slots = Array.from({ length: MAX_FEATURES }, (_, index) => {
      const id = featureIds[index];
      return `<div class="product-slot ${id ? 'filled' : ''}" title="${id ? DOM.esc(featureName(features, id)) : '空功能槽'}">${id ? DOM.esc(featureName(features, id)) : `空槽 ${index + 1}`}</div>`;
    }).join('');
    const quality = U.clamp(Number(product.quality) || 0, 0, 1);
    const available = features.filter(item => item && item.track === product.track);
    const cards = available.map(feature => {
      const used = featureIds.includes(feature.id);
      const full = featureIds.length >= MAX_FEATURES;
      const poor = s.cash < (Number(feature.cost) || 0);
      const disabled = used || full || poor;
      const reason = used ? '已经装上了' : full ? '功能槽已满' : poor ? `现金不足，还差 ${F.money(Number(feature.cost) - s.cash)}` : '装上这个功能';
      return `<div class="item product-card">
        <div class="item-head">
          <b>${DOM.esc(feature.name || feature.id)}</b>
          <span class="tag" style="color:var(--service)">质量 +${F.percent(feature.quality || 0)}</span>
          <span class="spacer"></span>
          <button type="button" data-act="product-feature" data-id="${DOM.esc(feature.id)}" ${disabled ? 'disabled' : ''} title="${DOM.esc(reason)}">${used ? '已装' : `装上 · ${F.money(feature.cost)}`}</button>
        </div>
        <div class="product-desc">${DOM.esc(feature.desc || '')}</div>
        <div class="item-meta"><span>成本 ${F.money(feature.cost)}</span><span>质量 +${F.percent(feature.quality || 0)}</span></div>
      </div>`;
    }).join('');
    const canLaunch = featureIds.length >= MAX_FEATURES;
    const hint = canLaunch ? '功能齐了，发布进入内测。' : `还差 ${MAX_FEATURES - featureIds.length} 个功能才能发布。`;

    return secHead('自有产品', 'MVP') + `
      <div class="item product-card product-current">
        <div class="item-head">
          <span class="tag" style="color:var(--accent)">MVP</span>
          <b>${DOM.esc(trackName)}</b>
          <span class="spacer"></span>
          <span class="product-cost">质量 ${F.percent(quality)}</span>
        </div>
        <div class="item-meta"><span>赛道 ${DOM.esc(track ? track.name || track.id : product.track)}</span><span>功能 ${featureIds.length}/${MAX_FEATURES}</span><span>开始于 D${F.int(product.createdDay || s.day)}</span></div>
        <div class="product-slots">${slots}</div>
        <div class="bar thin product-quality" role="progressbar" aria-label="产品初始质量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(quality * 100)}"><i style="width:${quality * 100}%"></i></div>
        <div class="product-actions">
          <button type="button" class="primary" data-act="product-launch" ${canLaunch ? '' : 'disabled'} title="${DOM.esc(hint)}">发布 MVP</button>
          <span class="muted">${DOM.esc(hint)}</span>
        </div>
      </div>
      ${secHead('功能卡', `${featureIds.length}/${MAX_FEATURES}`)}
      <div class="product-grid">${cards || '<div class="empty">这个赛道还没有功能卡。</div>'}</div>`;
  }

  function renderLaunched(s, product, tracks, features, channels) {
    const track = tracks.find(item => item && item.id === product.track);
    const trackName = product.name || (track && track.name) || product.track;
    const quality = U.clamp(Number(product.quality) || 0, 0, 1);
    const churn = U.clamp(Number(product.churn) || 0, 0, 1);
    const featureIds = Array.isArray(product.features) ? product.features : [];
    const featureTags = featureIds.map(id => `<span class="tag" style="color:var(--service)">${DOM.esc(featureName(features, id))}</span>`).join('');
    const launchApi = opt('domain.launch');
    const launch = launchApi && typeof launchApi.view === 'function' ? safe(() => launchApi.view(s), null) : null;
    const starText = value => {
      const n = U.clamp(Math.round(Number(value) || 0), 0, 5);
      return '★'.repeat(n) + '☆'.repeat(5 - n);
    };
    const launchRow = !launch ? '' : launch.launchDone
      ? `<div class="launch-row"><span class="tag launch-done">发布会 ${F.int(launch.launchScore)}/5</span><span class="launch-stars small" aria-label="发布会评分 ${F.int(launch.launchScore)} / 5">${starText(launch.launchScore)}</span></div>`
      : launch.canLaunch
        ? `<div class="launch-row"><span class="tag launch-ready">预计 ${F.int(launch.score)}/5 · ${DOM.esc(launch.grade)}</span><span class="launch-stars small" aria-label="预计评分 ${F.int(launch.score)} / 5">${starText(launch.score)}</span><span class="spacer"></span><button type="button" class="primary" data-act="product-launch-event">开发布会</button></div>`
        : `<div class="launch-row"><span class="muted">产品内测发布后可开发布会。</span></div>`;
    const saleWait = safe(() => opt('domain.products').saleWait(s), 0);
    const growthUsed = product.lastGrowthDay === s.day;
    const channelCards = channels.map(channel => {
      const cost = Number(channel.cost) || 0;
      const disabled = growthUsed || s.cash < cost;
      const reason = growthUsed ? '今天已投放，明天再选择一个渠道' : disabled ? `现金不足，还差 ${F.money(cost - s.cash)}` : '每个产品每天可投放一次';
      return `<div class="item product-card product-channel">
        <div class="item-head">
          <b>${DOM.esc(channel.name || channel.id)}</b>
          <span class="spacer"></span>
          <button type="button" data-act="product-grow" data-channel="${DOM.esc(channel.id)}" ${disabled ? 'disabled' : ''} title="${DOM.esc(reason)}">投放 · ${F.money(cost)}</button>
        </div>
        <div class="product-desc">${DOM.esc(channel.desc || '')}</div>
        <div class="item-meta"><span>本次新增 ${F.int(Math.round((channel.userGain || 0) * (channel.speed || 0)))} 用户</span><span>立即生效</span><span>成本 ${F.money(cost)}</span></div>
      </div>`;
    }).join('');

    return secHead('自有产品', stageLabel(product.stage)) + `
      <div class="item product-card product-current">
        <div class="item-head">
          <span class="tag" style="color:var(--accent)">${DOM.esc(stageLabel(product.stage))}</span>
          <b>${DOM.esc(trackName)}</b>
          <span class="spacer"></span>
          <button type="button" class="ghost" data-act="product-sell" ${saleWait ? 'disabled' : ''} title="${saleWait ? `需再运营 ${saleWait} 天` : '按用户与 MRR 估值，成交后产品清空'}">${saleWait ? `出售 · 还需 ${saleWait} 天` : '出售产品'}</button>
        </div>
        <div class="product-stats">
          <span>用户 <b>${F.int(product.users || 0)}</b></span>
          <span>MRR <b>${F.money(product.mrr || 0)}</b></span>
          <span>质量 <b>${F.percent(quality)}</b></span>
          <span>流失 <b>${F.percent(churn)}</b></span>
          <span>服务器 <b>${F.money(product.serverCost || 0)}</b>/月</span>
          <span>发布 D${F.int(product.launchedDay == null ? s.day : product.launchedDay)}</span>
        </div>
        <div class="bar thin product-quality" role="progressbar" aria-label="产品质量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(quality * 100)}"><i style="width:${quality * 100}%"></i></div>
        <div class="persona-row">${featureTags || '<span class="muted">还没有功能标签。</span>'}</div>
        ${launchRow}
      </div>
      ${secHead('增长渠道', `${channels.length} 个`)}
      <p class="dim">${growthUsed ? '今日已投放，明天可再选择一个渠道。' : '每个产品每天可投放一次。'}</p>
      <div class="product-grid">${channelCards || '<div class="empty">增长渠道数据未接入。</div>'}</div>`;
  }

  function renderProduct(s) {
    renderTrend(s);
    const el = ensureSection('product', '自有产品', 'upgrades');
    if (!el) return;
    const data = dataOf();
    const product = productOf(s);
    if (!product) {
      DOM.paint(el, renderTrackPicker(s, data.tracks));
      return;
    }
    DOM.paint(el, product.stage === 'mvp'
      ? renderMvp(s, product, data.tracks, data.features)
      : renderLaunched(s, product, data.tracks, data.features, data.channels));
  }

  return { renderProduct, renderTrend };
});
