// js/ui/panels.js —— 共享 UI 工具 + 面板编排（P0-2.0）
// 子面板由 manifest 单独加载：team / company / orders / log。
OPC.define('ui.panels-base',
['ui.dom', 'core.util', 'core.format', 'data.balance', 'data.catalog', 'data.copy', 'domain.economy'],
function (DOM, U, F, B, D, C, Econ) {
  'use strict';

  const TYPE_COLOR = {
    code: '#e2a45c', content: '#d98fa6', service: '#a8b263',
    agent: '#7fb7c9', audit: '#b79ad9',
  };
  const tagOf = type =>
    `<span class="tag" style="color:${TYPE_COLOR[type] || '#fff'}">${DOM.esc((C.types[type] || {}).name || type)}</span>`;

  const secHead = (title, count, extra = '', cls = '') => `
    <div class="sec-head ${cls}">
      <span class="title">${DOM.esc(title)}</span>
      ${count === null ? '' : `<span class="count">${DOM.esc(count)}</span>`}
      <span class="spacer"></span>${extra}
    </div>`;
  // ---------------------------------------------------------------- 2.0 适配层
  // 数据/规则模块由并行任务合并；未合并时返回 null，1.x 骨架仍能启动、面板显示空状态。
  function opt(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      console.warn('[ui] 模块读取失败：' + name, error);
      return null;
    }
  }
  function safe(fn, fallback) {
    try {
      const value = fn();
      return value == null ? fallback : value;
    } catch (error) {
      console.warn('[ui] 面板读取失败', error);
      return fallback;
    }
  }
  function table(name, key) {
    const mod = opt(name);
    if (!mod) return [];
    if (Array.isArray(mod)) return mod;
    return Array.isArray(mod[key]) ? mod[key] : [];
  }
  /** 文案优先取 data 项里的 name，再查 copy.js 的各种命名空间，最后回退 id */
  function labelOf(ns, id, fallback) {
    const boxes = [C[ns], C.personas && C.personas[ns], C.chapters && C.chapters[ns], C.office && C.office[ns]];
    for (const box of boxes) {
      if (!box) continue;
      const hit = Array.isArray(box) ? box.find(item => item.id === id) : box[id];
      if (!hit) continue;
      if (typeof hit === 'string') return hit;
      if (hit.name) return hit.name;
    }
    return fallback || id;
  }
  function personaDef(kind, id) {
    return table('data.personas', kind).find(item => item.id === id) || null;
  }
  function personaLabel(kind, id) {
    const def = personaDef(kind, id);
    return labelOf(kind, id, def && def.name) || String(id);
  }
  function roleName(id) {
    return (C.roles[id] || {}).name || id;
  }
  function personaTagsOf(agent) {
    const persona = (agent && agent.persona) || {};
    const archetype = persona.archetype
      ? `<span class="tag persona" title="本源人格">${DOM.esc(personaLabel('archetypes', persona.archetype))}</span>`
      : '';
    const quirks = (Array.isArray(persona.quirks) ? persona.quirks : []).map(item => {
      const id = typeof item === 'string' ? item : item && item.id;
      return id ? `<span class="tag quirk" title="怪癖">${DOM.esc(personaLabel('quirks', id))}</span>` : '';
    }).join('');
    return archetype + quirks || '<span class="tag" style="color:var(--muted)">人格未分配</span>';
  }
  function officeStages() {
    return table('data.office', 'stages');
  }
  function officeStage(s) {
    const api = opt('domain.office');
    if (api && typeof api.stageOf === 'function') {
      const stage = safe(() => api.stageOf(s), null);
      if (stage) return stage;
    }
    const stages = officeStages();
    const raw = Number(s.office && s.office.stage) || 0;
    return stages[U.clamp(raw, 0, Math.max(0, stages.length - 1))] || null;
  }
  function officeIndex(s, stage) {
    const stages = officeStages();
    const at = stage ? stages.findIndex(item => item.id === stage.id) : -1;
    const raw = at >= 0 ? at : Number(s.office && s.office.stage) || 0;
    return U.clamp(raw, 0, Math.max(0, stages.length - 1));
  }
  function slotsOf(s) {
    const api = opt('domain.office');
    if (api && typeof api.slots === 'function') return safe(() => api.slots(s), B.maxAgents);
    const stage = officeStage(s);
    return stage && stage.slots != null ? stage.slots : B.maxAgents;
  }
  function rentOf(s) {
    const api = opt('domain.office');
    if (api && typeof api.rent === 'function') return safe(() => api.rent(s), null);
    const stage = officeStage(s);
    return stage && stage.rent != null ? stage.rent : null;
  }
  function nextStageOf(s) {
    const api = opt('domain.office');
    if (api && typeof api.nextStage === 'function') return safe(() => api.nextStage(s), null);
    const stages = officeStages();
    const at = officeIndex(s, officeStage(s)) + 1;
    return stages[at] || null;
  }
  function deployCost(s) {
    return Econ && typeof Econ.deployCost === 'function' ? safe(() => Econ.deployCost(s), 0) : 0;
  }
  function archiveList(s) {
    return Array.isArray(s.archive) ? s.archive : [];
  }
  function metricText(metric, value) {
    if (value == null || !isFinite(Number(value))) return '—';
    const number = Number(value);
    if (/cash|money|mrr|income|revenue|profit|rent/i.test(String(metric || ''))) return F.money(number);
    if (Math.abs(number) <= 1 && !Number.isInteger(number)) return F.percent(number);
    return F.int(number);
  }
  return {
    TYPE_COLOR, tagOf, secHead, opt, safe, table, labelOf, personaDef, personaLabel,
    roleName, personaTagsOf, officeStages, officeStage, officeIndex, slotsOf,
    rentOf, nextStageOf, deployCost, archiveList, metricText,
  };
});
OPC.define('ui.panels',
['ui.dom', 'core.util', 'core.format', 'data.balance', 'data.catalog', 'data.copy', 'domain.economy',
  'ui.panels-base', 'ui.panels-team', 'ui.panels-company', 'ui.panels-orders', 'ui.panels-log', 'ui.panels-story', 'ui.panels-product', 'ui.panels-world', 'ui.panels-tech', 'ui.panels-finance', 'ui.panels-fans'],
function (DOM, U, F, B, D, C, Econ, Base, TeamPanels, CompanyPanels, OrderPanels, LogPanels, StoryPanels, ProductPanels, WorldPanels, TechPanels, FinancePanels, FansPanels) {
  'use strict';
  const { TYPE_COLOR, slotsOf, opt, safe } = Base;
  function renderHud(s, view = {}) {
    const burn = s.report ? s.report.token : Econ.burnToday(s);
    const busy = s.agents.filter(agent => agent.busy).length;
    const slots = slotsOf(s);
    const operatingCash = s.cash - (s.finance && s.finance.raised || 0);
    const progress = U.clamp(operatingCash / B.goal * 100, 0, 100);
    const chain = view.chain || null;
    const audit = opt('domain.audit'), compliance = audit ? safe(() => audit.score(s), B.complianceStart) : null;
    DOM.paint(DOM.$('stats'), `
      <span class="brand"><span class="mark">OPC</span><span class="name">一人公司物语</span></span>
      <span class="stat day"><i>📅</i><b>${s.day}</b><span class="muted">第 ${F.monthOf(s.day)} 月</span></span>
      <span class="stat"><span class="k">现金</span><b class="${s.cash < B.cashWarning ? 'bad' : 'accent'}">${F.money(s.cash)}</b></span>
      <span class="stat"><span class="k">声誉</span><b>${s.rep}</b></span>
      <span class="stat"><span class="k">精力</span><b class="${s.energy < B.tiredBelow ? 'bad' : ''}">${s.energy}</b></span>
      <span class="stat"><span class="k">在岗</span><b>${busy}/${slots}</b></span>
      <span class="stat"><span class="k">订阅</span><b>${F.money(s.mrr)}</b></span>
      <span class="stat" title="今天所有在岗 agent 烧掉的 token"><span class="k">今日 token</span><b class="amber">${F.money(burn)}</b></span>
      <span class="stat hide-sm" title="本月累计 token"><span class="k">本月</span><b>${F.money(s.month.token)}</b></span>
      ${chain ? `<button type="button" class="stat chain-stat" data-pane="team" title="查看事件链：${DOM.esc(chain.title || chain.id || '')}" aria-label="查看事件链"><span class="k">事件链</span><b class="amber">第 ${(chain.step || 0) + 1}/${chain.total || '?'} 步</b></button>` : ''}
      ${WorldPanels.crisisChip(s)}
      ${compliance == null ? '' : `<span class="stat" title="合规分：影响监管风险与认证资格"><span class="k">合规</span><b class="${compliance < B.complianceCrisisBelow ? 'bad' : compliance < B.complianceCertThreshold ? 'amber' : ''}">${compliance}</b></span>`}
      ${s.throttle > 0 ? `<span class="stat"><span class="k">限流</span><b class="bad">${s.throttle} 天</b></span>` : ''}
      <span class="goal">
        <span class="top"><span title="融资款不计入盈利通关目标">净经营现金目标 ${F.money(B.goal)}</span><b>${F.percent(progress / 100, 1)}</b></span>
        <span class="bar ${progress > 65 ? '' : 'warn'}"><i style="width:${progress}%"></i></span>
      </span>
    `);
  }
  function nextHint(s) {
    if (!s.projects.length && s.offers.length) return '订单板上有单，先接一单';
    if (s.projects.length && s.agents.every(agent => !agent.busy)) return '有人闲着，检查一下项目指派';
    if (s.energy < B.tiredBelow) return '精力见底了，今天该休息';
    if (s.cash < 0) return '已在透支：切「省钱」模式，或尽快交付回款';
    if (s.cash < B.cashWarning) return '现金偏紧，留意每天的 token 开支';
    if (s.projects.some(project => project.deadline - s.day <= 3)) return '有项目快到期，可切「深度思考」赶工';
    if (!s.offers.length) return '手上没单了，可以「跑客户」带一单回来';
    return '';
  }
  function renderObjectives(s) {
    const goals = C.goals || [];
    const doneCount = goals.filter(goal => goal.done(s)).length;
    const allDone = goals.length > 0 && doneCount === goals.length;
    const hint = nextHint(s);
    if (allDone && !hint) {
      DOM.paint(DOM.$('objectives'), '');
      return;
    }
    const rows = allDone ? '' : goals.map(goal => {
      const done = goal.done(s);
      return `<div class="goal-row ${done ? 'done' : ''}"><span class="tick">${done ? '✓' : '○'}</span>${DOM.esc(goal.text)}</div>`;
    }).join('');
    DOM.paint(DOM.$('objectives'), [
      allDone ? '' : `<div class="obj-head"><span>新手目标</span><span class="mono">${doneCount}/${goals.length}</span></div>`,
      rows,
      hint ? `<div class="obj-hint">💡 ${DOM.esc(hint)}</div>` : '',
    ].join(''));
  }
  function renderDock(s, view) {
    const modes = Object.values(B.modes).map(mode => `
      <button type="button" data-act="mode" data-v="${mode.id}" class="${s.mode === mode.id ? 'on' : ''}"
        title="${DOM.esc(mode.desc)}">${DOM.esc(mode.name)}</button>`).join('');

    const speed = (view && view.speed) || 0;
    const speeds = [0, 1, 2, 4].map(value =>
      `<button type="button" data-act="speed" data-v="${value}" class="${speed === value ? 'on' : ''}"
        title="${value === 0 ? '暂停自动推进' : '自动推进'}">${value === 0 ? '⏸' : `${value}×`}</button>`).join('');

    DOM.paint(DOM.$('dockMain'), `
      <button type="button" class="primary" id="next" data-act="next">下一天 ▶</button>
      <span class="seg"><span class="seg-label">速度</span>${speeds}</span>
      <button type="button" class="ghost" id="fast" data-act="fast"
        title="一直推进，直到有交付 / 事件 / 快讯 / agent 闲下来 / 现金告急（最多 30 天）">⏩ 快进</button>
      <span class="seg"><span class="seg-label">消耗模式</span>${modes}</span>
      <span class="seg"><span class="seg-label">自动化</span>
        <label class="auto" title="只接团队质量够、排期做得完的单">
          <input type="checkbox" data-auto="accept" data-focus-key="auto-accept" ${s.auto.accept ? 'checked' : ''}>自动接单</label>
        <label class="auto" title="精力低于 ${B.autoRestBelow} 时当天改为休息">
          <input type="checkbox" data-auto="rest" data-focus-key="auto-rest" ${s.auto.rest ? 'checked' : ''}>低精力自动休息</label>
      </span>
    `);

    const chips = Object.values(D.actions).map(action => {
      const copy = C.actions[action.id] || { name: action.id, desc: '' };
      const disabled = s.energy + action.energy < 0 ? 'disabled' : '';
      return `<button type="button" class="action-chip ${s.action === action.id ? 'on' : ''}"
        data-act="action" data-v="${action.id}" title="${DOM.esc(copy.desc)}" ${disabled}>
        ${DOM.esc(copy.name)}<span class="delta">${action.energy > 0 ? '+' : ''}${action.energy}</span></button>`;
    }).join('');

    const hint = (C.actions[s.action] || {}).desc || '';
    DOM.paint(DOM.$('dockActions'), `
      <span class="seg-label nowrap">今日行动</span>${chips}
      <span class="muted" style="margin-left:2px">${DOM.esc(hint)}</span>
    `);
  }


  function renderTicker(s) {
    const latest = s.log[0];
    const headline = latest ? latest.text : (C.ui.emptyLog || '公司还没开张。');
    const tone = /^(✅)/.test(headline) ? '' : /^(❌|💸)/.test(headline) ? ' style="color:var(--danger)"' : '';
    DOM.paint(DOM.$('ticker'), `
      <span class="dot"></span>
      <span class="text"><b>D${s.day}</b>　<span${tone}>${DOM.esc(headline)}</span></span>
      <button type="button" class="ghost" data-pane="log">看日报</button>
    `);
  }


  function renderInspTabs(s) {
    const current = (DOM.$('inspector') || { dataset: {} }).dataset.pane || 'team';
    const tabs = [
      ['team', '团队', `${s.agents.length}/${slotsOf(s)}`],
      ['orders', '订单', String(s.offers.length)],
      ['company', '公司', `${s.upgrades.length}/${D.upgrades.length}`],
      ['log', '日志', ''],
    ];
    DOM.paint(DOM.$('inspTabs'), tabs.map(([pane, label, count]) => `
      <button type="button" data-pane="${pane}" class="${current === pane ? 'on' : ''}">
        ${label}${count ? ` <span class="muted">${count}</span>` : ''}
      </button>`).join(''));
  }

  /** 全量重绘 */
  function renderAll(s, view = {}) {
    renderHud(s, view);
    renderTicker(s);
    renderObjectives(s);
    renderDock(s, view);
    renderInspTabs(s);
    StoryPanels.renderStory(s, view.chain || null);
    TeamPanels.renderAgents(s);
    OrderPanels.renderProjects(s);
    OrderPanels.renderOffers(s);
    CompanyPanels.renderOffice(s);
    OPC.require('ui.collection').paint(s, OPC.require('ui.meta').read());
    CompanyPanels.renderChapter(s);
    ProductPanels.renderProduct(s);
    WorldPanels.renderWorld(s);
    TechPanels.renderTech(s);
    FinancePanels.renderFinance(s);
    FansPanels.renderFans(s);
    CompanyPanels.renderUpgrades(s);
    CompanyPanels.renderMarket(s);
    LogPanels.renderReport(s, view.lastRun || null);
    LogPanels.renderLog(s);
  }

  /** 推进按钮可用状态 */
  function renderTurnButtons(s) {
    const blocked = !!s.over || !!s.pending;
    ['next', 'fast', 'fab'].forEach(id => {
      const el = DOM.$('fab') && id === 'fab' ? DOM.$('fab') : DOM.$(id);
      if (el) el.disabled = blocked;
    });
  }

  return { renderAll, renderTurnButtons, renderInspTabs, TYPE_COLOR };
});
