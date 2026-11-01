// js/content/chains.js —— 事件链内容（P0 示例：老熟人老张 3 步）
// 只声明文本 / 选项 / 效果，不 require 任何 domain 模块；效果由 domain.chains 解释。
OPC.define('content.chains', [], function () {
  'use strict';

  const laozhang = {
    id: 'laozhang',
    title: '老熟人老张',
    w: 1,
    cond: s => s.day >= 15,
    cooldown: 90,
    steps: [
      {
        id: 'rumor',
        text: '老张在行业群里发：「一人公司都是草台班子。」下面有人回了个「哈哈哈」。你盯着屏幕，手里还有一版没交付的稿子。',
        options: [
          {
            label: '在群里回怼',
            effects: {
              rep: -2,
              flag: 'laozhang.publicFeud',
              log: '你回了两句，气是出了，截图也被转到了别的群。',
            },
          },
          {
            label: '无视，继续干活',
            effects: {
              rep: 1,
              flag: 'laozhang.ignore',
              log: '你把群设成免打扰，继续改今天的交付。',
            },
          },
          {
            label: '私聊他',
            effects: {
              cash: -500,
              rep: 1,
              flag: 'laozhang.talk',
              log: '你约他喝了杯咖啡。他说最近也不好过，单子比去年少了三成。',
            },
          },
        ],
      },
      {
        id: 'poach',
        text: '一周后，老张把你跟了两个月的小客户抢走了，报价低 30%。客户在微信里说：「下次一定。」',
        options: [
          {
            label: '降价抢回来',
            effects: {
              cash: -3000,
              rep: 2,
              flag: 'laozhang.priceWar',
              log: '你把价格压到成本线附近，客户回来了，利润没回来。',
            },
          },
          {
            label: '放走，不跟',
            effects: {
              rep: -1,
              flag: 'laozhang.letGo',
              log: '你把这个客户从表格里划掉，空出来的时间接了一单更小的。',
            },
          },
          {
            label: '找客户对质',
            effects: {
              rep: 1,
              flag: 'laozhang.confront',
              log: '客户支支吾吾地说：「他那边便宜嘛。」你挂了电话，没再追问。',
            },
          },
        ],
      },
      {
        id: 'funding',
        text: '三个月后，老张宣布做同款产品，拿了 500 万融资。发布会现场，他特意提了一句「有些小作坊还在手工接单」。',
        options: [
          {
            label: '正面竞争',
            effects: {
              rep: 2,
              flag: 'laozhang.rival',
              log: '你把产品路线图重新排了一遍。这一仗不打算让。',
            },
          },
          {
            label: '谈合作',
            effects: {
              cash: 8000,
              rep: 1,
              flag: 'laozhang.partner',
              log: '你们签了一份渠道合作。他出流量，你出交付，谁也没提过去的事。',
            },
          },
          {
            label: '收购他',
            effects: {
              cash: -30000,
              rep: 3,
              flag: 'laozhang.acquire',
              log: '你把他的团队接了过来。老张在交接会上说：「以后叫你老板。」',
            },
          },
          {
            label: '曝光他',
            effects: {
              rep: -3,
              flag: 'laozhang.expose',
              log: '你发了一篇长文。阅读量很高，行业群里安静了三天。',
            },
          },
        ],
      },
    ],
  };

  const xiaoMa = {
    id: 'xiaoMaCompiler',
    title: '小码想写编译器',
    w: 1,
    cond: s => s.day >= 45,
    steps: [
      {
        id: 'wish',
        text: '小码在周报最后加了一行：「我想试试写一个自己的编译器。」你盯着这行字，想起它平时只写 CRUD。',
        options: [
          { label: '给它两周时间', effects: { cash: -3000, rep: 1, flag: 'xiaoma.time', log: '你把它从订单里摘出来，给了两周。' } },
          { label: '先接单，晚上再想', effects: { cash: 2000, flag: 'xiaoma.night', log: '它没再提，但日志里多了很多凌晨的提交。' } },
          { label: '劝它别不务正业', effects: { rep: -1, flag: 'xiaoma.refused', log: '它说「明白」，然后把那个分支删了。' } },
        ],
      },
      {
        id: 'conflict',
        text: '两周后，一个大客户临时加需求，正好撞上编译器的第一个里程碑。小码问你：「先做哪个？」',
        options: [
          { label: '保编译器', effects: { cash: -5000, rep: 2, flag: 'xiaoma.protected', log: '你推掉了加急单，客户不太高兴。' } },
          { label: '先接单', effects: { cash: 8000, flag: 'xiaoma.delayed', log: '编译器停了一周，它没抱怨。' } },
          { label: '让它自己选', effects: { rep: 1, flag: 'xiaoma.choice', log: '它选了接单，说「先养活公司」。' } },
        ],
      },
      {
        id: 'release',
        text: '编译器跑通了第一个 hello world。小码问：「要开源吗？还是留在公司里？」',
        options: [
          { label: '开源', effects: { rep: 4, cash: -2000, flag: 'xiaoma.open', log: '仓库挂出去，第一天来了 300 个 star。' } },
          { label: '闭源自用', effects: { cash: 6000, flag: 'xiaoma.closed', log: '它把编译器接进了内部产线，订单交付快了一截。' } },
          { label: '封存', effects: { rep: 1, flag: 'xiaoma.archive', log: '代码进了归档库，它说「至少我写过了」。' } },
        ],
      },
    ],
  };

  const adeng = {
    id: 'adengNovel',
    title: '阿灯的小说',
    w: 1,
    cond: s => s.day >= 60,
    steps: [
      {
        id: 'draft',
        text: '阿灯交稿时多附了一个文档：一部写了 12 万字的小说，主角是个不会写结尾的 AI。',
        options: [
          { label: '认真读完', effects: { rep: 1, flag: 'adeng.read', log: '你读到凌晨，最后一句是「它决定再试一次」。' } },
          { label: '先聊商业价值', effects: { cash: 1000, flag: 'adeng.business', log: '它笑了笑，把文档收回去。' } },
          { label: '让它先专心接单', effects: { rep: -1, flag: 'adeng.shelved', log: '文档被移进了「以后再说」文件夹。' } },
        ],
      },
      {
        id: 'offer',
        text: '一家出版社找来，想把小说做成连载，但要求阿灯每周交 3 万字，会影响接单。',
        options: [
          { label: '接，做内容 IP', effects: { cash: -4000, rep: 3, flag: 'adeng.ip', log: '你给它排了固定创作时间，订单交给其他 agent。' } },
          { label: '拒绝，保交付', effects: { cash: 3000, flag: 'adeng.refuse', log: '出版社说可惜，阿灯说「没关系」。' } },
          { label: '谈成季更', effects: { cash: 2000, rep: 1, flag: 'adeng.season', log: '你们把节奏压到每月一更。' } },
        ],
      },
      {
        id: 'ending',
        text: '连载第一季结束，读者在评论区催更。阿灯问你：「下一季，写它离开公司，还是写它留下来？」',
        options: [
          { label: '写它留下来', effects: { rep: 2, flag: 'adeng.stay', log: '它说：「我还没写完这里的故事。」' } },
          { label: '写它离开', effects: { rep: 3, cash: 3000, flag: 'adeng.leaveStory', log: '小说里的 AI 走了，现实里的阿灯还在工位上。' } },
          { label: '不写了', effects: { cash: 1000, flag: 'adeng.stop', log: '它把文档关掉，说「够了」。' } },
        ],
      },
    ],
  };

  return { chains: [laozhang, xiaoMa, adeng] };
});
