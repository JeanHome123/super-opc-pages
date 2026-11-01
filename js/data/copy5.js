// js/data/copy5.js —— P2 技术树文案（3 线 × 4 节点）
// 只放文本：结构 / 成本 / 前置 / 效果在 data/tech.js，规则在 domain/tech.js。
OPC.define('data.copy5', [], function () {
  'use strict';

  const lines = {
    efficiency: {
      name: '效率',
      desc: '同样的活，用更少的 token、更少的等待和更少的人。省下来的都是利润。',
    },
    quality: {
      name: '质量',
      desc: '把「差不多」变成可验收的稳定输出。客户不会为质量鼓掌，但会为返工买单。',
    },
    capability: {
      name: '能力',
      desc: '做别人接不了的活，才有定价权。能力线的尽头，是一间不再需要解释自己的实验室。',
    },
  };

  const nodes = {
    'tech.eff.cache': {
      name: 'Prompt 缓存',
      desc: '把重复的上下文存起来，第二次问就不再从头读。省下的 token 不会说话，账单会。',
    },
    'tech.eff.router': {
      name: '模型路由',
      desc: '简单问题走便宜模型，难问题才叫贵的那位。路由表写错一次，够你记一个月。',
    },
    'tech.eff.distill': {
      name: '蒸馏',
      desc: '把大模型的判断压进小模型。小模型跑得快，但你要接受它偶尔忘了自己为什么这么答。',
    },
    'tech.eff.automation': {
      name: '自动化流水线',
      desc: '接单、拆活、派给 agent、验收、回款，一条线跑完。你只负责在异常时抬头。',
    },
    'tech.quality.rag': {
      name: 'RAG',
      desc: '先让 agent 查资料，再让它开口。答案不一定更聪明，至少知道自己是哪来的。',
    },
    'tech.quality.eval': {
      name: '自动评测',
      desc: '每次改提示词都跑一遍题。分数不能保证客户满意，但能保证你没在瞎改。',
    },
    'tech.quality.finetune': {
      name: '微调',
      desc: '用自家交付数据训一个更懂行的小模型。它会更像你，包括你的坏习惯。',
    },
    'tech.quality.redteam': {
      name: '红队',
      desc: '自己先攻击自己，把难看的回答在客户看到之前找出来。红队报告越厚，睡觉越踏实。',
    },
    'tech.cap.multimodal': {
      name: '多模态',
      desc: '让 agent 能看图、听音、读视频。客户发来一张白板照片，你不用再问「这是什么」。',
    },
    'tech.cap.orchestration': {
      name: '多 Agent 编排',
      desc: '把一条流程拆给几个 agent，规定谁交作业、谁验收、谁背锅。产线开始像产线。',
    },
    'tech.cap.ownModel': {
      name: '自研小模型',
      desc: '不再完全替模型厂商打工。训练很贵，失败很难看，但成功之后 token 账单会安静很多。',
    },
    'tech.cap.agiLab': {
      name: 'AGI 实验室',
      desc: '一间不对外挂牌的实验室。你不再解释自己在做什么，只偶尔解释为什么还没做成。',
    },
  };

  return { lines, nodes };
});
