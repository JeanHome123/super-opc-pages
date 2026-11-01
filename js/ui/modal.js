// js/ui/modal.js —— 弹窗：开局 / 抉择 / 创业日记 / 结局
OPC.define('ui.modal', ['ui.dom', 'core.format', 'data.balance', 'data.catalog', 'data.copy', 'data.endings', 'domain.endings'],
function (DOM, F, B, D, C, DE, Endings) {
  'use strict';

  const root = () => DOM.$('modal');
  const body = () => DOM.$('modalBody');
  const META_KEY = 'opc.meta';
  let previousFocus = null;
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !isOpen()) return;
    const controls = [...body().querySelectorAll('button:not(:disabled), select, input, [href]')];
    if (!controls.length) { event.preventDefault(); return body().focus(); }
    const first = controls[0], last = controls[controls.length - 1];
    if (document.activeElement === body()) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  /** 读跨局 meta：坏值 / 没有存档都按 0 / 空数组处理 */
  function readMeta() {
    try {
      const raw = JSON.parse(localStorage.getItem(META_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return { legacy: 0, seen: [] };
      return {
        legacy: Number.isFinite(raw.legacy) ? raw.legacy : 0,
        seen: Array.isArray(raw.seen) ? raw.seen.filter(id => typeof id === 'string') : [],
      };
    } catch (error) {
      return { legacy: 0, seen: [] };
    }
  }

  /** 优先读 domain.endings 的快照；数据缺失时退回 s.ending 原始字段 */
  function endingOf(s) {
    const view = Endings && typeof Endings.view === 'function' ? Endings.view(s) : null;
    if (view) return view;
    if (!s || !s.ending || typeof s.ending !== 'object') return null;
    return {
      id: s.ending.id || '',
      name: s.ending.name || s.ending.id || '结局',
      desc: s.ending.desc || '',
      yearbook: s.ending.yearbook || '',
      day: Number.isFinite(s.ending.day) ? s.ending.day : s.day,
      legacy: Number.isFinite(s.legacy) ? s.legacy : 0,
    };
  }

  function endingFooter(s, ending, milestoneTitle) {
    const name = ending ? ending.name : ({ win: '经营目标达成', lose: '破产', sold: '公司被收购', hired: '去大厂打工' }[s.over] || '结束');
    const day = ending && Number.isFinite(ending.day) ? ending.day : s.day;
    const legacy = ending && Number.isFinite(ending.legacy) ? ending.legacy : (Number.isFinite(s.legacy) ? s.legacy : 0);
    const productUsers = s.product && Number.isFinite(s.product.users) ? s.product.users : 0;
    const compliance = Number.isFinite(s.compliance) ? s.compliance : 0;
    const journey = (Array.isArray(s.milestones) ? s.milestones : [])
      .map(item => `D${item.day} ${milestoneTitle(item.id)}`).join(' → ');
    const desc = ending && ending.desc ? `<p class="ending-desc">${DOM.esc(ending.desc)}</p>` : '';
    const yearbook = ending && ending.yearbook ? `<p class="yearbook">${DOM.esc(ending.yearbook)}</p>` : '';

    return `${desc}
      <h3>公司年鉴</h3>
      <div class="item ending-card">
        <div class="item-head">
          <span class="tag ending-tag">结局</span><b>${DOM.esc(name)}</b>
          <span class="spacer"></span><span class="ending-day">D${day}</span>
        </div>
        ${yearbook}
        <div class="ending-stats">
          <span class="k">遗产点</span><span class="gold">${F.int(legacy)}</span>
          <span class="k">最终现金</span><span>${F.money(s.cash)}</span>
          <span class="k">交付 / 逾期</span><span>${s.delivered} 单 / ${s.failed} 单</span>
          <span class="k">产品用户</span><span>${F.int(productUsers)} 人</span>
          <span class="k">合规分</span><span>${F.int(compliance)}/100</span>
        </div>
      </div>
      <h3>你的创业历程</h3>
      <p class="timeline">D0 辞职创业 → ${journey || '（无）'} → D${day} ${DOM.esc(name)}</p>
      <button type="button" data-act="collection">查看档案</button>
      <button type="button" data-act="restart">再来一局</button>`;
  }

  function isOpen() {
    const el = root();
    return !!el && el.classList.contains('open');
  }

  /** @param {string} html */
  function open(html) {
    const el = root();
    const box = body();
    if (!el || !box) return;
    if (!isOpen()) previousFocus = document.activeElement;
    const app = DOM.$('app');
    if (app) app.inert = true;
    box.innerHTML = html;
    const title = box.querySelector('h2');
    if (title) { title.id = 'modalTitle'; box.setAttribute('aria-labelledby', 'modalTitle'); }
    box.tabIndex = -1;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    box.scrollTop = 0;
    box.focus({ preventScroll: true });
  }

  function close() {
    const el = root();
    const box = body();
    if (!el || !box) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    box.innerHTML = '';
    const app = DOM.$('app');
    if (app) app.inert = false;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  }

  /**
   * 开局界面：继续上局（若有）+ 目录中全部公司方向。
   * @param {{day:number, cash:number}|null} saved
   */
  function showStart(saved) {
    const directions = D.directions.map(dir => {
      const copy = C.directions[dir.id] || { name: dir.id, desc: '' };
      return `<button class="card" type="button" data-act="start" data-id="${DOM.esc(dir.id)}">
        <b>${DOM.esc(copy.name)}</b>
        <span class="dim">　启动资金 ${F.money(dir.cash)}</span><br>
        <span class="dim">${DOM.esc(copy.desc)}</span>
      </button>`;
    }).join('');
    const meta = readMeta();
    const endingCount = DE && Array.isArray(DE.endings) ? DE.endings.length : 8;

    open(`
      <h2>${DOM.esc(C.ui.title)}</h2>
      <p>${C.ui.intro}</p>
      <p class="dim">${DOM.esc(C.ui.tagline)}　<b class="gold">${DOM.esc(C.ui.goalHint)}</b></p>
      <p class="dim meta-line">累计遗产点 <b class="gold">${F.int(meta.legacy)}</b> · 已见结局 <b>${meta.seen.length}</b>/${endingCount}</p>
      ${saved && saved.day > 0 ? `<button class="card" type="button" data-act="load">
        <b>▶ 继续上局</b><span class="dim">　第 ${saved.day} 天 · 现金 ${F.money(saved.cash)}</span></button>` : ''}
      <button type="button" data-act="collection">查看结局墙与图鉴</button>
      <p class="dim">选择公司方向 · 共 ${D.directions.length} 项（可滚动查看全部）：</p>
      <div class="start-directions">${directions}</div>
    `);
  }

  /**
   * 弹窗队列：创业日记 / 新消息 / 结局。
   * @param {object} s
   * @param {(id:string) => string} milestoneTitle
   */
  function showPopups(s, milestoneTitle) {
    const texts = OPC.require('domain.state').takePopups(s);
    const ending = endingOf(s);
    const currentEnding = ending && (ending.day === s.day || s.over) ? ending : null;
    if (!texts.length && !currentEnding) return false;

    const titles = { win: '🏆 胜利', lose: '💸 破产', sold: '🤝 收购结局', hired: '💼 打工人结局', ending: '🎬 结局' };
    const allDiary = texts.every(text => text.startsWith('📖'));
    const title = currentEnding ? `🎬 ${DOM.esc(currentEnding.name)}`
      : (titles[s.over] || (allDiary ? `📖 创业日记 · 第 ${s.day} 天` : '📢 新消息'));

    const footer = currentEnding || s.over
      ? endingFooter(s, currentEnding, milestoneTitle)
      : '<button type="button" data-act="close">继续经营</button>';

    open(`<h2>${title}</h2>${texts.map(text => `<p>${DOM.esc(text)}</p>`).join('')}${footer}`);
    return true;
  }

  /** 谈判牌效果标签：数值都是展示用，规则由 domain 负责 */
  function negotiationEffects(effects) {
    const labels = { priceMul: '报价', days: '工期', relation: '关系', patience: '耐心', budget: '预算', chance: '机会' };
    return Object.entries(effects || {}).map(([key, value]) => {
      if (typeof value !== 'number' || !isFinite(value)) return '';
      if (key === 'priceMul') return `<span class="tag neg-effect">报价 ×${value}</span>`;
      if (key === 'days') return `<span class="tag neg-effect">工期 ${value >= 0 ? '+' : ''}${value} 天</span>`;
      return `<span class="tag neg-effect">${labels[key] || key} ${value >= 0 ? '+' : ''}${value}</span>`;
    }).join('');
  }

  function negotiationBars(bars) {
    const rows = [['预算', 'budget'], ['耐心', 'patience'], ['底线', 'bottom'], ['成交机会', 'chance']];
    return rows.map(([label, key]) => {
      const value = Math.max(0, Math.min(100, Number(bars && bars[key]) || 0));
      const tone = value < 20 ? 'danger' : value < 40 ? 'warn' : '';
      return `<div class="neg-bar ${tone}"><span>${label}</span><div class="neg-bar-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value)}"><i style="width:${value}%"></i></div><b>${F.int(value)}</b></div>`;
    }).join('');
  }

  /**
   * 谈判小游戏：客户三栏 + 5 张手牌 + 结果。
   * @param {object} view domain.negotiation.pendingView
   * @param {string} [customerName]
   */
  function showNegotiation(view, customerName) {
    if (!view) return;
    const name = customerName || '客户';
    if (view.done && view.result) {
      const result = view.result;
      const resultBody = result.ok
        ? `<div class="item ending-card">
            <div class="item-head"><span class="tag" style="color:var(--service)">成交</span><b>谈判达成</b><span class="spacer"></span></div>
            <div class="ending-stats">
              <span class="k">成交报价</span><span>${F.money(result.reward || 0)}（×${result.priceMul}）</span>
              <span class="k">工期</span><span>${result.days >= 0 ? '+' : ''}${result.days} 天 / 共 ${result.daysTotal} 天</span>
              <span class="k">关系</span><span>${result.relation >= 0 ? '+' : ''}${result.relation}</span>
            </div>
          </div>
          <div class="modal-actions"><button type="button" data-act="negotiate-finish">完成</button></div>`
        : `<div class="item ending-card">
            <div class="item-head"><span class="tag" style="color:var(--danger)">失败</span><b>客户离席</b><span class="spacer"></span></div>
            <p class="dim">${DOM.esc(result.reason === 'patience' ? '客户的耐心耗尽了，这单没了。' : result.reason === 'chance' ? '成交机会归零，客户转身走了。' : '订单已经不在板上，谈判结束。')}</p>
            <div class="ending-stats"><span class="k">声誉</span><span class="bad">-${F.int(result.repLoss || 0)}</span></div>
          </div>
          <div class="modal-actions"><button type="button" data-act="negotiate-finish">完成</button></div>`;
      open(`<h2>谈判结果 · ${DOM.esc(name)}</h2>${resultBody}`);
      return;
    }

    const played = new Set(Array.isArray(view.played) ? view.played : []);
    const hand = (Array.isArray(view.hand) ? view.hand : []).filter(card => !played.has(card.id)).map(card => `
      <button type="button" class="neg-card" data-act="negotiate-play" data-card="${DOM.esc(card.id)}">
        <b>${DOM.esc(card.name || card.id)}</b>
        <div class="product-desc">${DOM.esc(card.desc || '')}</div>
        <div class="neg-effects">${negotiationEffects(card.effects)}</div>
      </button>`).join('');
    const left = Math.max(0, (view.totalRounds || 3) - (Array.isArray(view.played) ? view.played.length : 0));

    open(`<h2>谈判 · ${DOM.esc(name)} · 第 ${view.round || 1}/${view.totalRounds || 3} 轮</h2>
      <div class="neg-bars">${negotiationBars(view.bars)}</div>
      <div class="neg-hand">${hand || '<div class="empty">手里没有可打的牌。</div>'}</div>
      <div class="neg-actions">
        <button type="button" class="ghost" data-act="negotiate-skip">跳过谈判</button>
        <span class="muted">剩余 ${left} 张牌 · 打出 3 张后结算</span>
      </div>`);
  }

  /**
   * 抉择事件：只能选一个选项来关闭。
   * @param {{text:string, options:string[]}} view
   */
  function showPending(view) {
    if (!view) return;
    const options = view.options.map((label, index) =>
      `<button class="card" type="button" data-act="choose" data-i="${index}">${DOM.esc(label)}</button>`
    ).join('');
    open(`<h2>🤔 抉择时刻</h2><p>${DOM.esc(view.text)}</p>${options}`);
  }

  return { open, close, isOpen, showStart, showPopups, showPending, showNegotiation };
});
