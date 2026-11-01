// js/data/copy8.js —— P1 通用技能文案（12 个）
// 只放文本：结构与效果在 data/skills.js；职业技能文案沿用 data.copy.skills。
OPC.define('data.copy8', [], function () {
  'use strict';

  const skills = {
    selfReview: {
      name: '自我 Review',
      desc: '交出去之前，先假装自己是那个最挑剔的客户，把方案读一遍。',
    },
    decompose: {
      name: '拆解需求',
      desc: '把「做个类似微信的东西」拆成能排期、能验收、能报价的七件事。',
    },
    emotionStable: {
      name: '情绪稳定',
      desc: '客户凌晨改需求，你先回「收到」，再决定要不要生气。',
    },
    crossFunctional: {
      name: '跨职能',
      desc: '能跟程序员聊文案，也能跟写手聊接口。至少知道对方在说什么。',
    },
    docObsession: {
      name: '文档强迫症',
      desc: '每个决定都留一句为什么。三个月后，你会感谢现在的自己。',
    },
    clientMind: {
      name: '客户读心',
      desc: '客户说「随便」的时候，能听出他其实已经有一个很具体的版本。',
    },
    rapidProto: {
      name: '快速原型',
      desc: '先做一个能点的丑东西，比做十页完美方案更快拿到真话。',
    },
    crisisPR: {
      name: '危机公关',
      desc: '出事时先给事实和时间表，不先给情绪。',
    },
    mentor: {
      name: '带新人',
      desc: '把「你应该懂」换成「我演示一遍」。对 agent 和对人都一样。',
    },
    timeManagement: {
      name: '时间管理',
      desc: '知道哪一单可以晚点回，哪一单晚一小时就会失去客户。',
    },
    contrarian: {
      name: '反常识直觉',
      desc: '在所有人都说「先做大」的时候，敢问一句「为什么不能先做小」。',
    },
    retrospective: {
      name: '复盘习惯',
      desc: '每周留半小时，把踩过的坑写成下一周不再踩的清单。',
    },
  };

  return { skills };
});
