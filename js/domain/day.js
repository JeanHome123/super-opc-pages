// js/domain/day.js —— 每日推进的编排者
// 一天 = 一串固定顺序的阶段。新增玩法 = 在 PHASES 里插一行，并在 docs/ARCHITECTURE.md 记一笔。
OPC.define('domain.day',
['core.util', 'data.balance', 'data.catalog', 'data.copy',
  'domain.state', 'domain.economy', 'domain.persona', 'domain.team', 'domain.projects',
  'domain.chapters', 'domain.trends', 'domain.products', 'domain.rivals', 'domain.crisis', 'domain.endings', 'domain.negotiation', 'domain.fans', 'domain.market'],
function (U, B, D, C, State, Econ, Persona, Team, Projects, Chapters, Trends, Products, Rivals, Crisis, Endings, Negotiation, Fans, Market) {
  'use strict';

  /** 一条日常碎片（没事件的日子里让世界有点动静） */
  function flavor(ctx) {
    const s = ctx.s;
    const names = s.agents.map(agent => agent.name);
    const recent = new Set(s.log.map(entry => entry.text));
    const newest = s.models.reduce((best, model) => (model.release > best.release ? model : best), s.models[0]);

    for (let attempt = 0; attempt < 5; attempt++) {
      const template = U.pick(C.flavor, ctx.rand);
      if (!template) return;
      if (!names.length && template.includes('{agent')) continue;

      const first = U.pick(names, ctx.rand) || '';
      const second = names.find(name => name !== first) || first;
      const text = template
        .split('{agent2}').join(second)
        .split('{agent}').join(first)
        .split('{n}').join(String(names.length))
        .split('{day}').join(String(s.day))
        .split('{newest}').join(newest ? newest.name : '');

      if (!recent.has(text)) {
        ctx.log(text);
        return;
      }
    }
  }

  /**
   * 事件阶段：先掷是否触发事件，没触发就撒一点生活碎片。
   * @param {object} ctx
   */
  function randomEvents(ctx) {
    const s = ctx.s;
    if (s.day > B.eventMinDay && ctx.rand() < B.eventChance) {
      if (ctx.events) ctx.events.maybeFire(ctx);
      return;
    }
    if (ctx.rand() < B.flavorChance) flavor(ctx);
  }

  /**
   * 一天的所有阶段（顺序不可随意调整：后面的阶段依赖前面的结果）。
   * @type {Array<[string, (ctx: object) => void]>}
   */
  const PHASES = [
    ['ceoAction', Team.ceoAction],
    ['models', Market.advance],
    ['trends', Trends.tick],
    ['offers', Projects.refreshOffers],
    ['rivals', Rivals.tick],
    ['autoAccept', Projects.autoAcceptIfEnabled],
    ['work', Team.workDay],
    ['social', Persona.dailySocial],
    ['throttle', ctx => { if (ctx.s.throttle > 0) ctx.s.throttle -= 1; }],
    ['settle', Projects.settle],
    ['products', Products.tick],
    ['fans', Fans.tick],
    ['random', randomEvents],
    ['chains', ctx => { if (ctx.chains) ctx.chains.advance(ctx); }],
    ['crisis', ctx => { Crisis.tick(ctx); Crisis.maybeStart(ctx); }],
    ['reputation', ctx => { ctx.s.rep = U.clamp(ctx.s.rep, 0, B.reputationMax); }],
    ['monthly', Econ.settleMonth],
    ['finance', ctx => OPC.require('domain.finance').tick(ctx)],
    ['milestones', State.checkMilestones],
    ['chapters', Chapters.advance],
    ['history', ctx => {
      const s = ctx.s;
      s.hist.push(s.cash);
      if (s.hist.length > B.historyMax) s.hist.shift();
    }],
    ['solvency', Econ.checkSolvency],
    ['endings', Endings.check],
  ];

  /**
   * 推进一天。
   * @param {object} ctx
   * @returns {boolean} 是否真的推进了（有待选事件或已结束时返回 false）
   */
  function tick(ctx) {
    const s = ctx.s;
    if (s.over || s.pending) return false;

    s.day += 1;
    s.report = { day: s.day, lines: [], work: [], income: 0, token: 0 };

    for (const [, phase] of PHASES) phase(ctx);
    return true;
  }

  /**
   * 半自动推进：一直过天，直到有值得玩家看一眼的事（最多 max 天）。
   * @param {object} ctx
   * @param {number} [max]
   * @returns {{days: number, reason: string}}
   */
  function runUntil(ctx, max = 30) {
    const s = ctx.s;

    for (let day = 1; day <= max; day++) {
      const cashBefore = s.cash;
      const busyBefore = new Set(s.agents.filter(a => a.busy).map(a => a.id));

      if (!tick(ctx)) {
        return { days: day - 1, reason: s.pending ? '有事件需要你决定' : '游戏已结束' };
      }

      const headline = s.report.lines.find(text => /^(✅|❌|📰|🎬)/.test(text));
      const idleNow = s.agents.some(a => busyBefore.has(a.id) && !a.busy);

      const reason =
        (s.over && '游戏结束') ||
        (s.pending && '有事件需要你决定') ||
        (s.popups.length && (s.popups.every(t => t.startsWith('📖')) ? '新的创业日记' : '有新消息')) ||
        headline ||
        (!s.auto.accept && s.offers.length && idleNow && '有 agent 闲下来了，订单板上有单') ||
        (s.cash < 0 && cashBefore >= 0 && '进入透支！') ||
        (s.cash < B.cashWarning && cashBefore >= B.cashWarning && `现金跌破 ${ctx.yuan(B.cashWarning)}`) ||
        null;

      if (reason) return { days: day, reason };
    }

    return { days: max, reason: `已连续推进 ${max} 天` };
  }

  /**
   * 开局：第一台 agent、三张订单、两段开场独白。
   * @param {object} ctx
   */
  function startGame(ctx) {
    const s = ctx.s;
    const dir = U.byId(D.directions, s.dir) || D.directions[0];
    const copy = C.directions[s.dir] || { name: dir.id, intro: '' };

    Team.makeAgent(ctx, dir.role, 'cl35');
    if (dir.productTrack) Products.start(ctx, dir.productTrack);
    for (let i = 0; i < 3; i++) s.offers.push(Projects.makeOffer(ctx));

    ctx.log(`📖 ${copy.intro}`);
    ctx.log(`📖「${copy.name}」成立了。你的使命：证明一个人加一群 agent，也能做成一家真正的公司。`, true);
    s.report = null;
  }

  return { PHASES, tick, runUntil, startGame, flavor };
});
