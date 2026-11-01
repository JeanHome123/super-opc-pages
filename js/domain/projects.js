// js/domain/projects.js —— 订单板与项目生命周期：生成 / 接单 / 自动接单 / 交付 / 逾期
OPC.define('domain.projects', ['core.util', 'data.balance', 'data.catalog', 'data.copy', 'domain.economy'],
function (U, B, D, C, Econ) {
  'use strict';

  /** 甲方模块可能分阶段合入：惰性解析，未挂载时订单保持 1.x 形状 */
  const clientsApi = () => (OPC.has('domain.clients') ? OPC.require('domain.clients') : null);

  /** 趋势模块可能分阶段挂载：缺失时权重不变 */
  const trendsApi = () => (OPC.has('domain.trends') ? OPC.require('domain.trends') : null);

  /** 按公司方向的订单类型权重抽一个项目类型（趋势可放大指定类型） */
  function pickType(s, rand) {
    const dir = U.byId(D.directions, s.dir) || D.directions[0];
    const Trend = trendsApi();
    const weights = Object.entries(dir.mix).map(([candidate, weight]) => {
      const mul = Trend ? Trend.orderTypeMul(s, candidate) : 1;
      return [candidate, weight * mul];
    });
    const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = rand() * total;
    let type = weights[0][0];
    for (const [candidate, weight] of weights) {
      roll -= weight;
      if (roll < 0) { type = candidate; break; }
    }
    return type;
  }

  /**
   * 生成一个订单。
   * @param {object} ctx
   * @param {{bonus?:number, forceType?:string|null}} [opts]
   * @returns {object}
   */
  function makeOffer(ctx, opts = {}) {
    const s = ctx.s;
    const bonus = opts.bonus || 1;
    const type = opts.forceType || pickType(s, ctx.rand);
    const typeDef = D.types[type] || D.types.code;
    const namePool = (C.types[type] && C.types[type].names) || ['未命名项目'];

    const work = Math.round(typeDef.min + ctx.rand() * (typeDef.max - typeDef.min));
    const minQ = U.round2(B.offerMinQBase + ctx.rand() * B.offerMinQSpread + work / 1000);
    const [jitterLow, jitterHigh] = B.offerRewardJitter;
    const jitter = jitterLow + ctx.rand() * (jitterHigh - jitterLow);

    const Trend = trendsApi();
    const trendReward = Trend ? Trend.rewardMul(s) : 1;
    const reward = Math.round(
      work * B.rewardPerWork * (typeDef.pay || 1) * Math.pow(minQ / 0.7, 2)
      * (1 + s.rep / 200) * jitter * bonus * trendReward / 100
    ) * 100;

    const offer = {
      id: s.nextId++,
      type,
      name: U.pick(namePool, ctx.rand),
      work,
      minQ,
      reward,
      days: Math.ceil(work / B.offerDaysPerWork) + B.offerDaysBase,
      expires: s.day + B.offerExpireDays,
    };
    const Clients = clientsApi();
    if (Clients) Clients.decorateOffer(ctx, offer);
    return offer;
  }

  /**
   * 接单：从订单板移入进行中。
   * quoteIndex 省略时使用标准档（兼容旧 UI 的 accept(ctx, id)）。
   * @param {object} ctx
   * @param {number} offerId
   * @param {number} [quoteIndex] 0 低价 / 1 标准 / 2 高价
   * @returns {boolean}
   */
  function accept(ctx, offerId, quoteIndex) {
    const s = ctx.s;
    const at = s.offers.findIndex(o => o.id === offerId);
    if (at < 0) return false;

    if (s.negotiation && s.negotiation.offerId === offerId && !s.negotiation.result) {
      ctx.log('先完成或跳过当前谈判，再确认报价。');
      return false;
    }
    const offer = s.offers[at];
    const Clients = clientsApi();
    const quote = Clients ? Clients.quoteOf(offer, quoteIndex) : null;
    const hasQuotes = Array.isArray(offer.quotes) && offer.quotes.length > 0;
    if (hasQuotes && !quote) {
      ctx.log('这个报价档位不存在，换一档再报。');
      return false;
    }

    // 三档接受率：低价 1.3 / 标准 1 都必接；高价 0.8 有 20% 概率被拒。
    // 只有 acceptMul < 1 时才消耗随机数，避免标准档改变既有经济随机序列。
    if (quote && typeof quote.acceptMul === 'number') {
      const chance = Clients ? Clients.acceptChance(s, offer, quoteIndex) : U.clamp(quote.acceptMul, 0, 1);
      if (chance < 1 && ctx.rand() >= chance) {
        ctx.log(`客户拒绝了「${quote.label || '这档'}报价」，订单还在板上，可以换一档再试。`);
        return false;
      }
    }

    s.offers.splice(at, 1);
    const project = {
      ...offer,
      reward: quote ? Math.round(offer.reward * quote.payMul) : offer.reward,
      deadline: s.day + offer.days,
      done: 0,
      qsum: 0,
      crew: [],
    };
    if (quote) {
      project.quote = quote;
      project.quoteIndex = offer.quotes.indexOf(quote);
    }
    s.projects.push(project);
    return true;
  }

  /** 订单板刷新：过期清理 + 按声誉/升级/方向权重来新单（tick 阶段） */
  function refreshOffers(ctx) {
    const s = ctx.s;
    s.offers = s.offers.filter(offer => offer.expires > s.day);
    if (s.negotiation && !s.offers.some(o => o.id === s.negotiation.offerId)) {
      OPC.require('domain.negotiation').skip(ctx);
    }
    if (s.offers.length >= B.offerBoardMax) return;

    const dir = U.byId(D.directions, s.dir) || D.directions[0];
    const personaOffers = OPC.require('domain.modifiers').team(s, 'offers');
    const fanBonus = Math.min(0.15, Math.max(0, Number.isFinite(s.fans) ? s.fans : 0) / 200000);
    const chance = (B.offerBaseChance + s.rep / B.offerRepFactor + fanBonus + personaOffers) * Econ.boosts(s).lead * (dir.lead || 1);
    if (ctx.rand() < chance) s.offers.push(makeOffer(ctx));
  }

  /** 自动接单：只接「质量够得上、排期做得完」的，按单位报酬从高到低（tick 阶段） */
  function autoAcceptIfEnabled(ctx) {
    const s = ctx.s;
    if (!s.auto.accept || !s.offers.length) return;

    const quality = Econ.teamQuality(s);
    const sorted = [...s.offers].sort((a, b) => b.reward / b.work - a.reward / a.work);

    for (const offer of sorted) {
      if (quality < offer.minQ) continue;
      const backlog = U.sum(s.projects, p => Math.max(0, p.work - p.done)) + offer.work;
      const rate = Econ.teamRate(s, offer.type);
      if (rate <= 0) continue;
      if (backlog / rate > offer.days * B.autoAcceptSlack) continue;
      if (accept(ctx, offer.id)) ctx.log(`📥 自动接单「${offer.name}」${ctx.yuan(offer.reward)}`);
    }
  }

  /** 日末先验收已完成项目，再取消仍未完成的逾期项目；工期需求另行验收。 */
  function settle(ctx) {
    const s = ctx.s;

    for (const project of [...s.projects]) {
      if (project.done >= project.work) {
        const quality = project.done > 0 ? project.qsum / project.done : 0;
        const Contracts = OPC.require('domain.contracts');
        if (Contracts.review(ctx, project, quality)) continue;
        Contracts.settle(ctx, project, quality);
        const creed = OPC.require('domain.chapters').effects(s);
        const bonusCount = Contracts.evaluate(s, project, quality).filter(n => n.met && n.kind === 'bonus').length;
        const pay = Math.round(Econ.payout(project, quality) * (1 + (creed.revenue || 0))
          * (1 + (creed.profit || 0)) * (1 + (creed.commercialization || 0)) * (1 + bonusCount * B.contracts.bonusRate)
          * ((s.finance && s.finance.history || []).some(r => r.investorId === 'investor.wang') ? 1 - B.financeRules.resourceFee : 1));
        const qualified = quality >= project.minQ;

        s.cash += pay;
        s.month.income += pay;
        s.total.income += pay;
        if (qualified) s.rp += B.rpPerDelivery * (1 + OPC.require('domain.modifiers').team(s, 'rp', project.crew) + (creed.rp || 0));
        if (s.report) s.report.income += pay;
        s.delivered++;
        for (const id of project.crew) {
          const agent = s.agents.find(a => a.id === id);
          OPC.require('domain.persona').remember(ctx, agent, `交付「${project.name}」，质量 ${F_pct(quality)}。`, 'delivery');
        }
        s.rep = U.clamp(s.rep + (qualified ? B.deliveryRepGain : -B.deliveryRepLoss), 0, B.reputationMax);
        if (project.type === 'service') s.mrr += Math.round(project.reward * B.serviceMrrRate);

        ctx.log(`✅ 交付「${project.name}」质量 ${F_pct(quality)}（要求 ${F_pct(project.minQ)}），收入 ${ctx.yuan(pay)}`);
        ctx.emit('delivery', { project, pay, quality });
        removeProject(s, project.id);
      } else if (s.day > project.deadline) {
        s.rep = U.clamp(s.rep - B.overdueRepLoss, 0, B.reputationMax);
        s.failed++;
        OPC.require('domain.contracts').settle(ctx, project, 0, true);
        ctx.log(`❌「${project.name}」逾期，客户取消合同，声誉 -${B.overdueRepLoss}`);
        ctx.emit('overdue', { project });
        removeProject(s, project.id);
      }
    }
  }

  function removeProject(s, projectId) {
    const at = s.projects.findIndex(p => p.id === projectId);
    if (at >= 0) s.projects.splice(at, 1);
  }

  /** 质量百分比（本地小工具，避免为了一个格式引入额外依赖） */
  const F_pct = value => `${Math.round(value * 100)}%`;

  return { makeOffer, accept, refreshOffers, autoAcceptIfEnabled, settle };
});
