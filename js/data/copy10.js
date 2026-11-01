// js/data/copy10.js —— P1 粉丝 / 个人 IP 文案（6 渠道 + 6 内容）
// 只放文本：成本 / 精力 / 粉丝基数 / 乘数在 data/fans.js，规则在 domain/fans.js。
OPC.define('data.copy10', [], function () {
  'use strict';

  const channels = {
    'channel.x': {
      name: 'X',
      desc: '发一条短帖，配一张截图。算法喜欢争议，客户也会看见。',
    },
    'channel.xiaohongshu': {
      name: '小红书',
      desc: '把办公室拍得像生活，把产品讲得像经验。评论区比后台热闹。',
    },
    'channel.github': {
      name: 'GitHub',
      desc: '开源一个小工具，README 写清楚怎么跑。star 不会直接变成钱，但会变成信任。',
    },
    'channel.podcast': {
      name: '播客',
      desc: '聊一小时创业，剪成四十分钟。听众不多，但听完的人会记住你。',
    },
    'channel.live': {
      name: '直播',
      desc: '开着摄像头写代码、改方案、回客户消息。真实感是最好的流量。',
    },
    'channel.community': {
      name: '行业群',
      desc: '在群里认真回答一个具体问题，别发广告。有人会私聊你。',
    },
  };

  const types = {
    'type.progress': {
      name: '进展',
      desc: '这个月做了什么、卡在哪里、下一步打算怎么改。',
    },
    'type.failure': {
      name: '失败',
      desc: '把一次翻车讲清楚：错在哪、赔了多少、下次怎么避免。',
    },
    'type.revenue': {
      name: '收入',
      desc: '公开一个月的收入和成本。数字会引来同行，也会引来客户。',
    },
    'type.tutorial': {
      name: '教程',
      desc: '把你会的东西拆成别人能照着做的步骤。教得越清楚，越像专家。',
    },
    'type.opinion': {
      name: '观点',
      desc: '对行业里的一件事说点不受欢迎的话。有人取关，有人记住你。',
    },
    'type.case': {
      name: '案例',
      desc: '讲一个客户从问题到结果的完整过程。注意别把客户的名字讲出来。',
    },
  };

  return { channels, types };
});
