// js/data/copy4.js —— P2 结局文案（8 个结局）
// 只放文本：结构 / 优先级 / 条件在 data/endings.js，规则在 domain/endings.js。
OPC.define('data.copy4', [], function () {
  'use strict';

  const endings = {
    'ending.freelancer': {
      name: '自由人',
      desc: '公司没有上市，也没有投资人。你有几个稳定的老客户、三台够用的 agent，和每天六点关电脑的自由。',
      yearbook: '第 {day} 天，你把公司留在了刚好装得下的尺寸。',
    },
    'ending.productEmpire': {
      name: '产品帝国',
      desc: '你的产品替几千家公司打卡、开会、回消息。你不再接单，只在版本发布日出现，说两句就下去。',
      yearbook: '第 {day} 天，产品比公司更有名。',
    },
    'ending.superIndividual': {
      name: '超级个体',
      desc: '净经营现金达到了目标。你没有员工，只有一群比你更懂细节的实例。',
      yearbook: '第 {day} 天，你证明了一人公司不是过渡状态。',
    },
    'ending.complianceBenchmark': {
      name: '合规标杆',
      desc: '审计报告摞起来比合同还厚。客户开始拿你的合规清单当行业模板，监管也拿你当正面案例。',
      yearbook: '第 {day} 天，你成了监管最喜欢引用的那家公司。',
    },
    'ending.hiddenChampion': {
      name: '隐形冠军',
      desc: '没人知道你，但行业里绕不开你。MRR 很稳，发布会永远只有一张桌子，来的都是真正下单的人。',
      yearbook: '第 {day} 天，你在聚光灯外把细分市场做穿了。',
    },
    'ending.acquired': {
      name: '被收购',
      desc: '大厂给了一个无法拒绝的价格。你签完字，工牌还没做，先收到了组织架构图。',
      yearbook: '第 {day} 天，你把公司卖给了更大的公司，也把自己还给了自己。',
    },
    'ending.bankrupt': {
      name: '破产',
      desc: '现金撑不过下一次房租。你把 agent 一个个归档，最后关掉了办公室的灯。',
      yearbook: '第 {day} 天，公司没能活下来，但你记得每一个 agent 的名字。',
    },
    'ending.ordinary': {
      name: '普通经营',
      desc: '公司还在。没有传奇，也没有倒闭。明天照常回邮件，照常改需求，照常把「最后一次」改到下一版。',
      yearbook: '第 {day} 天，你把一家普通公司又开了一天。',
    },
  };

  return { endings };
});
