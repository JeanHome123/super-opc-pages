// js/domain/audit.js —— P1 合规审计与认证（auditor 职业的核心价值）
// 合规分只存在 s.compliance；审计消耗现金与精力，报告写入公司日志，不碰 UI。
OPC.define('domain.audit', ['core.util', 'data.balance'], function (U, B) {
  'use strict';

  // TODO(balance): 以下两项待迁入 data/balance.js：
  //   complianceAuditCost（每次审计现金）、complianceAuditEnergy（每次审计精力）。
  // 迁移前用局部 RULES 兜底，避免在逻辑里散落魔法数字。
  const RULES = {
    complianceAuditCost: 3000,
    complianceAuditEnergy: 20,
  };

  /** 认证 id 与展示名；等 balance 提供同名字段时优先用 balance */
  const CERT_ID = typeof B.complianceCertId === 'string' && B.complianceCertId
    ? B.complianceCertId : 'cert.compliance.basic';
  const CERT_NAME = typeof B.complianceCertName === 'string' && B.complianceCertName
    ? B.complianceCertName : '基础合规认证';

  /** 优先读 balance 的顶层常量，缺失时回退局部 RULES */
  const rule = key => (Number.isFinite(B[key]) ? B[key] : RULES[key]);

  /** 精力上限：balance 没有 energyMax 时沿用开局精力 */
  const energyMax = () => (Number.isFinite(B.energyMax) ? B.energyMax : B.startEnergy);

  /** 金额格式化：ctx 缺失 yuan 时退化为数字字符串，报告不能因格式化失败而丢 */
  const money = (ctx, value) => (typeof ctx.yuan === 'function' ? ctx.yuan(value) : String(value));

  /** 写日志：测试 / 内容注入的 ctx 可能没有 log，审计本身不应因此抛错 */
  const log = (ctx, text) => { if (typeof ctx.log === 'function') ctx.log(text); };

  /**
   * 读合规分：坏值 / 旧档按初始值 40 处理，结果夹在 0–100。
   * 纯读，不修改状态。
   * @param {object} s
   * @returns {number}
   */
  function score(s) {
    const value = s && typeof s === 'object' ? s.compliance : undefined;
    if (typeof value !== 'number' || !isFinite(value)) return B.complianceStart;
    return U.clamp(Math.round(value), B.complianceMin, B.complianceMax);
  }

  /**
   * 补齐合规字段：旧档缺 compliance / certs 时给默认值，坏值归位。
   * 正式迁移仍由 domain.state 负责；这里只保证本模块可独立运行。
   * @param {object} s
   * @returns {object} 同一个 s
   */
  function ensureState(s) {
    if (!s || typeof s !== 'object') return s;
    if (typeof s.compliance !== 'number' || !isFinite(s.compliance)) {
      s.compliance = B.complianceStart;
    }
    s.compliance = U.clamp(Math.round(s.compliance), B.complianceMin, B.complianceMax);
    if (!Array.isArray(s.certs)) s.certs = [];
    s.certs = s.certs.filter(id => typeof id === 'string' && id);
    return s;
  }

  /**
   * 合规风险档位：<30 高，30–59 中，>=60 低。
   * @param {object} s
   * @returns {'低'|'中'|'高'}
   */
  function riskOf(s) {
    const value = score(s);
    if (value < B.complianceCrisisBelow) return '高';
    if (value < B.complianceCertThreshold) return '中';
    return '低';
  }

  /** 按风险档位给一句可执行的整改建议（固定文本，不含随机） */
  function findingsOf(risk) {
    if (risk === '高') return '待整改：数据留存、供应商审查、日志留痕。';
    if (risk === '中') return '待整改：供应商审查、日志留痕。';
    return '未发现阻断项，建议保持季度复核。';
  }

  /**
   * 生成审计报告文本。
   * @param {object} agent 审计师
   * @param {number} before 审计前合规分
   * @param {number} after 审计后合规分
   * @param {string} risk 风险档位
   * @param {number} cost 本次现金成本
   * @param {object} ctx
   * @returns {string}
   */
  function buildReport(agent, before, after, risk, cost, ctx) {
    const name = agent && agent.name ? agent.name : `Agent ${agent && agent.id}`;
    return `合规审计报告（${name}）：${before} → ${after}，风险 ${risk}。` +
      `${findingsOf(risk)}成本 ${money(ctx, cost)}。`;
  }

  /**
   * 执行一次内部合规审计：要求一名在岗审计师，扣现金 / 精力，合规 +B.complianceAuditGain。
   * 失败返回 false 并写日志；成功返回 { ok, score, report }。
   * @param {object} ctx
   * @param {number} agentId
   * @returns {{ok:boolean, score:number, report:string}|false}
   */
  function audit(ctx, agentId) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);

    const agent = (Array.isArray(s.agents) ? s.agents : []).find(item => item.id === agentId);
    if (!agent || agent.role !== 'auditor') {
      log(ctx, '只有 AI 合规审计师能签发审计报告。');
      return false;
    }

    const cost = rule('complianceAuditCost');
    const energy = rule('complianceAuditEnergy');
    const cash = typeof s.cash === 'number' && isFinite(s.cash) ? s.cash : 0;
    const energyNow = typeof s.energy === 'number' && isFinite(s.energy) ? s.energy : 0;
    if (cash < cost) {
      log(ctx, `审计需要 ${money(ctx, cost)}，现金不足。`);
      return false;
    }
    if (energyNow < energy) {
      log(ctx, `审计需要 ${energy} 点精力，今天已经不够了。`);
      return false;
    }

    s.cash = cash - cost;
    s.energy = U.clamp(energyNow - energy, 0, energyMax());
    const before = score(s);
    const after = U.clamp(before + B.complianceAuditGain * (1 + OPC.require('domain.modifiers').agent(agent, 'compliance')), B.complianceMin, B.complianceMax);
    s.compliance = after;

    const risk = riskOf(s);
    const report = buildReport(agent, before, after, risk, cost, ctx);
    log(ctx, `📋 ${report}`);
    if (typeof ctx.emit === 'function') ctx.emit('audit', { agentId: agent.id, score: after, report });
    return { ok: true, score: after, report };
  }

  /**
   * 申请基础合规认证：合规分 >= B.complianceCertThreshold 才能通过；重复申请失败。
   * @param {object} ctx
   * @returns {boolean}
   */
  function certify(ctx) {
    if (!ctx || !ctx.s) return false;
    const s = ctx.s;
    ensureState(s);

    const current = score(s);
    if (current < B.complianceCertThreshold) {
      log(ctx, `合规分 ${current}，达到 ${B.complianceCertThreshold} 才能申请${CERT_NAME}。`);
      return false;
    }
    if (s.certs.includes(CERT_ID)) {
      log(ctx, `${CERT_NAME}已经拿到了，不用重复申请。`);
      return false;
    }

    s.certs.push(CERT_ID);
    log(ctx, `🏅 通过${CERT_NAME}（合规分 ${current}），可以接国企 / 银行 / 政府订单了。`);
    if (typeof ctx.emit === 'function') ctx.emit('certify', { certId: CERT_ID, score: current });
    return true;
  }

  return { score, ensureState, riskOf, audit, certify };
});
