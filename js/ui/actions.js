// js/ui/actions.js —— 玩家操作分发：只把 UI 意图转成 domain 调用
// 由 app.js 注入生命周期回调；本模块不持有全局状态。
OPC.define('ui.actions',
['core.util', 'core.format', 'data.balance', 'data.catalog',
  'domain.economy', 'domain.team', 'domain.projects', 'domain.launch', 'domain.finance',
  'ui.dom', 'ui.toast', 'ui.modal', 'ui.actions-p2'],
function (U, F, B, D, Econ, Team, Projects, Launch, Finance, DOM, Toast, Modal, P2Actions) {
  'use strict';
  /**
   * @param {object} host 生命周期与领域调用回调
   * @returns {(name:string, el:Element|null) => void}
   */
  function createActions(host) {
    let game = host.getGame();
  /** 读取谈判快照并打开弹窗；无谈判则静默 */
  function showNegotiationModal() {
    if (!game || !OPC.has('domain.negotiation')) return;
    const api = OPC.require('domain.negotiation');
    const view = api && typeof api.pendingView === 'function' ? api.pendingView(game.s) : null;
    if (!view) return;
    const offer = (game.s.offers || []).find(item => item.id === view.offerId);
    const name = offer ? ((offer.client && offer.client.name) || offer.name || '客户') : '客户';
    Modal.showNegotiation(view, name);
  }
  function act(name, el) {
    game = host.getGame();
    if (!game && !['start', 'load', 'restart', 'collection', 'collection-close', 'close'].includes(name)) return;
    const id = el && el.dataset ? el.dataset.id : null;
    const value = el && el.dataset ? el.dataset.v : null;
    if (P2Actions.handle(name, el, {
      getGame: () => game,
      domainCall: host.domainCall,
      OPC, Finance, Launch, Team, DOM, F, Toast, Modal,
    })) {
      host.save();
      host.refresh();
      if (game && game.s.over) Modal.showPopups(game.s, host.milestoneTitle);
      else if (game && game.s.pending) Modal.showPending(game.ctx.events.pendingView(game.s));
      return;
    }
    if (game && game.s.over && !['restart', 'close', 'start', 'load', 'fullscreen', 'collection', 'collection-close'].includes(name)) return;
    switch (name) {
      case 'collection': return host.showCollection();
      case 'collection-close':
        Modal.close();
        if (!game) Modal.showStart(null);
        else if (game.s.over) Modal.showPopups(game.s, host.milestoneTitle);
        return;
      case 'legacy-buy':
        if (!host.purchaseLegacy(id)) Toast.push('传承未购买：仅第 0 天可选择一次，且需要足够遗产点。', 'warn');
        break;
      case 'start':
        host.makeGame(id, null);
        game = host.getGame();
        Modal.close();
        host.save();
        host.refresh();
        Modal.showPopups(game.s, host.milestoneTitle);
        return;

      case 'load': {
        const saved = host.loadSaved();
        if (!saved) return Modal.showStart(null);
        host.makeGame(saved.dir, saved);
        game = host.getGame();
        Modal.close();
        host.save();
        host.refresh();
        if (game && game.s.over) Modal.showPopups(game.s, host.milestoneTitle);
        else if (game && game.s.pending) {
          const view = game.ctx.events.pendingView(game.s);
          if (view) Modal.showPending(view);
        }
        return;
      }

      case 'restart':
        if (game && game.s) host.recordMeta(game.s);
        localStorage.removeItem(host.saveKey);
        host.setGame(null);
        game = null;
        host.setLastRun(null);
        host.refresh();
        Modal.showStart(null);
        return;

      case 'close':
        Modal.close();
        if (game && game.s.pending) {
          const view = game.ctx.events.pendingView(game.s);
          if (view) Modal.showPending(view);
        }
        return;

      case 'choose':
        game.ctx.events.choose(game.ctx, Number(el.dataset.i));
        Modal.close();
        host.save();
        host.refresh();
        Modal.showPopups(game.s, host.milestoneTitle);
        return;

      case 'mode':
        Team.configure(game.ctx, 'mode', value);
        break;
      case 'action':
        Team.configure(game.ctx, 'action', value);
        break;
      case 'buy':
        Econ.buyUpgrade(game.ctx, id);
        break;
      case 'accept': {
        const quoteIndex = el && el.dataset && el.dataset.q != null && el.dataset.q !== ''
          ? Number(el.dataset.q)
          : undefined;
        const accepted = Projects.accept(game.ctx, Number(id), quoteIndex);
        if (!accepted) Toast.push('这单没接成，订单还在板上，可以换一档报价。', 'warn');
        break;
      }
      case 'negotiate-start': {
        if (OPC.has('domain.negotiation')) {
          const active = OPC.require('domain.negotiation').pendingView(game.s);
          if (active) {
            if (active.done) {
              host.domainCall('domain.negotiation', 'skip');
            } else {
              showNegotiationModal();
              break;
            }
          }
        }
        if (!host.domainCall('domain.negotiation', 'start', Number(id))) {
          Toast.push('谈判没开成：订单不存在或已经谈过。', 'warn');
        } else {
          showNegotiationModal();
        }
        break;
      }
      case 'negotiate-play': {
        const cardId = el && el.dataset ? el.dataset.card : '';
        if (!host.domainCall('domain.negotiation', 'play', cardId)) {
          Toast.push('这张牌打不出去，谈判状态可能已变化。', 'warn');
        } else {
          showNegotiationModal();
        }
        break;
      }
      case 'negotiate-skip':
        if (!host.domainCall('domain.negotiation', 'skip')) {
          Toast.push('没有正在进行的谈判。', 'warn');
        } else {
          Modal.close();
        }
        break;
      case 'negotiate-finish':
        if (game.s.negotiation) host.domainCall('domain.negotiation', 'skip');
        Modal.close();
        break;
      case 'chain-choose': {
        const index = Number(el && el.dataset ? el.dataset.index : -1);
        if (!game.ctx.chains || !game.ctx.chains.choose(game.ctx, index)) {
          Toast.push('事件链状态已变化，请稍后再试。', 'warn');
        }
        break;
      }
      case 'chain-skip':
        if (!game.ctx.chains || !game.ctx.chains.skip(game.ctx)) {
          Toast.push('这条事件链已经结束。', 'warn');
        }
        break;
      case 'product-start':
        if (!host.domainCall('domain.products', 'start', el.dataset.track)) {
          Toast.push('产品没开起来：现金不足或已有产品，看看日志。', 'warn');
        }
        break;
      case 'product-feature':
        if (!host.domainCall('domain.products', 'addFeature', id)) {
          Toast.push('功能没装上：现金不足或功能槽已满。', 'warn');
        }
        break;
      case 'product-launch':
        if (!host.domainCall('domain.products', 'launch')) {
          Toast.push('还差功能才能发布。', 'warn');
        }
        break;
      case 'product-launch-event': {
        const usersBefore = game.s.product && Number.isFinite(game.s.product.users) ? game.s.product.users : 0;
        const repBefore = Number.isFinite(game.s.rep) ? game.s.rep : 0;
        if (!host.domainCall('domain.launch', 'launch')) {
          Toast.push('发布会没开成：产品还没上线，或已经开过了。', 'warn');
          break;
        }
        const after = Launch && typeof Launch.view === 'function' ? Launch.view(game.s) : null;
        const score = after && Number.isFinite(after.launchScore) ? after.launchScore : 0;
        const usersGain = (game.s.product ? game.s.product.users : 0) - usersBefore;
        const repGain = game.s.rep - repBefore;
        const stars = '★'.repeat(score) + '☆'.repeat(Math.max(0, 5 - score));
        Modal.open(`
          <h2>发布会 · ${DOM.esc(after ? after.grade || '结束' : '结束')}</h2>
          <div class="launch-stars" aria-label="发布会评分 ${score} / 5">${stars}</div>
          <p>${DOM.esc(after && after.desc ? after.desc : '发布会结束了。')}</p>
          <div class="ending-stats">
            <span class="k">评分</span><span>${score}/5</span>
            <span class="k">新增用户</span><span class="good">+${F.int(usersGain)}</span>
            <span class="k">声誉变化</span><span class="good">+${F.int(repGain)}</span>
          </div>
          ${after && after.line ? `<p class="dim">${DOM.esc(after.line)}</p>` : ''}
          <div class="modal-actions"><button type="button" data-act="close">继续经营</button></div>`);
        break;
      }
      case 'product-grow':
        if (!host.domainCall('domain.products', 'grow', el.dataset.channel)) {
          Toast.push('投放未完成：请检查现金、发布状态或今天是否已投放。', 'warn');
        }
        break;
      case 'product-sell':
        if (!host.domainCall('domain.products', 'sell')) {
          Toast.push('产品未出售：需先发布并运营满规定天数。', 'warn');
        }
        break;
      case 'crisis-resolve': {
        const index = Number(el && el.dataset ? el.dataset.index : -1);
        if (!host.domainCall('domain.crisis', 'resolve', index)) {
          Toast.push('危机状态已变化，请刷新后再试。', 'warn');
        }
        break;
      }
      case 'skill-learn': {
        const skillId = el && el.dataset ? el.dataset.skill : '';
        if (!host.domainCall('domain.skills', 'learn', Number(id), skillId)) {
          Toast.push('技能没学成：技能点不足、等级不够或已经学过。', 'warn');
        }
        break;
      }
      case 'skill-respec':
        if (!host.domainCall('domain.skills', 'respec', Number(id))) {
          Toast.push('洗点失败：现金不足或 agent 不在岗。', 'warn');
        }
        break;
      case 'deploy': {
        const roleEl = DOM.$('deployRole'), modelEl = DOM.$('deployModel');
        const formApi = OPC.has('ui.deploy-form') ? OPC.require('ui.deploy-form') : null;
        const pick = formApi && typeof formApi.pick === 'function'
          ? formApi.pick(game.s, { role: roleEl ? roleEl.value : '', model: modelEl ? modelEl.value : '' })
          : { role: roleEl ? roleEl.value : 'coder', model: modelEl ? modelEl.value : null };
        host.domainCall('domain.deploy', 'deploy', pick.role, pick.model);
        break;
      }
      case 'archive': {
        const agent = game.s.agents.find(item => item.id === Number(id));
        if (!agent) return;
        if (!OPC.has('domain.deploy')) {
          Toast.push('归档模块尚未接入（P0-A4）', 'warn');
          return;
        }
        const project = game.s.projects.find(item => item.id === agent.busy);
        Modal.open(`
          <h2>归档「${DOM.esc(agent.name)}」？</h2>
          <p>${project
            ? `它正在做「${DOM.esc(project.name)}」，归档后工位空出来，项目需要重新指派。`
            : '它现在空闲，归档不会影响正在进行的项目。'}</p>
          <p class="dim">归档会保留人格、等级与记忆，移入归档区，不占工位；恢复需要冷却。它不是离职，也不会被删除。</p>
          <div class="modal-actions">
            <button type="button" class="primary" data-act="archive-confirm" data-id="${agent.id}">确认归档</button>
            <button type="button" class="ghost" data-act="close">取消</button>
          </div>`);
        return;
      }
      case 'archive-confirm':
        Modal.close();
        if (!host.domainCall('domain.deploy', 'archive', Number(id))) Toast.push('归档没完成：现金不足或实例已不在岗。', 'warn');
        break;
      case 'restore':
        if (!host.domainCall('domain.deploy', 'restore', Number(id))) Toast.push('恢复没完成：还在冷却中或工位已满。', 'warn');
        break;
      case 'office-upgrade':
        host.domainCall('domain.office', 'upgrade');
        break;
      case 'speed':
        host.setSpeed(Number(value) || 0);
        break;
      case 'next':
        return host.advance(false);
      case 'fast':
        return host.advance(true);
      case 'fullscreen':
        return host.toggleFullscreen();
      default:
        return;
    }
    host.save();
    host.refresh();
    if (game && game.s.over) Modal.showPopups(game.s, host.milestoneTitle);
  }

    return act;
  }
  return { createActions };
});
