// js/domain/office.js —— 办公室阶段：工位 / 房租 / 搬迁
// 阶段表由 data/office.js 提供；这里是唯一读取 s.office.stage 的规则层。
OPC.define('domain.office', ['data.balance'], function (B) {
  'use strict';

  /**
   * 兼容读取可选的 data 模块：content 表尚未落地时，规则层仍可被加载与单测。
   * 正常启动时 data/office.js 会先于本模块进入 manifest。
   * @param {string} name
   * @returns {object|Array|null}
   */
  function optionalData(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      return null;
    }
  }

  /** 阶段表：支持数组，或 { stages: [...] } 两种导出形状 */
  function stageList() {
    const data = optionalData('data.office');
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    if (Array.isArray(data.stages)) return data.stages;
    if (Array.isArray(data.office)) return data.office;
    return [];
  }

  /** 没有数据表时的最小可用阶段：数值仍来自 balance，不写死 */
  const FALLBACK_STAGE = Object.freeze({
    id: 'livingRoom',
    name: '客厅',
    slots: B.maxAgents,
    rent: B.rent,
    cost: 0,
    desc: '',
  });

  /** 只接受有限的非负数字，否则回退 */
  function numberOf(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value >= 0 ? value : fallback;
  }

  /**
   * 当前阶段下标。旧档没有 office / stage 时回到 0（客厅）。
   * @param {object} s
   * @returns {number}
   */
  function stageIndex(s) {
    const stages = stageList();
    if (!stages.length) return 0;
    const office = s && typeof s === 'object' && s.office && typeof s.office === 'object' ? s.office : null;
    const raw = office ? office.stage : undefined;
    if (Number.isInteger(raw) && raw >= 0 && raw < stages.length) return raw;
    if (typeof raw === 'string') {
      const byId = stages.findIndex(stage => stage && stage.id === raw);
      if (byId >= 0) return byId;
    }
    return 0;
  }

  /**
   * 当前办公室阶段。不会改状态；旧档默认第一个阶段。
   * @param {object} s
   * @returns {object} { id, name, slots, rent, cost, desc }
   */
  function stageOf(s) {
    const stages = stageList();
    return stages[stageIndex(s)] || FALLBACK_STAGE;
  }

  /**
   * 当前阶段工位数。
   * @param {object} s
   * @returns {number}
   */
  function slots(s) {
    return numberOf(stageOf(s).slots, B.maxAgents);
  }

  /**
   * 当前阶段月租。
   * @param {object} s
   * @returns {number}
   */
  function rent(s) {
    return numberOf(stageOf(s).rent, B.rent);
  }

  /**
   * 下一阶段；已是最后一个阶段或没有数据时返回 null。
   * @param {object} s
   * @returns {object|null}
   */
  function nextStage(s) {
    const stages = stageList();
    return stages[stageIndex(s) + 1] || null;
  }

  /** 日志金额：优先走 ctx.yuan，测试上下文可以不实现格式化 */
  function yuan(ctx, amount) {
    return typeof ctx.yuan === 'function' ? ctx.yuan(amount) : String(amount);
  }

  /**
   * 搬迁到下一阶段：扣现金、stage++、写日志。失败返回 false，不抛异常。
   * @param {object} ctx
   * @returns {boolean}
   */
  function upgrade(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    const next = nextStage(s);
    if (!next) {
      if (ctx && typeof ctx.log === 'function') ctx.log('已经是最后一个办公室阶段了，再搬就只能去公园办公。');
      return false;
    }

    const cost = next.cost;
    if (typeof cost !== 'number' || !isFinite(cost) || cost < 0) {
      if (ctx && typeof ctx.log === 'function') ctx.log('办公室数据不完整，暂时无法搬迁。');
      return false;
    }
    if (s.cash < cost) {
      if (ctx && typeof ctx.log === 'function') {
        ctx.log(`搬到「${next.name || next.id}」需要 ${yuan(ctx, cost)}，现金不足。`);
      }
      return false;
    }

    s.cash -= cost;
    if (!s.office || typeof s.office !== 'object') s.office = { stage: 0, facilities: [] };
    s.office.stage = stageIndex(s) + 1;
    const stage = stageOf(s);
    if (ctx && typeof ctx.log === 'function') {
      ctx.log(`🏢 公司搬到「${stage.name || stage.id}」：${slots(s)} 个工位，月租 ${yuan(ctx, rent(s))}。`);
    }
    return true;
  }

  return { stageOf, slots, rent, nextStage, upgrade };
});
