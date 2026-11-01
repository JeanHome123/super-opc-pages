// js/domain/economy.js —— 经济与产出公式（纯函数，全部系数来自 data.balance）
// 这里是「一个 agent 一天能产出多少、烧多少钱、交付能拿多少」的唯一计算处。
OPC.define('domain.economy', ['core.util', 'data.balance', 'data.catalog', 'data.copy', 'domain.office'], function (U, B, D, C, Office) {
  'use strict';

  /** 当前模式的参数 */
  const modeOf = s => B.modes[s.mode] || B.modes[B.defaultMode];
  /** 趋势模块可能分阶段挂载：缺失时全部按中性值 */
  const trendsApi = () => (OPC.has('domain.trends') ? OPC.require('domain.trends') : null);
  const mods = () => OPC.require('domain.modifiers');
  const techApi = () => (OPC.has('domain.tech') ? OPC.require('domain.tech') : null);

  /**
   * 已购升级的合计效果。
   * @param {object} s
   * @returns {{work:number, tok:number, q:number, lead:number, guard:string[]}}
   */
  function boosts(s) {
    const out = { work: 1, tok: 1, q: 0, lead: 1, guard: [] };
    for (const upgrade of D.upgrades) {
      if (!s.upgrades.includes(upgrade.id)) continue;
      out.work *= upgrade.work || 1;
      out.tok *= upgrade.tok || 1;
      out.lead *= upgrade.lead || 1;
      out.q += upgrade.q || 0;
      if (upgrade.guard) out.guard.push(upgrade.guard);
    }
    const creed = OPC.require('domain.chapters').effects(s);
    out.work *= 1 + (creed.work || 0);
    out.tok *= 1 + (creed.token || 0);
    out.q += creed.quality || 0;
    return out;
  }

  /** 模型单价（含年付套餐 5 折） @param {object} s @param {object} model @returns {number} */
  function priceOf(s, model) {
    if (!model) return 0;
    const discounted = model.discountUntil != null && model.discountUntil >= s.day;
    const Trend = trendsApi();
    const trendMul = Trend ? Trend.modelPriceMul(s) : 1;
    return model.price * (discounted ? 0.5 : 1) * trendMul;
  }

  /** 某个 agent 一天烧掉的 token 费用 @returns {number} */
  function dailyCost(s, agent) {
    const model = U.byId(s.models, agent.modelId);
    const Trend = trendsApi();
    const Tech = techApi();
    const trendMul = Trend ? Trend.tokenMul(s) : 1;
    const techMul = Tech ? Tech.effects(s).token : 1;
    return B.tokensPerDay * modeOf(s).tok * boosts(s).tok * priceOf(s, model) * trendMul * techMul
      * Math.max(0, 1 + mods().agent(agent, 'token'));
  }

  /** 今天所有在岗 agent 的 token 总开销（UI 展示用，不扣钱） */
  function burnToday(s) {
    return s.agents.filter(a => a.busy).reduce((total, a) => total + dailyCost(s, a), 0);
  }

  /** 部署下一个 agent 的价格（2.0：实例化成本，不是招聘费） */
  function deployCost(s) {
    return B.deployBase + B.deployStep * s.agents.length;
  }

  /** 归档打包 / 冷存储费用（固定值） */
  function archiveCost(s) {
    return B.archiveFee;
  }

  /** Fork 成本：按源 agent 的等级递增 */
  function forkCost(s, agent) {
    const level = agent && Number.isInteger(agent.level) ? agent.level : 1;
    return B.forkBase + B.forkStep * Math.max(0, level - 1);
  }

  /** @deprecated 1.x 名称，保留一版；用 deployCost，2.1 移除 */
  const hireCost = deployCost;

  /**
   * 质量加成：升级 + 亲自把关 - 疲惫。
   * @param {object} s
   * @returns {number}
   */
  function qualityBonus(s) {
    const mode = modeOf(s);
    let bonus = boosts(s).q + mode.q;
    if (((s.report && s.report.action) || s.action) === 'review') bonus += B.reviewBonus;
    if (s.energy < B.tiredBelow) bonus -= B.tiredPenalty;
    return bonus;
  }

  /**
   * 单个 agent 对某类项目的日产出。
   * @param {object} s
   * @param {object} agent
   * @param {string} projectType 项目类型 id
   * @returns {number}
   */
  function agentRate(s, agent, projectType) {
    const model = U.byId(s.models, agent.modelId);
    if (!model) return 0;
    const mode = modeOf(s);
    const b = boosts(s);
    const levelBonus = 1 + B.levelWorkBonus * (agent.level - 1);
    const matchBonus = (D.roles[agent.role] || {}).type === projectType ? B.roleMatchBonus : 1;
    const throttle = s.throttle > 0 ? 0.5 : 1;
    // 同步率低只影响产出（答非所问），不会触发离职
    const sync = agent.persona && typeof agent.persona.sync === 'number' ? agent.persona.sync : B.syncDefault;
    const syncMul = sync < B.syncLowBelow ? 1 - B.syncLowPenalty : 1;
    return model.power * mode.work * b.work * levelBonus * matchBonus * throttle * syncMul;
  }

  /**
   * 团队对某类项目的日产出估计。
   * @param {object} s
   * @param {string} typeId
   * @returns {number}
   */
  function teamRate(s, typeId) {
    return U.sum(s.agents, a => production(s, a, typeId).rate);
  }

  /**
   * 团队平均交付质量估计（含模式/升级/疲惫）。
   * @param {object} s
   * @returns {number}
   */
  function teamQuality(s) {
    if (!s.agents.length) return 0;
    return U.sum(s.agents, a => production(s, a, (D.roles[a.role] || {}).type).quality) / s.agents.length;
  }

  /**
   * 交付报酬：达标最多 +15%，不达标按差距平方扣。
   * @param {object} project
   * @param {number} quality 实际交付质量
   * @returns {number}
   */
  function payout(project, quality) {
    const ratio = project.minQ > 0 ? quality / project.minQ : 1;
    const factor = quality >= project.minQ ? Math.min(B.qualityCap, ratio) : ratio * ratio;
    return Math.round(project.reward * factor);
  }

  /** 月结：房租 + 运维 + 额外固定开销，扣订阅收入 @param {object} ctx */
  function settleMonth(ctx) {
    const s = ctx.s;
    if (s.day % B.daysPerMonth !== 0) return;
    const fixed = (Office.rent(s) + B.upkeepPerAgent * s.agents.length + s.extraFixed)
      * (1 + (OPC.require('domain.chapters').effects(s).cashPressure || 0));
    const productMrr = s.product && Number.isFinite(s.product.mrr) ? s.product.mrr : 0;
    const productCost = s.product && Number.isFinite(s.product.serverCost) ? s.product.serverCost : 0;
    s.total.fixed += fixed + productCost;
    s.cash += s.mrr + productMrr - fixed - productCost;
    ctx.log(
      `📅 第 ${s.day / B.daysPerMonth} 月结算：项目收入 ${ctx.yuan(s.month.income)}，订阅 ${ctx.yuan(s.mrr)}，` +
      `token ${ctx.yuan(s.month.token)}，固定开销 ${ctx.yuan(fixed + productCost)}，产品 ${ctx.yuan(productMrr)}`
    );
    s.month = { income: 0, token: 0 };
  }

  /** 透支利息 + 破产/胜利判定 @param {object} ctx */
  function checkSolvency(ctx) {
    const s = ctx.s;
    if (s.cash < 0) {
      const interest = Math.round(-s.cash * B.interest);
      s.cash -= interest;
      ctx.log(`⚠️ 透支中（额度 ${ctx.yuan(B.credit)}），今日利息 ${ctx.yuan(interest)}`);
    }
    if (s.cash < -B.credit) {
      s.over = 'lose';
      s.pending = null;
      ctx.log(`💸 透支超过额度，公司在第 ${s.day} 天破产了。`, true);
    } else if (s.cash - (s.finance && Number.isFinite(s.finance.raised) ? s.finance.raised : 0) >= B.goal) {
      s.over = 'win';
      s.pending = null;
      ctx.log(`🏆 第 ${s.day} 天现金突破 ${ctx.yuan(B.goal)}，一人公司成功了！`, true);
    }
  }

  /**
   * 购买一次性升级。失败时写日志并返回 false。
   * @param {object} ctx
   * @param {string} upgradeId
   * @returns {boolean}
   */
  function buyUpgrade(ctx, upgradeId) {
    const s = ctx.s;
    const upgrade = U.byId(D.upgrades, upgradeId);
    if (!upgrade || s.upgrades.includes(upgradeId)) return false;

    const copy = C.upgrades[upgradeId] || { name: upgradeId, desc: '' };
    if (s.cash < upgrade.cost) {
      ctx.log(`「${copy.name}」需要 ${ctx.yuan(upgrade.cost)}，现金不足。`);
      return false;
    }
    s.cash -= upgrade.cost;
    s.upgrades.push(upgradeId);
    ctx.log(`🛠️ 购入「${copy.name}」：${copy.desc}`);
    return true;
  }

  /** 完整生产快照；与实际扣费共用，project 可省略用于估计。 */
  function production(s, agent, type, project) {
    const fx = mods();
    const tech = techApi().effects(s);
    const pipe = OPC.require('domain.pipeline').bonus(s, type, agent.id);
    const persona = OPC.require('domain.persona');
    let pair = { work: 1, quality: 0 };
    for (const id of (project && project.crew) || []) {
      if (id === agent.id) continue;
      const bonus = persona.pairBonus(s, agent.id, id);
      pair.work = bonus.work < 1 ? Math.min(pair.work, bonus.work) : Math.max(pair.work, bonus.work);
      pair.quality = Math.max(pair.quality, bonus.quality);
    }
    const model = U.byId(s.models, agent.modelId);
    return {
      cost: dailyCost(s, agent),
      rate: agentRate(s, agent, type) * (1 + fx.agent(agent, 'work')) * pair.work * pipe.work * tech.work
        / (1 + fx.agent(agent, 'duration') + (OPC.require('domain.chapters').effects(s).duration || 0)),
      quality: U.clamp((model ? model.quality : 0) + qualityBonus(s) + fx.agent(agent, 'quality')
        + pair.quality + pipe.quality + tech.quality, 0, 1),
    };
  }

  return {
    production, modeOf, boosts, priceOf, dailyCost, burnToday, deployCost, archiveCost, forkCost, hireCost,
    qualityBonus, agentRate, teamRate, teamQuality, payout, settleMonth, checkSolvency, buyUpgrade,
  };
});
