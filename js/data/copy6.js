// js/data/copy6.js —— P2 融资文案（3 轮 + 4 位投资人）
// 只放文本：金额 / 股权 / 日期 / 估值倍率在 data/finance.js，规则在 domain/finance.js。
OPC.define('data.copy6', [], function () {
  'use strict';

  const rounds = {
    'round.angel': {
      name: '天使轮',
      desc: '第一笔外部钱。金额不大，但从此账上多了一个需要解释的人。',
      term: '不设对赌；每月一份周报，重大支出提前打招呼。',
    },
    'round.preA': {
      name: 'Pre-A 轮',
      desc: '产品有了用户，故事开始有人信。钱变多了，问题也变贵了。',
      term: '对赌：90 天内月收入达到签约时的 3 倍（最低 ¥10,000），否则按本金加 8% 回购。',
    },
    'round.a': {
      name: 'A 轮',
      desc: '你不再是「一人公司」的样本，而是一张需要增长曲线的报表。',
      term: '企业资源进入公司；投资人具体回报条款以签约说明为准。',
    },
  };

  const investors = {
    'investor.laozhang': {
      name: '老张',
      desc: '熟人介绍，喝茶时把条款讲了三遍，最后说「不着急，你先活下来」。',
      term: '友好：不干预日常，无对赌或额外分成。',
    },
    'investor.lisa': {
      name: 'Lisa',
      desc: '语速很快，PPT 只有三页，每一页都在问「三年后你怎么退出」。',
      term: '激进：90 天内月收入达到签约时的 3 倍（最低 ¥10,000），否则本金加 8% 回购。',
    },
    'investor.wang': {
      name: '王总',
      desc: '手里有一串企业客户名单，开口先问「你们能开专票吗」。',
      term: '资源型：立即介绍 3 个大客户；之后每笔交付收入分成 5%。',
    },
    'investor.fraud': {
      name: '骗子',
      desc: '估值给得最爽快，合同页数最少，尽调只做了一天。他的办公室是共享工位。',
      term: '高估值：展示估值翻倍；到账后卷走本轮投资的 80%，声誉 −20。',
    },
  };

  return { rounds, investors };
});
