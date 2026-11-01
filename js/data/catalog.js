// js/data/catalog.js —— 静态目录表（结构 + 数值）
// 文案不在这里：所有面向玩家的长文本见 js/data/copy.js。
OPC.define('data.catalog', [], function () {
  'use strict';

  // ---------------- 公司方向 ----------------
  // cash: 启动资金 / role: 初始 agent 职业 / mix: 订单类型权重 / lead: 来单速度倍率
  // 六种公司方向：五种职业专长与独立产品；保留既有三个方向 id，兼容旧档。
  const directions = [
    { id: 'code', cash: 30000, role: 'coder', mix: { code: 0.6, content: 0.1, service: 0.1, agent: 0.2 }, lead: 1 },
    { id: 'content', cash: 25000, role: 'writer', mix: { code: 0.1, content: 0.6, service: 0.1, agent: 0.2 }, lead: 1.6 },
    { id: 'service', cash: 28000, role: 'support', mix: { code: 0.1, content: 0.1, service: 0.6, agent: 0.2 }, lead: 1 },
    { id: 'agent', cash: 30000, role: 'orchestrator', mix: { code: 0.15, content: 0.1, service: 0.1, agent: 0.6, audit: 0.05 }, lead: 1 },
    { id: 'audit', cash: 28000, role: 'auditor', mix: { code: 0.1, content: 0.1, service: 0.15, agent: 0.05, audit: 0.6 }, lead: 1.2 },
    { id: 'product', cash: 50000, role: 'coder', productTrack: 'track.efficiency', mix: { code: 0.35, content: 0.15, service: 0.25, agent: 0.2, audit: 0.05 }, lead: 0.8 },
  ];

  // ---------------- 职业 ----------------
  // type: 主订单类型。编排师做 Agent 部署，审计师做合规审计。
  const roles = {
    coder: { id: 'coder', type: 'code' },
    writer: { id: 'writer', type: 'content' },
    support: { id: 'support', type: 'service' },
    orchestrator: { id: 'orchestrator', type: 'agent' },
    auditor: { id: 'auditor', type: 'audit' },
  };

  // ---------------- 项目类型 ----------------
  // min/max: 工作量区间；pay: 单价倍率（小单单价高）
  const types = {
    code: { id: 'code', min: 30, max: 120, pay: 1 },
    content: { id: 'content', min: 10, max: 50, pay: 1.3 },
    service: { id: 'service', min: 20, max: 80, pay: 1 },
    agent: { id: 'agent', min: 40, max: 100, pay: 1.2 },
    audit: { id: 'audit', min: 20, max: 60, pay: 1.5 },
  };

  // ---------------- 模型时间线 ----------------
  // price: ¥/百万 token；power: 每天产出；quality: 交付质量 0~1
  // release / retire: 第几天发布 / 下线（0 = 开局就有；无 retire = 永不下线）
  // priceWar: 发布当天引发全行业降价 25%
  const models = [
    { id: 'op4m', name: 'Oculon-4 mini', vendor: '明眼科技', color: '#a8b263', price: 4, power: 1.0, quality: 0.55, release: 0, retire: 75 },
    { id: 'ab2', name: 'AbyssSeek V2', vendor: '深渊求索', color: '#c98a5b', price: 2, power: 0.9, quality: 0.50, release: 0, retire: 120 },
    { id: 'cl35', name: 'Claudia 3.5 Sonnet', vendor: '人择', color: '#e88b4a', price: 30, power: 2.0, quality: 0.85, release: 0, retire: 105 },
    { id: 'qw3', name: 'Qwan 3', vendor: '云朵智能', color: '#d98fa6', price: 6, power: 1.5, quality: 0.68, release: 20 },
    { id: 'op5', name: 'Oculon-5', vendor: '明眼科技', color: '#8fae5e', price: 50, power: 2.8, quality: 0.92, release: 45 },
    { id: 'abr1', imprint: 'imprint.reasoning', name: 'AbyssSeek R1', vendor: '深渊求索', color: '#d96f3f', price: 4, power: 2.0, quality: 0.78, release: 60, priceWar: true },
    { id: 'cl4o', name: 'Claudia 4 Opus', vendor: '人择', color: '#b5563a', price: 90, power: 3.2, quality: 0.97, release: 90 },
    { id: 'lb4', imprint: 'imprint.openSource', name: 'Llamab 4（开源）', vendor: '元维', color: '#d9b26a', price: 1.5, power: 1.6, quality: 0.65, release: 120 },
    { id: 'jm3', name: 'Jiminy 3 Pro', vendor: '古狗', color: '#e0b64a', price: 20, power: 2.6, quality: 0.88, release: 150 },
    { id: 'k3', name: 'Kimo K3', vendor: '月之亮面', color: '#d97aa8', price: 8, power: 2.4, quality: 0.82, release: 180 },
    { id: 'cl5', name: 'Claudia 5', vendor: '人择', color: '#f08a4b', price: 60, power: 4.0, quality: 0.99, release: 225 },
  ];

  // ---------------- CEO 每日行动 ----------------
  // energy: 精力变化（负数为消耗）
  const actions = {
    manage: { id: 'manage', energy: 8 },
    rest: { id: 'rest', energy: 30 },
    sales: { id: 'sales', energy: -20 },
    review: { id: 'review', energy: -20 },
    tune: { id: 'tune', energy: -15 },
    tweet: { id: 'tweet', energy: -10 },
  };

  // ---------------- 一次性公司升级 ----------------
  // work/tok: 乘数；q: 质量加成；lead: 来单速度乘数；guard: 免疫的事件标签
  const upgrades = [
    { id: 'seo', cost: 10000, lead: 1.5 },
    { id: 'promptlib', cost: 12000, work: 1.1 },
    { id: 'monitor', cost: 15000, guard: 'ops' },
    { id: 'cache', cost: 18000, tok: 0.75 },
    { id: 'rag', cost: 25000, q: 0.05 },
    { id: 'evals', cost: 30000, q: 0.05, guard: 'hallu' },
    { id: 'router', cost: 35000, tok: 0.8 },
    { id: 'orch', cost: 45000, work: 1.15 },
  ];

  /** 升级标签：给 UI 分类与事件免疫用 */
  const guardTags = { ops: '运维类', hallu: '幻觉类' };

  return { directions, roles, types, models, actions, upgrades, guardTags };
});
