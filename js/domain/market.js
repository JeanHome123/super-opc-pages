// js/domain/market.js —— 模型市场时间线：发布 / 下线强制迁移 / 价格战
OPC.define('domain.market', ['core.util', 'data.balance', 'data.catalog'], function (U, B, D) {
  'use strict';

  /** 取当前可用的模型（不存在返回 null） */
  function getModel(s, modelId) {
    return U.byId(s.models, modelId);
  }

  /** 当天发布的新模型 */
  function releasesToday(s) {
    return D.models.filter(blueprint => blueprint.release === s.day && blueprint.release > 0);
  }

  /** 当天要下线的模型 */
  function retirementsToday(s) {
    return s.models.filter(model => model.retire === s.day);
  }

  /**
   * 市场推进（tick 阶段）：先发布、再下线。
   * 下线时厂商会「贴心」地把 agent 迁到同厂商最新模型 —— 不盯价格的玩家会被账单教育。
   */
  function advance(ctx) {
    const s = ctx.s;

    for (const blueprint of releasesToday(s)) {
      if (getModel(s, blueprint.id)) continue;           // 内测过的已在列表里
      s.models.push({ ...blueprint });
      ctx.log(
        `🚀 ${blueprint.vendor} 发布了 ${blueprint.name}！` +
        `价格 ${ctx.yuan(blueprint.price)}/M，产出 ${blueprint.power}，质量 ${Math.round(blueprint.quality * 100)}%`,
        true
      );
      if (blueprint.priceWar) {
        s.models.forEach(model => {
          if (model.id !== blueprint.id) model.price = U.round1(model.price * 0.75);
        });
        ctx.log('💥 新模型引发全行业价格战，其他模型全部降价 25%！', true);
      }
    }

    for (const retired of retirementsToday(s)) {
      s.models = s.models.filter(model => model.id !== retired.id);

      const sameVendor = s.models.filter(model => model.vendor === retired.vendor);
      const pool = sameVendor.length ? sameVendor : s.models;
      if (!pool.length) {
        ctx.log(`⚰️ ${retired.name} 正式下线`, true);
        continue;
      }

      const fallback = pool.reduce((best, model) => (model.release > best.release ? model : best));
      const moved = s.agents.filter(agent => agent.modelId === retired.id);
      moved.forEach(agent => {
        agent.modelId = fallback.id;
        OPC.require('domain.persona').drift(ctx, agent, fallback.id, retired);
      });

      const suffix = moved.length
        ? `，${moved.length} 个 agent 被厂商强制迁移到 ${fallback.name}（${ctx.yuan(fallback.price)}/M，记得检查成本）`
        : '';
      ctx.log(`⚰️ ${retired.name} 正式下线${suffix}`, true);
    }
  }

  return { getModel, advance, releasesToday, retirementsToday };
});
