// js/data/copy9.js —— P1 谈判小游戏文案（5 张手牌）
// 只放文本：效果数值在 data/negotiation.js，规则在 domain/negotiation.js。
OPC.define('data.copy9', [], function () {
  'use strict';

  const cards = {
    'card.concede': {
      name: '让步',
      desc: '主动降一点价，换客户把合同签了。少赚总比不赚好，至少这次是。',
    },
    'card.firm': {
      name: '强硬',
      desc: '把底价亮在桌上，告诉对方「这个价格已经包含了我半夜回消息」。',
    },
    'card.case': {
      name: '案例',
      desc: '打开案例墙，让客户看看别人为同样的东西付过多少钱。',
    },
    'card.dinner': {
      name: '请吃饭',
      desc: '不谈合同，先聊孩子上学和最近哪家店好吃。关系是饭桌上长出来的。',
    },
    'card.delay': {
      name: '拖时间',
      desc: '说方案还要再打磨两天。客户会急，但急的时候更容易答应。',
    },
  };

  return { cards };
});
