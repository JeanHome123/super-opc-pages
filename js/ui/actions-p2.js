// js/ui/actions-p2.js —— P2 操作：粉丝 / 审计 / 产线 / 技术 / 融资
OPC.define('ui.actions-p2',
['ui.dom', 'core.format', 'ui.toast', 'ui.modal'],
function (DOM, F, Toast, Modal) {
  'use strict';

  /**
   * @param {string} name
   * @param {Element|null} el
   * @param {object} host
   * @returns {boolean} 是否已处理
   */
  function handle(name, el, host) {
    const id = el && el.dataset ? el.dataset.id : '';
    const game = host.getGame();
    const domainCall = host.domainCall;
    const OPC = host.OPC;
    const Finance = host.Finance;
    const Launch = host.Launch;
    const Team = host.Team;

    if (!game || game.s.over) return false;
    switch (name) {
      case 'acquisition':
        if (!domainCall('domain.endings', 'offerAcquisition')) Toast.push('当前还不满足收购洽谈条件。', 'warn');
        break;
      case 'fork':
        if (!domainCall('domain.deploy', 'fork', Number(id))) Toast.push('Fork 未完成：请检查现金和空工位。', 'warn');
        break;
      case 'agent-memory': {
        const agent = game.s.agents.find(a => a.id === Number(id));
        if (!agent) return false;
        const memory = agent.persona && agent.persona.memory || [];
        Modal.open(`<h2>${DOM.esc(agent.name)}的记忆</h2>${memory.map(m => `<p>D${m.day} · ${DOM.esc(m.text)}</p>`).join('') || '<p>还没有共同经历。</p>'}<button type="button" data-act="close">返回</button>`);
        break;
      }
      case 'inspect-needs':
        if (!domainCall('domain.contracts', 'inspect', Number(id))) Toast.push('访谈未完成：请检查现金、精力或需求状态。', 'warn');
        break;
      case 'creed-choose':
        if (!domainCall('domain.chapters', 'choose', id)) Toast.push('当前没有信条选择机会。', 'warn');
        break;
      case 'fans-post': {
        const channel = el && el.dataset ? el.dataset.channel : '';
        const typeEl = DOM.$('fansType');
        const type = typeEl ? typeEl.value : (el && el.dataset ? el.dataset.type : '');
        const before = Number.isFinite(game.s.fans) ? game.s.fans : 0;
        if (!host.domainCall('domain.fans', 'post', channel, type)) {
          Toast.push('发布失败：现金或精力不足。', 'warn');
        } else {
          Toast.push(`📣 发布成功，粉丝 +${F.int((game.s.fans || 0) - before)}`, 'good');
        }
        break;
      }
      case 'audit':
        if (!host.domainCall('domain.audit', 'audit', Number(id))) {
          Toast.push('审计没做成：需要一名在岗审计师，且现金和精力足够。', 'warn');
        }
        break;
      case 'audit-certify':
        if (!host.domainCall('domain.audit', 'certify')) {
          Toast.push('合规分未达门槛，或已经认证过了。', 'warn');
        }
        break;
      case 'pipeline-create': {
        const agents = game.s.agents || [];
        const orchestrator = agents.find(agent => agent.role === 'orchestrator');
        const others = agents.filter(agent => agent.role !== 'orchestrator').slice(0, 2);
        if (!orchestrator || others.length < 2) {
          Toast.push('需要 1 名编排师 + 2 名其他 agent。', 'warn');
          break;
        }
        const name = `产线 ${(game.s.pipelines || []).length + 1}`;
        const ids = [orchestrator.id].concat(others.map(agent => agent.id));
        if (!host.domainCall('domain.pipeline', 'create', name, ids)) {
          Toast.push('产线没建起来，检查成员与上限。', 'warn');
        }
        break;
      }
      case 'pipeline-archive':
        if (!host.domainCall('domain.pipeline', 'archive', Number(id))) {
          Toast.push('这条产线已经停用或不存在。', 'warn');
        }
        break;
      case 'tech-buy':
        if (!host.domainCall('domain.tech', 'buy', id)) {
          Toast.push('研究没做成：前置未完成，或现金 / 研发点不足。', 'warn');
        }
        break;
      case 'finance-raise': {
        const roundId = el.dataset.round;
        const investorId = el.dataset.investor;
        const view = Finance && typeof Finance.view === 'function' ? Finance.view(game.s) : null;
        const offer = view && view.offers.find(item => item.id === investorId && item.roundId === roundId);
        const round = view && view.rounds.find(item => item.id === roundId);
        if (!offer || !round) {
          Toast.push('这个融资报价已经失效，请刷新后再试。', 'warn');
          break;
        }
        const amount = Number.isFinite(offer.amount) ? offer.amount : round.amount;
        const equity = Number.isFinite(offer.equity) ? offer.equity : round.equity;
        Modal.open(`
          <h2>确认融资 · ${DOM.esc(round.name || round.id)}</h2>
          <p>投资人：<b>${DOM.esc(offer.name || offer.id)}</b></p>
          <div class="ending-stats">
            <span class="k">出让股权</span><span>${F.percent(equity || 0, 1)}</span>
            <span class="k">到账金额</span><span class="good">${F.money(amount || 0)}</span>
            <span class="k">投前估值</span><span>${F.money(offer.valuation || 0)}</span>
            <span class="k">估值倍率</span><span>×${Number.isFinite(offer.valuationMul) ? offer.valuationMul : 1}</span>
          </div>
          <p class="dim">${DOM.esc(offer.term || round.term || '')}</p>
          <p class="dim">签约后累计股权 ${F.percent((Number(view.equity) || 0) + (equity || 0), 1)}。</p>
          <div class="modal-actions">
            <button type="button" class="primary" data-act="finance-raise-confirm" data-round="${DOM.esc(roundId)}" data-investor="${DOM.esc(investorId)}">确认签约</button>
            <button type="button" class="ghost" data-act="close">再想想</button>
          </div>`);
        return;
      }
      case 'finance-raise-confirm':
        Modal.close();
        if (!host.domainCall('domain.finance', 'raise', el.dataset.round, el.dataset.investor)) {
          Toast.push('融资没签成：轮次、日期或投资人状态已变化。', 'warn');
        }
        break;

      default:
        return false;
    }
    return true;
  }

  return { handle };
});
