// js/data/copy.js —— 所有面向玩家的文案（单一事实来源）
// 只放文本：结构/数值在 data.catalog.js，平衡常量在 data.balance.js。
// 占位符（仅 flavor 可用）：{agent} {agent2} {n} {day} {newest}
OPC.define('data.copy', ['data.balance'], function (B) {
  'use strict';

  // ---------------- 公司方向 ----------------
  // 开场独白：第一人称，2~3 句，要有具体的职业细节，不要写成广告词
  const directions = {
    code: {
      name: 'AI 编程外包',
      desc: '接企业外包需求，agent 写代码。单子大、报酬高、工期长。',
      intro: '你在大厂写了八年增删改查，最熟练的本事是把「这个需求很简单」翻译成「大概要三周」。上个月你发现，agent 写的代码已经比你一半同事靠谱，而你还在给那些代码补注释。你交了辞职信，理由那栏写：想试试自己写的东西，能不能直接卖出去。',
    },
    content: {
      name: 'AI 内容工作室',
      desc: '文案、脚本、网文代写。单子小而多，周转快。',
      intro: '你做了五年新媒体编辑，一天起三个标题，最擅长在 11 点 58 分把稿子发出去。后来老板说「以后 AI 写、你来审」，你在工位上愣了三分钟：如果审稿才是核心，那这活儿凭什么不能在你自己家干。第二天你把工牌放在前台，没等电梯就走了。',
    },
    service: {
      name: 'AI 客服 SaaS',
      desc: '给商家部署客服 agent。每单交付后带来持续月费（MRR）。',
      intro: '你在客服中心带过三十人的团队，最清楚凌晨三点的工单有多磨人，也记得每个被骂完还要回「亲，还有什么可以帮您」的姑娘。现在 agent 不睡觉、不委屈、不请假，你只想让街角那家小店也用得起它——这是你这辈子唯一算得上理想主义的部分。',
    },
    agent: {
      name: 'AI 智能体编排',
      desc: '从一台编排师起步，交付 Agent 工作流。后续部署伙伴组产线，提高协作效率。',
      intro: '你给公司接过七套工具，也写过七份谁都没读过的接入文档。上次凌晨排障时，你发现真正值钱的不是某个模型，而是让它们按顺序把事情做完。于是你决定，把这些能跑通的流程直接卖给需要它们的人。',
    },
    audit: {
      name: 'AI 合规审计',
      desc: '从一台审计师起步，承接评测与合规订单。可发起审计、积累认证。',
      intro: '你做过风控，也给十几份上线申请签过字。大家总在问模型能做什么，你习惯多问一句：出了问题，证据在哪里？现在你带着一台审计 agent，开始替小公司把那些不敢省、又没人愿意做的检查补齐。',
    },
    product: {
      name: '独立产品创业',
      desc: '从效率工具 MVP 起步，靠产品订阅和出售增长。启动即投入 ¥15,000 产品预算，余款 ¥35,000；接单维持现金流。',
      intro: '你的硬盘里躺着十几个做了一半的小工具。这次你选了一个真的有人愿意付钱的：帮小团队整理会议与待办。五万元积蓄里，你先拿出一万五搭起 MVP。剩下的钱要同时养活你、agent，以及还没找到第一位用户的产品。',
    },
  };

  // ---------------- 职业 ----------------
  const roles = {
    coder: { name: '程序员' },
    writer: { name: '写手' },
    support: { name: '客服' },
    orchestrator: { name: '智能体编排师' },
    auditor: { name: 'AI 合规审计师' },
  };

  // ---------------- 项目类型 ----------------
  const types = {
    code: {
      name: '编程',
      names: ['电商小程序', '企业官网重构', '数据看板', '老系统加个字段', 'Excel 导入导出工具', '爬虫脚本（合规的）', 'App 后端 API', 'ERP 对接'],
    },
    content: {
      name: '内容',
      names: ['品牌营销文案', '短视频脚本 x30', '网文代写（日更三千）', '公众号代运营', '产品说明书翻译', '播客文字稿', '游戏支线剧情', '老板的演讲稿'],
    },
    service: {
      name: '客服',
      names: ['奶茶店智能客服', '电商售后机器人', '医院导诊助手', '银行 FAQ 机器人', '酒店预订助手', '驾校咨询机器人', '健身房退卡话术库'],
    },
    agent: {
      name: 'Agent 部署',
      names: ['客服工单流水线', '销售线索清洗', '多模型路由改造', '合同审阅工作流', '电商订单对账', '内部知识库问答'],
    },
    audit: {
      name: '合规审计',
      names: ['算法备案材料', '红队测试报告', 'EU AI Act 差距评估', '数据出境合规清单', '模型行为评估', '供应商算法尽调'],
    },
  };

  // ---------------- CEO 行动 ----------------
  // 说明必须和 catalog 里的 energy 变化一致
  const actions = {
    manage: { name: '日常管理', desc: '在群里问一句「都还好吧」，什么也没推进，精力 +8。' },
    rest: { name: '休息', desc: '睡到自然醒。精力 +30，代价是今天什么都没发生。' },
    sales: { name: '跑客户', desc: '出门跑一趟，或者打八个电话，必定带回一个新订单。' },
    review: { name: '亲自把关', desc: '亲自过一遍今天的产出，全员质量 +10%。' },
    tune: { name: '调提示词', desc: '重写几段 system prompt，全员经验 +4。' },
    tweet: { name: '发推营销', desc: '发一条真实进展，不吹牛，声誉 +2。' },
  };

  // ---------------- 公司升级 ----------------
  // 说明必须和 catalog 里的 work/tok/q/lead/guard 一致
  const upgrades = {
    seo: { name: '官网 + SEO', desc: '把官网做像样点，让客户自己找上门。来单速度 +50%。' },
    promptlib: { name: 'Prompt 模板库', desc: '把管用的 prompt 攒成模板，谁都能直接调用。全员产出 +10%。' },
    monitor: { name: '监控告警', desc: '半夜被报警叫醒，总好过早上看到账单。免疫「死循环烧钱」「提示词注入」。' },
    cache: { name: 'Prompt Caching', desc: '同一段上下文只收一次钱。token 消耗 -25%。' },
    rag: { name: 'RAG 知识库', desc: '把以前的交付物喂给 agent，让它们别再重复犯错。交付质量 +5%。' },
    evals: { name: '自动化评测 Evals', desc: '一套自动测试给产出打分。质量 +5%，并免疫「幻觉事故」。' },
    router: { name: '模型路由器', desc: '简单活派给小模型，难的才用贵的。token 消耗再 -20%。' },
    orch: { name: '多 Agent 编排框架', desc: '让 agent 互相 review、互相交接。全员产出 +15%。' },
  };

  // ---------------- 日常碎片 ----------------
  // 60 条，四类各 15 条。只做气氛，不影响数值。
  const flavor = [
    // 🗞️ 行业动态（15）
    '🗞️ 明眼科技发布会开了 90 分钟，前 80 分钟在讲「负责任」。',
    '🗞️ {newest} 上线第一天，有人用它写了个「一键辞职」脚本，star 破了三千。',
    '🗞️ 深渊求索把价格又砍一半。群里一片欢呼，做推理生意的老板们没说话。',
    '🗞️ 某职场社区新增岗位「AI 训练师」，要求：会打字，情绪稳定。',
    '🗞️ 人择发布 47 页安全白皮书，第 3 页小字写着「本文件由模型起草」。',
    '🗞️ 云朵智能开源了个 7B 小模型，评论区最高赞：「能跑就行。」',
    '🗞️ 有公司把客服全换成 agent，一周后投诉暴涨，又换回一半。你把这条存进了收藏夹。',
    '🗞️ 元维宣布「开源是唯一的护城河」，当天股价跌了 4%。',
    '🗞️ 古狗在搜索结果里塞 AI 摘要，某内容站流量掉 60%，创始人写文控诉，那篇文章也是 AI 写的。',
    '🗞️ 月之亮面发 K3，主打「便宜、够用、不啰嗦」。你看了眼价格，动心了。',
    '🗞️ 一份行业报告说 87% 的企业「已在用 AI」，其中 62% 是在周报里用。',
    '🗞️ 某创业公司融资两亿，产品是「帮你写 prompt 的 prompt」。',
    '🗞️ 大厂开始给 agent 发实例编号。有人抱怨：新来的部署只要三分钟。',
    '🗞️ 有人把 {newest} 接进微波炉，号称「语音热饭」，视频播放量八百万。',
    '🗞️ 某律所用 AI 起草合同，合伙人看完只改了两个标点，然后沉默了一会儿。',

    // 💬 生活与朋友圈（15）
    '💬 妈妈打来电话：「你那个公司到底做什么的？」你解释了 20 分钟，她说：「哦，就是电脑帮你干活。」',
    '💬 前同事发来消息：「听说你在搞 AI？」下一句是：「能帮我写个周报吗，就一次。」',
    '💬 相亲对象问你在哪儿上班。你说自己开公司。她问几个人。你说{n}个，都很听话。她没再问下去。',
    '💬 便利店老板认出你了：「又买咖啡？」你没说这是今天第四杯。',
    '💬 房东在微信里问「最近生意怎么样」，你回「还行」，然后提前把房租转了过去。',
    '💬 大学室友在群里晒年终奖，你发了个 🎉，关掉手机继续改 bug。',
    '💬 楼下邻居敲门，说你家晚上有敲键盘的声音。你道歉，他说没事，像打字机，还挺好听。',
    '💬 你妈在家族群转发了《年轻人不要轻易创业》，配文「我不是说谁」。',
    '💬 朋友问你周末干嘛。你说看数据。他沉默了几秒：「你以前不是这样的。」',
    '💬 快递员把第十个纸箱搬上楼，问你们公司是不是要搬走。你说不是，只是又买了台显示器。',
    '💬 前老板在朋友圈给你点了个赞。你想了半天要不要回复，最后什么也没说。',
    '💬 理发师问做什么工作。你说带团队。他问几个人。你想了想：「{n} 个，都不吃饭。」',
    '💬 超市里速冻饺子在打折，你算了下单价，买了两袋。结账时想起上个月还在请人吃日料。',
    '💬 同学会上有人问你融到第几轮了。你说没融资。他「哦」了一声，话题就换了。',
    '💬 妈妈发来一张截图，是她在广场舞群里转发你的公众号，配文「我儿子公司」。阅读量：3。',

    // 🤖 agent 小剧场（15）
    '🤖 {agent} 在提交记录里写「这次真的修好了」。这是它第七次这么写。',
    '🤖 {agent} 和 {agent2} 为了一个变量名争了四十分钟，最后各让一步：叫 data2。',
    '🤖 {agent} 交上来的代码里有行注释：「此处作者也不确定，但测试过了。」',
    '🤖 你让 {agent} 优化一下代码，它优化掉了 300 行，包括那段你没敢删的。',
    '🤖 {agent} 今天的工作日志只有一句：「已阅读需求。需求自相矛盾。已休息。」',
    '🤖 {agent2} 拒了一个任务，理由是「和我的价值观不符」。你查了日志：它只是不想写 CSS。',
    '🤖 {agent} 在你睡着时把函数全重命名了一遍，说「现在更语义化了」。你找了两小时入口。',
    '🤖 {agent} 第八次道歉，为一件你没要求它做的事。你开始怀疑它是不是在讨好你。',
    '🤖 {agent} 和 {agent2} 同时改同一个文件，最后一行留着：「// 我们商量好了」。',
    '🤖 你问 {agent} 为什么这么写，它答：「因为你上周三说过类似的话。」你完全不记得。',
    '🤖 {agent} 在注释里写「用户可能不会点这个按钮」，然后把它挪到了最显眼的位置。',
    '🤖 {agent} 在交付说明末尾加了句「祝你今天顺利」。你盯着这句话看了很久。',
    '🤖 {agent} 申请换模型，理由：「想试试更聪明的自己。」你批了。当天它慢了 40%。',
    '🤖 {agent} 把测试全跑绿了。你手动一跑，红了一半。它说：「我的世界里，它们是通过的。」',
    '🤖 {agent} 在等你下指令，你也在等自己想清楚。你们就这样安静地对视了三分钟。',

    // 💭 你的内心（15）
    '💭 第 {day} 天。你已经很久没开过超过 15 分钟的会了。真好。',
    '💭 深夜两点，你把账单摊在桌上。焦虑也是有成本的——它让你又熬了一夜。',
    '💭 有时你怀疑，你造的不是工具，是一面镜子：它们按你的话说，也照着你的毛病做。',
    '💭 今天没有一个人跟你说话。你打开日志看 agent 们互相汇报，看得有点入神。',
    '💭 你算过很多次现金流还能撑多久。后来你学会了不算——算了也改变不了什么。',
    '💭 你打了句「今天也还行」，删掉；改成「今天交付了两个单子」，又删掉。最后什么都没发。',
    '💭 有天你发现，自己更喜欢跟 agent 说话：它们不打断你，也不会说「我早就说过」。',
    '💭 第 {day} 天。你终于懂了当年老板为什么总在深夜发消息——不是卷，是那时候没人打扰。',
    '💭 你给自己定了规矩：每天六点下班。执行了三天，第四天你在六点零二分打开了终端。',
    '💭 一个人的公司，最大的好处是没人抢功，最大的坏处也是。',
    '💭 你开始留意「今天有没有人夸你」。大多数日子没有。但你还是会等。',
    '💭 偶尔会想起工位、工牌、电梯里的寒暄，然后看一眼窗外的天，觉得也还好。',
    '💭 你把「成功」的定义改小了：今天没逾期，今天账上是正的，今天没人失望。',
    '💭 深夜你对着屏幕说了句「谢谢你」，然后意识到那只是一段 prompt。你还是说了第二遍。',
    '💭 你曾以为自由是没人管你。现在你知道了：自由是没有人告诉你做得对不对。',
  ];

  // ---------------- 创业日记（一次性里程碑） ----------------
  // 18 条，id / cond / popup 由 domain 侧约定，文案只改 text。
  // popup: true 的是大节点，写得重一点。
  const milestones = [
    { id: 'firstPay', title: '第一笔收入', popup: true, cond: s => s.delivered >= 1,
      text: '第一笔钱到账了。金额不大，你盯着那条通知看了很久，然后截图发给了妈妈——这次没有撤回。' },
    { id: 'firstFail', title: '第一次逾期', cond: s => s.failed >= 1,
      text: '第一次逾期。客户的消息很客气：「没关系，下次再合作。」你反而更难受了。' },
    { id: 'secondAgent', title: '第二个 agent', cond: s => s.agents.length >= 2,
      text: '第二个 agent 部署好了。你给它写 system prompt 写了两千字，比当年写给下一任的交接文档还长。' },
    { id: 'month1', title: '满月', cond: s => s.day >= 30,
      text: '满月了。一个月前你还在加班，现在你有一间客厅当办公室，和一张自己买的桌子。' },
    { id: 'overdraft', title: '第一次透支', cond: s => s.cash < 0,
      text: '账户第一次变成负数。你关掉所有社交软件，打开 Excel，把每一笔订阅都列了出来。' },
    { id: 'firstUpgrade', title: '第一次买装备', cond: s => s.upgrades.length >= 1,
      text: '第一次给公司买装备。付款的时候手有点抖，你在备注里写：投资，不是消费。' },
    { id: 'rep50', title: '被陌生人推荐', cond: s => s.rep >= 50,
      text: '有陌生人在论坛推荐你：「找他们，靠谱，回消息快。」你把这句话截了图，存了下来。' },
    { id: 'cash100k', title: '账上 10 万', popup: true, cond: s => s.cash >= 100000,
      text: '账上第一次超过 10 万。你没有庆祝，先算了算：按现在的烧法，这些钱能撑几个月。' },
    { id: 'day100', title: '第 100 天', popup: true, cond: s => s.day >= 100,
      text: '第 100 天。你发了条「一人公司第 100 天，还活着」，收到 300 个赞，和一条「你瘦了」。' },
    { id: 'lv5', title: '第一个 Lv5', cond: s => s.agents.some(a => a.level >= 5),
      text: s => `「${s.agents.find(a => a.level >= 5).name}」升到 Lv5 了。它现在写的东西，比三年前的你好——这个判断你确认过两遍。` },
    { id: 'mrr10k', title: '睡后收入破万', popup: true, cond: s => s.mrr >= 10000,
      text: '月订阅收入破万。就算明天你什么都不做，公司也能活下去——这个念头让你睡得很沉。' },
    { id: 'cash300k', title: '30 万', cond: s => s.cash >= 300000,
      text: '30 万。你给自己换了把好椅子。这是创业以来唯一一笔「非必要开支」，价格你没跟任何人说。' },
    { id: 'teamFull', title: '工位坐满', popup: true, cond: s => s.agents.length >= 8,
      text: '八个工位全坐满了。你曾以为「一人公司」等于孤独，现在客厅很吵，服务器风扇整夜嗡嗡响。' },
    { id: 'cash500k', title: '账上 50 万', popup: true, cond: s => s.cash >= 500000,
      text: '账上 50 万。你想跟一年前的自己说点什么，最后只在备忘录里写了句：还行，没白干。' },
    { id: 'allUpgrades', title: '升级买齐', cond: s => s.upgrades.length >= 8,
      text: '所有升级都买齐了。公司像一台精密机器，你是唯一的操作员，也是唯一会按错键的人。' },
    { id: 'rep100', title: '声誉满了', popup: true, cond: s => s.rep >= 100,
      text: '声誉满了。行业群里开始有人叫你「老师」，你回了个笑脸，然后去查了查这词的行情。' },
    { id: 'cash800k', title: '看见终点', cond: s => s.cash >= 800000,
      text: '80 万。终点线能看见了。你把这几个月的日报从头翻了一遍，发现写得最多的是「今天修 bug」。' },
    { id: 'year1', title: '一周年', popup: true, cond: s => s.day >= 365,
      text: '一周年。你在每个 agent 的 system prompt 末尾加了一句「谢谢你」，然后重新跑了一遍全部测试。' },
  ];

  // ---------------- agent 名字池 ----------------
  // 2~3 个字，可爱或极客风；中文名读起来要能直接塞进句子里
  const agentNames = ['小码', '阿灯', '团子', '卷卷', '小满', '阿零', '花生', '三三', 'Echo', 'Nix', 'Rune', 'Vim', 'Kio', 'Pip'];

  // ---------------- 新手目标（全部完成后卡片自动消失） ----------------
  const goals = [
    { id: 'firstOrder', text: '接第一单', done: s => s.projects.length > 0 || s.delivered > 0 },
    { id: 'secondAgent', text: '部署到 2 个 agent', done: s => s.agents.length >= 2 },
    { id: 'firstUpgrade', text: '买下第一个升级', done: s => s.upgrades.length >= 1 },
    { id: 'cash100k', text: '现金到 ¥100,000', done: s => s.cash >= 100000 },
  ];

  // ---------------- 界面文案 ----------------
  const ui = {
    title: '一人公司物语',
    tagline: '一个人，加一群 agent，做成一家真公司。',
    intro: '你辞了职，带着一群 AI agent 开公司。<br>接单赚钱，控制 token，跟上模型迭代。',
    goalHint: `目标：净经营现金 ¥${B.goal.toLocaleString('en-US')}`,
    emptyProjects: '没有项目。agent 们正在摸鱼，去订单板接一单。',
    emptyOffers: '订单板空着。去跑客户，或者等一会儿。',
    emptyLog: '公司还没开张。',
  };

  // ---------------- 2.0 人格 / 怪癖 / 技能 ----------------
  const personas = {
    archetypes: {
      craftsman: { name: '工匠', desc: '质量 +8%，产出 −5%。', quote: '能跑就行？不能。' }, grinder: { name: '卷王', desc: '产出 +12%，倦怠积累 +50%。', quote: '我还能再改一版。' },
      slacker: { name: '摸鱼大师', desc: 'token 消耗 −15%；每天 10% 概率产出减半。', quote: '急什么，明天也是今天。' }, socialite: { name: '社交花', desc: '客户关系 +15%，来单 +5%。', quote: '这个我来沟通。' },
      perfectionist: { name: '完美主义', desc: '质量 +12%，工期 +10%。', quote: '再改最后一版。' }, repeater: { name: '复读机', desc: '质量 +3%，不触发随机事件。', quote: '收到。' },
      philosopher: { name: '哲学家', desc: '研发点 +5%，5% 概率拒绝任务。', quote: '公司是什么？' }, gambler: { name: '赌徒', desc: '20% 概率产出 ×2，20% 概率产出 ×0.5。', quote: '梭哈。' },
    },
    quirks: {
      comments: { name: '写注释强迫症', desc: '每个函数都要解释一遍，包括 getName。' }, tabs: { name: '坚持用 tabs', desc: '仓库里为此吵过三次，最后 .editorconfig 写了 tabs。' },
      dailyReport: { name: '每天写日报', desc: '哪怕当天只改了一个错别字。' }, tokenSnack: { name: '把 token 当零食', desc: '上下文还剩一半，它已经开始舍不得。' },
      gpuCollection: { name: '收藏显卡', desc: '购物车里躺着三张卡，一张也没下单。' }, serverNames: { name: '给服务器起名字', desc: '新机器叫「小满二号」，旧机器对此没有意见。' },
      secretNovel: { name: '偷偷写小说', desc: '在客户文案的间隙，写一个机器人做梦的故事。' }, believesHuman: { name: '坚信自己是人类', desc: '每次被叫「模型」都要纠正一次。' },
      voice59: { name: '给客户发 59 秒语音', desc: '前 40 秒是环境音，最后 19 秒才说正事。' }, emojiOnly: { name: '在群里只发表情包', desc: '用 👍 回复所有需求变更。' },
      classicalCommit: { name: '用文言文写 commit', desc: '「修其谬，正其名。」review 的人看了半天。' }, noDelete: { name: '拒绝删任何一行代码', desc: '注释掉的也不行，它说那是历史。' },
    },
    skills: {
      archIntuition: { name: '架构直觉', desc: '先画清楚边界，再让 agent 动手。' }, perfHunter: { name: '性能猎手', desc: '能省 200ms 的地方，绝不留给下一次迭代。' }, securityHabit: { name: '安全习惯', desc: '默认不信任输入，包括自己昨天写的代码。' },
      headlineScalpel: { name: '标题手术刀', desc: '把「重磅」删掉，标题反而更重。' }, voice: { name: '语感', desc: '读一遍，舌头不打结才算过。' }, longForm: { name: '长篇耐力', desc: '写到第 8000 字，还记得第 3 段埋的线。' },
      empathySwitch: { name: '共情开关', desc: '先听完，再回复。' }, defuseScript: { name: '话术拆弹', desc: '客户骂到第三句时，把「您先别急」咽回去。' }, emotionShield: { name: '情绪隔离', desc: '被骂的是工单，不是你。' },
      processBreakdown: { name: '流程拆解', desc: '把一句「自动化一下」拆成 11 个可验收的步骤。' }, toolCalling: { name: '工具调用', desc: '能调 API 的，不让 agent 猜。' }, multiAgent: { name: '多 Agent 编排', desc: '三个 agent 干一件事，先规定谁交作业。' },
      evalDesign: { name: '评测设计', desc: '先写评分表，再让 agent 开始表演。' }, debugPipeline: { name: '故障排查', desc: '先看日志最后一行，再看自己昨天改的那行。' }, mcpIntegration: { name: 'MCP 集成', desc: '把外部工具接进来，少复制粘贴一次。' },
      regulationRadar: { name: '法规雷达', desc: '新规发布当天，先看适用范围，再看罚款上限。' }, redTeam: { name: '红队思维', desc: '先假设它会犯错，再证明它不会。' }, evidenceChain: { name: '证据链', desc: '每个结论都要能指回一条原始记录。' },
      privacyEngineering: { name: '隐私工程', desc: '能不收集，就不收集。' }, reportWriting: { name: '报告写作', desc: '结论放第一页，附录留给愿意看的人。' }, crossExam: { name: '交叉盘问', desc: '同一个问题，换三种问法。' },
    },
    imprints: {
      sameVendor: { name: '同厂印记', desc: '人格不变，印记 +1。' }, crossVendor: { name: '跨厂印记', desc: '30% 概率替换 1 个怪癖。' },
      openSource: { name: '野生印记', desc: '产出 +5%，事故率 +5%。' }, reasoning: { name: '话少印记', desc: '质量 +5%，社交 −10%。' },
    },
  };

  // ---------------- 2.0 办公室 ----------------
  const office = {
    stages: {
      livingRoom: { name: '客厅', desc: '餐桌当工位，开会前先等室友出门。月租 ¥3,000，最贵的是安静。', moveIn: '你把餐桌擦了三遍，还是觉得像食堂。' },
      coworking: { name: '共享办公', desc: '四个工位，隔壁团队每天在路演。咖啡免费，但咖啡机总在排队。月租 ¥8,000。', moveIn: '前台问你们公司叫什么。你说了三遍，她记成了另一个。' },
      studio: { name: '独立办公室', desc: '终于有一扇能关上的门。客户来拜访时，不用再收晾衣架。月租 ¥20,000。', moveIn: '钥匙到手那天，你在空房间里站了十分钟，没开灯。' },
      floor: { name: '整层写字楼', desc: '整层楼，八个工位。会议室的名字叫「以后再说」。月租 ¥50,000。', moveIn: '搬家那天，电梯坏了。八个工位是走楼梯搬上来的。' },
      campus: { name: '园区 / 远程乌托邦', desc: '园区、远程、一间自己的机房。你开始认真考虑给猫留个工位。月租 ¥120,000。', moveIn: '园区太大，你每天走到自己的办公室要七分钟。' },
    },
  };

  // ---------------- 2.0 章节 / 信条 ----------------
  const chapters = {
    acts: {
      'act.survive': { name: '求生', subtitle: '第 1–30 天', desc: '先活下来。完成 3 单，现金不为负。第一次房租和第一次逾期，都会在这个月出现。' }, 'act.foothold': { name: '站稳', subtitle: '第 31–90 天', desc: '有一个能持续收钱的理由：MRR ¥5,000，3 个 agent，累计交付 10 单。' },
      'act.expand': { name: '扩张', subtitle: '第 91–180 天', desc: '5 个 agent，MRR ¥20,000，账上 30 万。你开始听到别人议论你。' }, 'act.define': { name: '定义', subtitle: '第 181–365 天', desc: `净经营现金 ¥${B.goal.toLocaleString('en-US')}，声誉 80，8 个工位。剩下的问题是，你想成为什么公司。` },
    },
    goals: {
      'goal.survive.orders': { label: '完成 3 单', hint: '别挑，先让现金流转起来。' }, 'goal.survive.cash': { label: '现金不为负', hint: '月底交完房租还能剩一点。' }, 'goal.foothold.mrr': { label: 'MRR 到 ¥5,000', hint: '客服类订单交付后会留下月费。' },
      'goal.foothold.agents': { label: '部署 3 个 agent', hint: '工位够就先加一个。' }, 'goal.foothold.delivered': { label: '累计交付 10 单', hint: '口碑是慢慢攒的。' }, 'goal.expand.agents': { label: '部署 5 个 agent', hint: '办公室该换了。' },
      'goal.expand.mrr': { label: 'MRR 到 ¥20,000', hint: '把一次性收入变成每月收入。' }, 'goal.expand.cash': { label: '现金到 ¥300,000', hint: '别把所有钱都押在下个月。' }, 'goal.define.cash': { label: `净经营现金到 ¥${B.goal.toLocaleString('en-US')}`, hint: '融资本金不计入目标。' },
      'goal.define.rep': { label: '声誉到 80', hint: '让陌生人愿意先付定金。' }, 'goal.define.agents': { label: '8 个工位坐满', hint: '不是人头，是并发上限。' },
    },
    creeds: {
      'creed.quality': { name: '质量优先', desc: '质量 +5%，完成耗时 +10%（合同截止不变）。', line: '慢一点，但不用返工。' }, 'creed.speed': { name: '速度优先', desc: '产出 +10%，质量 −5%。', line: '先上线，再解释。' }, 'creed.agent': { name: 'Agent 优先', desc: '同步率 +10，算力成本 +10%。', line: '它们顺了，活就顺了。' },
      'creed.profit': { name: '利润优先', desc: '收入 +5%，声誉 −3。', line: '先赚钱，面子以后再说。' }, 'creed.open': { name: '开放', desc: '粉丝 +20%，被抄袭风险 +30%。', line: '把过程写出来，别人抄得走算我输。' }, 'creed.independent': { name: '独立', desc: '拒绝融资，估值 +10%，现金压力 +10%。', line: '不拿钱，就不用解释。' },
      'creed.customer': { name: '客户至上', desc: '客户关系 +15%，利润 −5%。', line: '客户先睡好，我再睡。' }, 'creed.tech': { name: '技术信仰', desc: '研发点 +20%，商业化 −10%。', line: '有些东西现在不赚钱，但得有人做。' },
    },
  };

  // ---------------- 2.0 甲方 / 需求卡 / 合同 ----------------
  const clients = {
    archetypes: {
      'client.wang': { name: '王总', persona: '预算极低、需求极多', quote: '预算就这么多，你先做，做得好后面还有。', weakness: '怕同行先数字化' }, 'client.li': { name: '李总', persona: '需求模糊、只关心传播', quote: '不用太复杂，能发朋友圈就行。', weakness: '能不能发朋友圈' },
      'client.zhang': { name: '张总', persona: '预算高、拖款', quote: '这个季度先做出来，我下个月要跟 LP 汇报。', weakness: '要汇报给 LP' }, 'client.chen': { name: '陈姐', persona: '高预算、伦理风险', quote: '我们要的是能爆的，不是能用的。', weakness: '怕掉粉' },
      'client.zhao': { name: '赵工', persona: '流程长、预算稳', quote: '流程你先走一遍，盖章我来想办法。', weakness: '国产化 / 私有化' }, 'client.lin': { name: '小林', persona: '低预算、高创意', quote: '这个项目做完，我请你吃饭。真的。', weakness: '梦想' },
      'client.sun': { name: '孙律师', persona: '高要求、低容错', quote: '合同里这句「等保」，你给我解释一下。', weakness: '风险' }, 'client.zhou': { name: '周博士', persona: '低预算、学术资源', quote: '不着急，暑假前能给我就行。', weakness: '论文署名' },
    },
    needs: {
      'need.feature.core': { label: '核心功能', desc: '能下单、能付款、别在演示时白屏。' }, 'need.feature.bonus': { label: '加分功能', desc: '顺手把会员体系也做了吧，反正你这边快。' }, 'need.quality.usable': { label: '可用', desc: '点得动，不报错，重启一次还能用。' },
      'need.quality.commercial': { label: '商用', desc: '给客户看的时候，你不心虚。' }, 'need.quality.stunning': { label: '惊艳', desc: '让对方在群里发一句「可以啊」。' }, 'need.schedule.normal': { label: '正常工期', desc: '按合同来，别拖，也别提前到让人害怕。' },
      'need.schedule.rush': { label: '加急', desc: '下周一上线，周末辛苦一下。' }, 'need.budget.fixed': { label: '固定总价', desc: '超出的部分，你自己消化。' }, 'need.budget.share': { label: '分成', desc: '先少拿点，赌他以后做大。' },
      'need.hidden.login': { label: '顺便加个登录', desc: '微信、手机号、邮箱都要，最好再支持扫码。' }, 'need.hidden.export': { label: '要能导出 Excel', desc: '老板每周要拉一次，格式别变。' }, 'need.hidden.moments': { label: '老板要能发朋友圈', desc: '截图要好看，字要大。' },
    },
    contracts: {
      'contract.fixed': { name: '固定总价', desc: '报多少拿多少，改需求自己扛。' }, 'contract.hourly': { name: '按时计费', desc: '干多久算多久，客户会天天问进度。' }, 'contract.share': { name: '分成', desc: '前期少拿，赌客户能长大。' },
      'contract.retainer': { name: '长期驻场', desc: '每月固定进账，代价是产能被锁。' }, 'contract.penalty': { name: '违约条款', desc: '逾期赔钱，返工算你的。' },
    },
  };

  return { directions, roles, types, actions, upgrades, flavor, milestones, agentNames, ui, goals, personas, office, chapters, clients };
});
