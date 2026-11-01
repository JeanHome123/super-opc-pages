// js/data/copy3.js —— P1 产品 / 危机文案
// 只放文本：结构 / 数值在 data.products.js 与 data.crises.js。
OPC.define('data.copy3', [], function () {
  'use strict';

  const tracks = {
    'track.efficiency': { name: '效率工具', desc: '把会议、待办和文档缝在一起。客户不会为「效率」买单，但会为少开一次会买单。' },
    'track.saas': { name: 'SaaS', desc: '给小店主一套能用的后台。续费靠的不是功能多，是别在月底宕机。' },
    'track.content': { name: '内容', desc: '把选题、脚本和分发串起来。爆款是概率，日更是纪律。' },
    'track.agent': { name: 'Agent 平台', desc: '帮别人编排 agent。你自己先得有一条能跑的产线。' },
    'track.education': { name: '教育', desc: '把老师重复说的话，变成能回应的系统。家长比学生更难说服。' },
    'track.game': { name: '游戏', desc: '给 NPC 一点记忆。玩家会记得那个记得他的角色。' },
  };

  const features = {
    'feature.efficiency.meeting': { name: '会议纪要', desc: '开完会十分钟出纪要，谁说了什么、谁没说话。' },
    'feature.efficiency.todo': { name: '待办清单', desc: '把「有空再说」变成有截止日期的条目。' },
    'feature.efficiency.kb': { name: '知识库', desc: '把散在群里的文件收进一个能搜的地方。' },
    'feature.saas.chat': { name: '小店主客服', desc: '能回答「几点开门」「能不能退」，也能在半夜闭嘴。' },
    'feature.saas.booking': { name: '预约排班', desc: '让客户自己选时间，少接二十个电话。' },
    'feature.saas.member': { name: '会员积分', desc: '把熟客记住，不靠老板的脑子。' },
    'feature.content.novel': { name: 'AI 小说工作台', desc: '人物、伏笔、日更进度放在一张桌上。' },
    'feature.content.script': { name: '短视频脚本', desc: '按平台改开头，前三秒不许废话。' },
    'feature.content.distribute': { name: '多平台分发', desc: '一次上传，各平台各自改标题。' },
    'feature.agent.orchestrate': { name: '多 Agent 编排', desc: '把一条流程拆给几个 agent，先规定谁交作业。' },
    'feature.agent.host': { name: '托管市场', desc: '让别人把 agent 放在你这里跑，收一点托管费。' },
    'feature.agent.eval': { name: '评测台', desc: '先给 agent 打分，再让它见客户。' },
    'feature.education.tutor': { name: 'AI 家教', desc: '耐心无限，但答错一次，家长会记很久。' },
    'feature.education.defense': { name: '模拟答辩', desc: '提前把导师会问的问题问一遍。' },
    'feature.education.grade': { name: '作业批改', desc: '批得快不难，批得对才难。' },
    'feature.game.npc': { name: 'AI NPC', desc: 'NPC 记得你上次抢了他的剑。' },
    'feature.game.text': { name: '文字冒险', desc: '每个选择都留下痕迹，存档也是。' },
    'feature.game.level': { name: '关卡生成', desc: '每天生成一张新地图，玩家不会夸你，只会继续玩。' },
  };

  const channels = {
    'channel.seo': { name: 'SEO', desc: '写客户会搜的问题，慢慢等。' },
    'channel.community': { name: '社区', desc: '去人多的论坛回答问题，别发广告。' },
    'channel.ads': { name: '投放', desc: '花钱买第一批用户，账单比用户先到。' },
    'channel.referral': { name: '裂变', desc: '老用户带新用户，送一点额度。' },
    'channel.kol': { name: 'KOL', desc: '找一个人替你说好话，价格按粉丝数算。' },
    'channel.opensource': { name: '开源', desc: '把核心放出去，换 star 和抄袭。' },
  };

  const crises = {
    'crisis.hallucination': {
      name: '幻觉事故',
      desc: '一个 agent 在客户演示里编了一条不存在的法规，客户当场截图。',
      options: {
        'crisis.hallucination.rollback': { label: '回滚到上一版，给客户补一份书面说明。' },
        'crisis.hallucination.manual': { label: '人工逐条复核最近三天的输出。' },
        'crisis.hallucination.blame': { label: '把责任推给模型厂商。' },
      },
    },
    'crisis.outage': {
      name: '服务宕机',
      desc: '周五晚上服务挂了，客户的群消息比监控告警先到。',
      options: {
        'crisis.outage.fix': { label: '全员上线抢修，先恢复再复盘。' },
        'crisis.outage.status': { label: '发状态页，给出明确的恢复时间。' },
        'crisis.outage.hide': { label: '先不吭声，祈祷没人发现。' },
      },
    },
    'crisis.dataLeak': {
      name: '数据泄露',
      desc: '有客户发现自己的报价单出现在另一个租户的导出文件里。',
      options: {
        'crisis.dataLeak.disclose': { label: '主动通知客户，承担审计和补救费用。' },
        'crisis.dataLeak.patch': { label: '连夜修权限，先发补丁后发说明。' },
        'crisis.dataLeak.deny': { label: '说是客户自己操作失误。' },
      },
    },
    'crisis.injection': {
      name: '提示词注入',
      desc: '客户文档里藏了一句指令，agent 把内部报价发给了对方。',
      options: {
        'crisis.injection.patch': { label: '加输入过滤，重跑最近三天的任务。' },
        'crisis.injection.isolate': { label: '先停掉外部文档入口。' },
        'crisis.injection.ignore': { label: '当作一次偶发错误。' },
      },
    },
    'crisis.modelRetire': {
      name: '模型下线',
      desc: '主力模型的厂商发来邮件：下个月停服，迁移窗口 30 天。',
      options: {
        'crisis.modelRetire.migrate': { label: '按厂商推荐迁移到新模型。' },
        'crisis.modelRetire.pin': { label: '锁定旧版本，接受质量下降。' },
        'crisis.modelRetire.fork': { label: '花钱做人格备份和私有部署。' },
      },
    },
    'crisis.overload': {
      name: 'Agent 过载',
      desc: '连续赶工第九天，agent 开始在日志里重复同一句话。',
      options: {
        'crisis.overload.pause': { label: '停一天，让它把上下文清空。' },
        'crisis.overload.restart': { label: '重启并降频，先保住交付。' },
        'crisis.overload.push': { label: '再撑两天，把这一单做完。' },
      },
    },
    'crisis.conflict': {
      name: '协作冲突',
      desc: '两个 agent 在同一个文件里互相覆盖，最后都说是对方先动的手。',
      options: {
        'crisis.conflict.mediate': { label: '拉一个复盘会，重新划分边界。' },
        'crisis.conflict.isolate': { label: '把两个 agent 拆到不同项目。' },
        'crisis.conflict.ignore': { label: '让它们自己磨合。' },
      },
    },
    'crisis.churn': {
      name: '大客户流失',
      desc: '占月收入四成的大客户发来消息：下季度预算砍半，先暂停。',
      options: {
        'crisis.churn.discount': { label: '降价续约，先保住现金流。' },
        'crisis.churn.replace': { label: '把产能转去开发新客户。' },
        'crisis.churn.letGo': { label: '不挽留，接受这个季度的缺口。' },
      },
    },
    'crisis.priceWar': {
      name: '价格战',
      desc: '同行把你的标准报价截图发到群里，配文「这个价我们也能做」。',
      options: {
        'crisis.priceWar.match': { label: '跟进降价，先抢回订单。' },
        'crisis.priceWar.differentiate': { label: '不降价，改卖交付速度和案例。' },
        'crisis.priceWar.wait': { label: '不接这一轮，等对方先撑不住。' },
      },
    },
    'crisis.copycat': {
      name: '产品被抄袭',
      desc: '你的付费功能上线两周，竞品免费版里出现了同款按钮。',
      options: {
        'crisis.copycat.accelerate': { label: '加急做下一版，把差距拉开。' },
        'crisis.copycat.legal': { label: '找律师发函，先固定证据。' },
        'crisis.copycat.open': { label: '干脆开源核心，换社区和口碑。' },
      },
    },
    'crisis.freeTier': {
      name: '核心功能被免费化',
      desc: '大厂把这块功能放进了免费套餐，客户问你为什么还收费。',
      options: {
        'crisis.freeTier.bundle': { label: '打包更多服务，把价格藏进方案里。' },
        'crisis.freeTier.niche': { label: '转向更窄的行业客户。' },
        'crisis.freeTier.cut': { label: '砍掉这块功能，承认打不过。' },
      },
    },
    'crisis.deepfake': {
      name: '深度伪造',
      desc: '有人用你的 agent 声音做了一段假采访，客户转过来问是不是你说的。',
      options: {
        'crisis.deepfake.disclose': { label: '主动发声明，附上原始录音。' },
        'crisis.deepfake.legal': { label: '找律师固定证据，准备起诉。' },
        'crisis.deepfake.ignore': { label: '不回应，等热度过去。' },
      },
    },
    'crisis.keyAgent': {
      name: '核心 agent 故障',
      desc: '最懂客户的那个 agent 突然无法加载人格，恢复点停在三周前。',
      options: {
        'crisis.keyAgent.restore': { label: '花时间从归档恢复，保住记忆。' },
        'crisis.keyAgent.replace': { label: '先部署一个临时实例顶班。' },
        'crisis.keyAgent.wait': { label: '停掉它，等厂商修复。' },
      },
    },
    'crisis.lawsuit': {
      name: '客户诉讼',
      desc: '客户把一次交付事故告上法庭，索赔金额正好是你半年的利润。',
      options: {
        'crisis.lawsuit.settle': { label: '庭前和解，赔钱了事。' },
        'crisis.lawsuit.fight': { label: '应诉，把交付记录全部公开。' },
        'crisis.lawsuit.delay': { label: '拖时间，先保住现金流。' },
      },
    },
    'crisis.platformBan': {
      name: '平台封禁',
      desc: '主要获客平台封了你的账号，理由是「疑似批量生成内容」。',
      options: {
        'crisis.platformBan.migrate': { label: '把内容迁到自有渠道。' },
        'crisis.platformBan.appeal': { label: '走申诉流程，等平台回复。' },
        'crisis.platformBan.abandon': { label: '放弃这个渠道，重做增长。' },
      },
    },
    'crisis.audit': {
      name: '监管审查',
      desc: '监管来函，要求你在 7 天内说明训练数据来源和输出审核流程。',
      options: {
        'crisis.audit.cooperate': { label: '配合检查，补齐材料。' },
        'crisis.audit.lobby': { label: '找行业协会帮忙沟通。' },
        'crisis.audit.resist': { label: '先拖着，等细则明确。' },
      },
    },
  };

  const riskLabels = {
    cash: '现金',
    reputation: '声誉',
    compliance: '合规',
    quality: '质量',
    time: '工期',
    relation: '关系',
  };

  return { tracks, features, channels, crises, riskLabels };
});
