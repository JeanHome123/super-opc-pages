// js/domain/finance.js —— P2 融资：估值 / 轮次 / 投资人报价 / 签约
// 数据来自 data/finance.js；本模块只读数据，写 s.cash / s.rep / s.finance。
OPC.define('domain.finance', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  // TODO(balance): 骗子卷款比例 / 声誉损失可迁入 data/balance.js；当前由投资人数据覆盖。
  const RULES = {
    fraudLossRate: 0.8,
    fraudRepLoss: 20,
  };

  const finite = (value, fallback = 0) => (
    typeof value === 'number' && isFinite(value) ? value : fallback
  );
  const log = (ctx, text) => { if (ctx && typeof ctx.log === 'function') ctx.log(text); };
  const money = (ctx, value) => (ctx && typeof ctx.yuan === 'function' ? ctx.yuan(value) : String(value));

  /** 惰性读数据表：内容包未挂载时模块仍可加载 */
  function optionalData(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      return null;
    }
  }

  function financeData() {
    const data = optionalData('data.finance');
    if (!data || typeof data !== 'object') return { rounds: [], investors: [] };
    return {
      rounds: Array.isArray(data.rounds) ? data.rounds : [],
      investors: Array.isArray(data.investors) ? data.investors : [],
    };
  }

  const roundList = () => financeData().rounds.filter((round) => round && typeof round.id === 'string');
  const investorList = () => financeData().investors.filter((investor) => investor && typeof investor.id === 'string');

  /** 补齐融资状态：旧档 / 坏档不崩；历史只留对象 */
  function ensureState(s) {
    if (!s || typeof s !== 'object') return s;
    const src = s.finance && typeof s.finance === 'object' && !Array.isArray(s.finance) ? s.finance : {};
    const round = Number.isInteger(src.round) && src.round >= 0 ? src.round : 0;
    const equity = typeof src.equity === 'number' && isFinite(src.equity) ? U.clamp(src.equity, 0, 1) : 0;
    const raised = typeof src.raised === 'number' && isFinite(src.raised) && src.raised >= 0 ? src.raised : 0;
    const investor = typeof src.investor === 'string' && src.investor ? src.investor : null;
    const term = typeof src.term === 'string' && src.term ? src.term : null;
    const history = Array.isArray(src.history)
      ? src.history.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      : [];
    s.finance = { round, equity, raised, investor, term, history };
    return s;
  }

  /** 月收入：订阅 MRR + 产品 MRR（产品 MRR 独立存在 product 里） */
  function monthlyRevenue(s) {
    const mrr = Math.max(0, finite(s && s.mrr, 0));
    const productMrr = s && s.product && Number.isFinite(s.product.mrr) ? Math.max(0, s.product.mrr) : 0;
    return mrr + productMrr;
  }

  /**
   * 估值 = 月收入 × 24 + 产品用户 × 20 + 声誉 × 3000 + 现金。
   * 坏值按 0；结果不为负。
   * @param {object} s
   * @returns {number}
   */
  function valuation(s) {
    if (!s || typeof s !== 'object') return 0;
    const users = s.product && Number.isFinite(s.product.users) ? Math.max(0, s.product.users) : 0;
    const rep = Math.max(0, finite(s.rep, 0));
    const cash = finite(s.cash, 0);
    return Math.max(0, Math.round((monthlyRevenue(s) * 24 + users * 20 + rep * 3000 + cash)
      * (1 + (OPC.require('domain.chapters').effects(s).valuation || 0))));
  }

  /** 下一轮（按 s.finance.round + 1）；没有下一轮返回 null */
  function nextRoundOf(s) {
    ensureState(s);
    return roundList().find((round) => round.round === s.finance.round + 1) || null;
  }

  /**
   * 三轮状态：done / current / available / daysUntil / 本轮投资人 id。
   * @param {object} s
   * @returns {Array<object>}
   */
  function rounds(s) {
    if (!s || typeof s !== 'object') return [];
    ensureState(s);
    const day = Math.max(0, finite(s.day, 0));
    return roundList().map((round) => {
      const done = s.finance.round >= round.round;
      const current = s.finance.round === round.round - 1;
      const minDay = Math.max(0, Math.round(finite(round.minDay, 0)));
      return {
        ...round,
        done,
        current,
        available: current && day >= minDay,
        daysUntil: Math.max(0, Math.round(minDay - day)),
        investors: investorList().filter((investor) => investor.round === round.round).map((investor) => investor.id),
      };
    });
  }

  /**
   * 当前可谈的投资人报价（下一轮）；非下一轮返回空数组。
   * valuation 是基础估值 × 投资人 valuationMul，仅用于展示。
   * @param {object} s
   * @returns {Array<object>}
   */
  function offers(s) {
    if (!s || typeof s !== 'object') return [];
    ensureState(s);
    const round = nextRoundOf(s);
    if (!round) return [];
    const day = Math.max(0, finite(s.day, 0));
    const base = valuation(s);
    return investorList()
      .filter((investor) => investor.round === round.round)
      .map((investor) => ({
        ...investor,
        roundId: round.id,
        valuation: Math.round(base * Math.max(0, finite(investor.valuationMul, 1))),
        available: day >= Math.max(finite(round.minDay, 0), finite(investor.minDay, 0)),
      }));
  }

  /**
   * 签约融资：校验轮次 / 日期 / 重复 / 投资人，成功加现金、记股权、写历史。
   * 骗子投资人会在到账后卷款：扣现金、扣声誉，并写进历史。
   * @param {object} ctx
   * @param {string|number} roundId
   * @param {string} investorId
   * @returns {boolean}
   */
  function raise(ctx, roundId, investorId) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    if (s.chapter && s.chapter.creed === 'creed.independent') {
      log(ctx, '独立信条不接受外部融资，可在下次幕末更换信条。');
      return false;
    }
    ensureState(s);
    const round = roundList().find((item) => item.id === roundId || String(item.round) === String(roundId));
    if (!round) {
      log(ctx, '没有这个融资轮次。');
      return false;
    }
    const investor = investorList().find((item) => item.id === investorId);
    if (!investor) {
      log(ctx, '没有这个投资人。');
      return false;
    }
    if (investor.round !== round.round) {
      log(ctx, `「${investor.name}」不投这一轮。`);
      return false;
    }
    if (round.round !== s.finance.round + 1) {
      log(ctx, `当前只能谈第 ${s.finance.round + 1} 轮，这一轮还轮不到。`);
      return false;
    }
    const day = Math.max(0, finite(s.day, 0));
    const minDay = Math.max(finite(round.minDay, 0), finite(investor.minDay, 0));
    if (day < minDay) {
      log(ctx, `还要等 ${Math.round(minDay - day)} 天，投资人才会看这一轮。`);
      return false;
    }
    if (s.finance.history.some((item) => item.roundId === round.id)) {
      log(ctx, `「${round.name}」已经融过了。`);
      return false;
    }
    if (s.finance.history.some((item) => item.investorId === investor.id)) {
      log(ctx, `「${investor.name}」已经投过你了。`);
      return false;
    }

    const amount = Math.max(0, Math.round(finite(investor.amount, finite(round.amount, 0))));
    const equity = U.clamp(finite(investor.equity, finite(round.equity, 0)), 0, 1);
    const offerValuation = Math.round(valuation(s) * Math.max(0, finite(investor.valuationMul, 1)));
    s.cash = finite(s.cash, 0) + amount;
    s.finance.round = round.round;
    s.finance.equity = U.clamp(s.finance.equity + equity, 0, 1);
    s.finance.raised += amount;
    s.finance.investor = investor.id;
    s.finance.term = investor.term || round.term || null;

    const record = {
      roundId: round.id,
      round: round.round,
      investorId: investor.id,
      investorName: investor.name,
      amount,
      equity,
      day,
      valuation: offerValuation,
      fraud: false,
    };

    if (investor.style === 'fraud' || Number.isFinite(investor.fraudLossRate)) {
      const rate = U.clamp(finite(investor.fraudLossRate, RULES.fraudLossRate), 0, 1);
      const repLoss = Math.max(0, Math.round(finite(investor.fraudRepLoss, RULES.fraudRepLoss)));
      const loss = Math.round(amount * rate);
      s.cash -= loss;
      s.rep = U.clamp(finite(s.rep, 0) - repLoss, 0, B.reputationMax);
      record.fraud = true;
      record.loss = loss;
      record.repLoss = repLoss;
      log(ctx, `⚠️ 「${investor.name}」签完字就失联了：现金 -${money(ctx, loss)}，声誉 -${repLoss}。`);
    } else {
      log(ctx, `💰 ${round.name} 到账：${investor.name} 投资 ${money(ctx, amount)}，出让 ${Math.round(equity * 100)}%。`);
    }

    if (investor.style === 'aggressive') {
      record.covenant = { due: day + B.financeRules.covenantDays,
        target: Math.max(B.financeRules.covenantMinMrr, monthlyRevenue(s) * B.financeRules.covenantGrowth), status: 'pending' };
      log(ctx, `📑 对赌：第 ${record.covenant.due} 天前月收入达到 ${money(ctx, record.covenant.target)}，否则回购本轮投资。`);
    }
    if (investor.style === 'resourceful' && typeof ctx.offer === 'function') {
      for (let i = 0; i < B.financeRules.resourceOffers; i++) s.offers.push(ctx.offer({ bonus: B.financeRules.resourceBonus }));
      log(ctx, `🤝 投资人带来 ${B.financeRules.resourceOffers} 个客户；后续交付收入分成 ${B.financeRules.resourceFee * 100}%。`);
    }
    s.finance.history.push(record);
    if (typeof ctx.emit === 'function') {
      ctx.emit('finance', { round: round.id, investor: investor.id, amount, equity, fraud: record.fraud, loss: record.loss || 0 });
    }
    return true;
  }

  /**
   * 给 UI 的融资快照：估值 / 当前轮 / 股权 / 历史 / 三轮 / 当前报价。
   * @param {object} s
   * @returns {object}
   */
  function view(s) {
    if (!s || typeof s !== 'object') {
      return {
        round: 0, equity: 0, raised: 0, investor: null, term: null,
        valuation: 0, rounds: [], offers: [], history: [],
      };
    }
    ensureState(s);
    return {
      round: s.finance.round,
      equity: s.finance.equity,
      raised: s.finance.raised,
      investor: s.finance.investor,
      term: s.finance.term,
      valuation: valuation(s),
      rounds: rounds(s),
      offers: offers(s),
      history: s.finance.history.map((item) => ({ ...item })),
    };
  }

  /** 每日检查已到期对赌，结算一次，回购会回收该轮股权与本金口径。 */
  function tick(ctx) {
    ensureState(ctx.s);
    for (const record of ctx.s.finance.history) {
      const covenant = record.covenant;
      if (!covenant || covenant.status !== 'pending' || ctx.s.day < covenant.due) continue;
      if (![record.amount, record.equity, covenant.due, covenant.target].every(Number.isFinite)
        || record.amount < 0 || record.equity < 0 || covenant.target < 0) {
        covenant.status = 'invalid';
        log(ctx, '旧存档的对赌记录不完整，已停用该条款，未扣款。');
        continue;
      }
      covenant.status = monthlyRevenue(ctx.s) >= covenant.target ? 'passed' : 'failed';
      if (covenant.status === 'failed') {
        const cost = Math.round(record.amount * (1 + B.financeRules.buybackInterest));
        ctx.s.cash -= cost;
        ctx.s.finance.equity = Math.max(0, ctx.s.finance.equity - record.equity);
        ctx.s.finance.raised = Math.max(0, ctx.s.finance.raised - record.amount);
        if (ctx.s.finance.investor === record.investorId) {
          ctx.s.finance.investor = null;
          ctx.s.finance.term = null;
        }
        log(ctx, `📉 对赌未达标，回购 ${money(ctx, cost)}，本轮股权已回收。`);
      } else log(ctx, '📈 对赌收入目标达成，无需回购。');
    }
  }

  return { ensureState, valuation, rounds, offers, raise, view, tick };
});
