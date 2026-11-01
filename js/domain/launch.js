// js/domain/launch.js —— P2 产品发布会：可发布判定 / 评分 / 发布结果
// 产品来自 s.product；评分只看质量、功能数与趋势匹配，不引入随机。
OPC.define('domain.launch', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  // TODO(balance): 发布会评分权重 / 用户与声誉奖励可迁入 data/balance.js。
  const RULES = {
    baseScore: 1,
    qualityWeight: 2,
    featureCap: 2,
    trendBonus: 1,
    usersPerScore: 300,
    repPerScore: 1,
  };

  /** 产品赛道 → 订单类型，用于判断趋势是否匹配 */
  const TRACK_TYPES = {
    'track.efficiency': 'code',
    'track.saas': 'service',
    'track.content': 'content',
    'track.agent': 'agent',
    'track.education': 'content',
    'track.game': 'content',
  };

  const finite = (value, fallback = 0) => (
    typeof value === 'number' && isFinite(value) ? value : fallback
  );
  const log = (ctx, text) => { if (ctx && typeof ctx.log === 'function') ctx.log(text); };

  function optionalData(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      return null;
    }
  }

  const productOf = (s) => (s && s.product && typeof s.product === 'object' && !Array.isArray(s.product) ? s.product : null);

  /** 当前趋势定义；s.trend 只存 id / startDay / endDay */
  function trendOf(s) {
    if (!s || !s.trend || typeof s.trend !== 'object' || !s.trend.id) return null;
    const data = optionalData('data.trends');
    const list = Array.isArray(data) ? data : data && Array.isArray(data.trends) ? data.trends : [];
    return list.find((item) => item && item.id === s.trend.id) || null;
  }

  /** 趋势是否命中产品赛道：优先 orderTypes，其次看全局 orderTypeMul */
  function trendMatches(s, product) {
    const def = trendOf(s);
    if (!def || !product) return false;
    const trend = s.trend;
    if (Number.isFinite(trend.startDay) && Number.isFinite(trend.endDay)
      && (finite(s.day, 0) < trend.startDay || finite(s.day, 0) > trend.endDay)) return false;
    const type = TRACK_TYPES[product.track] || null;
    const orderTypes = Array.isArray(def.orderTypes) ? def.orderTypes : [];
    if (orderTypes.length) return orderTypes.includes(type) || orderTypes.includes(product.track);
    return finite(def.effects && def.effects.orderTypeMul, 1) > 1;
  }

  /** 发布会是否可开：产品已离开 MVP（beta / live）且没有开过 */
  function canLaunch(s) {
    const product = productOf(s);
    return !!product && typeof product.stage === 'string'
      && product.stage !== 'mvp' && !product.launchDone;
  }

  /**
   * 发布会评分 1–5：基础 1 + 质量（0–2）+ 功能数（0–2）+ 趋势匹配（0–1）。
   * 没有产品 / 还在 MVP 时返回 0（不可发布）。
   * @param {object} s
   * @returns {number}
   */
  function score(s) {
    const product = productOf(s);
    if (!product || product.stage === 'mvp') return 0;
    const quality = U.clamp(finite(product.quality, 0), 0, 1);
    const features = Array.isArray(product.features) ? product.features.length : 0;
    let value = RULES.baseScore + Math.round(quality * RULES.qualityWeight)
      + Math.min(RULES.featureCap, Math.floor((features + 1) / 2));
    if (trendMatches(s, product)) value += RULES.trendBonus;
    return U.clamp(value, 1, 5);
  }

  /** 评分对应文案；文案缺失时回退到分数，不让发布会因文案缺失失败 */
  function gradeOf(points) {
    const data = optionalData('data.copy7');
    const grades = data && data.grades && typeof data.grades === 'object' ? data.grades : {};
    const grade = grades[points];
    return grade && typeof grade === 'object'
      ? grade
      : { name: `${points} 分`, desc: '', line: '' };
  }

  /**
   * 开发布会：成功后写 launchDone / launchScore，增加用户与声誉。
   * 失败返回 false + ctx.log；成功返回 true。
   * @param {object} ctx
   * @returns {boolean}
   */
  function launch(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    const product = productOf(s);
    if (!product) {
      log(ctx, '还没有产品，先做一个 MVP 再谈发布会。');
      return false;
    }
    if (typeof product.stage !== 'string' || product.stage === 'mvp') {
      log(ctx, '产品还在 MVP，先发布内测，等离开 MVP 再开发布会。');
      return false;
    }
    if (product.launchDone) {
      log(ctx, '这场发布会已经开过了，观众不会再来第二次。');
      return false;
    }

    const points = score(s);
    const grade = gradeOf(points);
    product.launchDone = true;
    product.launchScore = points;
    product.users = Math.max(0, finite(product.users, 0)) + points * RULES.usersPerScore;
    OPC.require('domain.products').refresh(ctx);
    s.rep = U.clamp(finite(s.rep, 0) + points * RULES.repPerScore, 0, B.reputationMax);

    log(ctx, `🎤 发布会评分 ${points}/5「${grade.name}」：${grade.desc} 用户 +${points * RULES.usersPerScore}，声誉 +${points * RULES.repPerScore}。`);
    if (typeof ctx.emit === 'function') {
      ctx.emit('launch', {
        score: points,
        grade,
        users: points * RULES.usersPerScore,
        rep: points * RULES.repPerScore,
      });
    }
    return true;
  }

  /**
   * 给 UI 的发布会快照：可发布状态 / 预计评分 / 已发布结果。
   * @param {object} s
   * @returns {object}
   */
  function view(s) {
    const product = productOf(s);
    const points = product ? score(s) : 0;
    const grade = gradeOf(points);
    return {
      canLaunch: canLaunch(s),
      score: points,
      grade: grade.name || '',
      desc: grade.desc || '',
      line: grade.line || '',
      launchDone: !!(product && product.launchDone),
      launchScore: product && Number.isFinite(product.launchScore) ? product.launchScore : 0,
      product: product ? {
        name: product.name || product.track || '',
        stage: product.stage || '',
        users: finite(product.users, 0),
        quality: finite(product.quality, 0),
        features: Array.isArray(product.features) ? product.features.length : 0,
      } : null,
    };
  }

  return { canLaunch, score, launch, view };
});
