// js/data/copy2.js —— P1 趋势 / 竞对文案
// 只放文本：结构 / 数值在 data.trends.js 与 data.rivals.js。
OPC.define('data.copy2', [], function () {
  'use strict';

  const trends = {
    'trend.agentBoom': { name: 'Agent 元年', desc: 'Agent 部署订单 +80%，事故风险 +20%。客户开始问：「能不能把整个流程交给它？」' },
    'trend.multimodal': { name: '多模态爆发', desc: '内容 / 视频订单 +50%，单价 +30%。客户发来参考视频，说「照这个感觉来」。' },
    'trend.openSource': { name: '开源冲击', desc: '模型价格 −40%，客户开始要求私有化。你算了一下，省下的钱刚好够买一台新服务器。' },
    'trend.computeShortage': { name: '算力荒', desc: 'token 成本 +50%，模型价格 +20%。群里开始有人囤卡，像囤盐。' },
    'trend.regulation': { name: '监管落地', desc: '合规订单 +100%，无证经营风险 +60%。客户的第一句话从「多少钱」变成「你们备案了吗」。' },
    'trend.aiSafety': { name: 'AI 安全恐慌', desc: '安全审计订单 +80%，风险 +30%。一个 Demo 里的错误回答，能被截图传三天。' },
    'trend.priceWar': { name: '价格战', desc: '订单报酬 −25%，大客户开始比价。你报完价，对方回了一个更低的数字。' },
    'trend.privateDeploy': { name: '企业私有化', desc: '私有部署订单 +70%，客单价 +40%。客户要求「数据不出园区」，你开始研究机房。' },
    'trend.aiHardware': { name: 'AI 硬件热', desc: '硬件相关订单 +50%，供应风险 +10%。客户想要一个能放在前台说话的小盒子。' },
    'trend.agiPanic': { name: 'AGI 恐慌', desc: '全行业震荡：订单 −20%，报酬 −10%，token 成本 +20%，模型价格 +30%，合规风险 +50%。所有人都在讨论还需不需要公司，你照常回邮件。' },
    'trend.contentBoom': { name: '内容大爆炸', desc: '内容订单 +40%，单价 −20%。客户要日更三十条，预算按条算。' },
    'trend.global': { name: '出海潮', desc: '海外订单 +60%，合规风险 +30%，时差事件增加。客户在另一个时区，凌晨三点说「早上好」。' },
  };

  const rivals = {
    'rival.giant': { name: '巨硬科技', personality: '资源多、动作慢、爱抄袭', strength: '渠道和免费策略', weakness: '决策链长，转身慢' },
    'rival.starlight': { name: '星光智能', personality: '融资多、烧钱快、爱抢单', strength: '现金和曝光', weakness: '现金流脆弱' },
    'rival.laozhang': { name: '老张工作室', personality: '低价、针对你、旧怨未了', strength: '价格和本地关系', weakness: '产能有限' },
    'rival.trio': { name: '三人成虎', personality: '极低价、质量不稳', strength: '报价低', weakness: '交付质量' },
    'rival.oss': { name: '开源公社', personality: '免费、质量高、不接商业单', strength: '社区和口碑', weakness: '不接商业单，响应慢' },
    'rival.global': { name: '海外巨头', personality: '全球资源、合规强', strength: '合规和资本', weakness: '本地化慢' },
  };

  const rivalActions = {
    stealOffer: '抢单',
    bid: '抢标',
    launch: '发产品',
    priceWar: '价格战',
    pr: '发公关稿',
    copy: '抄袭',
  };

  return { trends, rivals, rivalActions };
});
