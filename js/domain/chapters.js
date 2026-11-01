// js/domain/chapters.js —— 四幕章节：目标进度 / 幕末推进
// 目标全部是 data/chapters.js 里的声明式 metric/target；本模块只负责读状态与切换幕。
OPC.define('domain.chapters', ['core.util'], function (U) {
  'use strict';

  /**
   * 兼容读取可选的 data 模块：content 表尚未落地时也能加载与单测。
   * @param {string} name
   * @returns {object|Array|null}
   */
  function optionalData(name) {
    try {
      return OPC.has(name) ? OPC.require(name) : null;
    } catch (error) {
      return null;
    }
  }

  /** 幕表：支持数组、{ acts }、{ chapters }、{ episodes } 与按 id 键控的对象 */
  function actList() {
    const data = optionalData('data.chapters');
    const raw = Array.isArray(data) ? data
      : data && typeof data === 'object'
        ? (data.acts || data.chapters || data.episodes)
        : null;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw).filter(item => item && typeof item === 'object');
    return [];
  }

  /** 当前幕下标；旧档/非法值回退到第一幕 */
  function actIndex(s) {
    const acts = actList();
    if (!acts.length) return 0;
    const chapter = s && typeof s === 'object' && s.chapter && typeof s.chapter === 'object' ? s.chapter : null;
    const raw = chapter ? chapter.act : undefined;
    if (typeof raw === 'string') {
      const byId = acts.findIndex(act => act && act.id === raw);
      if (byId >= 0) return byId;
    }
    if (Number.isInteger(raw) && raw >= 1 && raw <= acts.length) return raw - 1;
    return 0;
  }

  /**
   * 当前幕对象；没有数据表时返回 null，调用方按空章节展示。
   * @param {object} s
   * @returns {object|null}
   */
  function current(s) {
    const acts = actList();
    return acts[actIndex(s)] || null;
  }

  /** 声明式目标列表：兼容 goals / targets / objectives */
  function goalsOf(act) {
    if (!act || typeof act !== 'object') return [];
    const raw = act.goals || act.targets || act.objectives;
    return Array.isArray(raw) ? raw.filter(goal => goal && typeof goal === 'object') : [];
  }

  /** 常用 metric 的读取器；未知 metric 再按点路径从状态里取 */
  const METRICS = {
    cash: s => s.cash,
    operatingCash: s => s.cash - (s.finance && s.finance.raised || 0),
    day: s => s.day,
    rep: s => s.rep,
    reputation: s => s.rep,
    mrr: s => s.mrr,
    delivered: s => s.delivered,
    failed: s => s.failed,
    agents: s => (Array.isArray(s.agents) ? s.agents.length : 0),
    agentCount: s => (Array.isArray(s.agents) ? s.agents.length : 0),
    officeStage: s => (s.office && Number.isInteger(s.office.stage) ? s.office.stage : 0),
    stage: s => (s.office && Number.isInteger(s.office.stage) ? s.office.stage : 0),
    fans: s => s.fans,
    compliance: s => s.compliance,
    projects: s => (Array.isArray(s.projects) ? s.projects.length : 0),
    offers: s => (Array.isArray(s.offers) ? s.offers.length : 0),
    models: s => (Array.isArray(s.models) ? s.models.length : 0),
  };

  /** 从状态里读一个 metric；任何缺失 / 非数字都按 0，避免坏数据让整局崩 */
  function metricOf(s, metric) {
    if (typeof metric !== 'string' || !metric) return 0;
    const fn = METRICS[metric];
    const value = fn ? fn(s || {}) : readPath(s, metric);
    return typeof value === 'number' && isFinite(value) ? value : 0;
  }

  /** 点路径读取：支持 data 里写 office.stage / total.income 这类 metric */
  function readPath(s, path) {
    let cursor = s;
    for (const key of path.split('.')) {
      if (cursor == null || typeof cursor !== 'object') return 0;
      cursor = cursor[key];
    }
    return cursor;
  }

  /** 目标比较符：默认 gte；data 可用 op: 'lte' | 'eq' 表达上限/相等目标 */
  function compareOf(goal) {
    const op = typeof goal.op === 'string' ? goal.op : goal.compare;
    return op === 'lte' || op === 'eq' ? op : 'gte';
  }

  /** 单个目标的进度；ratio 统一 0~1，done 与数值分开展示 */
  function goalProgress(s, goal) {
    const target = Number(goal.target);
    const value = metricOf(s, goal.metric);
    const valid = typeof goal.target === 'number' && isFinite(goal.target) ||
      (typeof goal.target === 'string' && goal.target.trim() !== '' && isFinite(target));
    const op = compareOf(goal);
    let done = false;
    let ratio = 0;

    if (valid) {
      if (op === 'lte') {
        done = value <= target;
        ratio = done ? 1 : target > 0 ? U.clamp(target / value, 0, 1) : 0;
      } else if (op === 'eq') {
        done = value === target;
        ratio = done ? 1 : 0;
      } else {
        done = value >= target;
        ratio = target > 0 ? U.clamp(value / target, 0, 1) : done ? 1 : 0;
      }
    }

    return {
      id: goal.id || goal.metric || '',
      label: goal.label || goal.text || goal.name || goal.id || goal.metric || '',
      metric: goal.metric || '',
      current: value,
      target: valid ? target : 0,
      done,
      ratio,
    };
  }

  /**
   * 当前幕目标进度（只读）。pct 是各目标完成率的平均值（0~100）。
   * @param {object} s
   * @returns {object}
   */
  function progress(s) {
    const act = current(s);
    const goals = goalsOf(act).map(goal => goalProgress(s, goal));
    const achieved = goals.filter(goal => goal.done).length;
    const total = goals.length;
    const ratio = total ? U.sum(goals, goal => goal.ratio) / total : 0;
    return {
      actId: act ? act.id || '' : '',
      actName: act ? act.name || act.title || '' : '',
      actIndex: act ? actIndex(s) + 1 : 0,
      total,
      achieved,
      pct: Math.round(ratio * 100),
      done: total ? achieved === total : false,
      goals,
    };
  }

  /** 幕名：数据缺 name 时用幕序号，不把 undefined 写进日志 */
  function actName(act, index) {
    return act && (act.name || act.title) ? act.name || act.title : `第 ${index + 1} 幕`;
  }

  /** 幕时限：兼容 toDay / endDay / untilDay / days:[from,to] / dayRange 等声明方式 */
  function endDayOf(act) {
    if (!act || typeof act !== 'object') return null;
    const direct = [act.toDay, act.endDay, act.untilDay, act.deadlineDay, act.to];
    for (const value of direct) if (typeof value === 'number' && isFinite(value)) return value;
    const range = Array.isArray(act.days) ? act.days : act.dayRange || act.day;
    if (Array.isArray(range) && typeof range[1] === 'number' && isFinite(range[1])) return range[1];
    if (range && typeof range === 'object' && typeof range.to === 'number' && isFinite(range.to)) return range.to;
    return null;
  }

  /** 把章节对象补成合法形状（旧档 / 坏档不崩） */
  function ensureChapter(s) {
    if (!s.chapter || typeof s.chapter !== 'object' || Array.isArray(s.chapter)) {
      s.chapter = { act: 1, startedDay: typeof s.day === 'number' ? s.day : 0, creed: null, completed: [] };
    }
    if (!Array.isArray(s.chapter.completed)) s.chapter.completed = [];
    if (!Number.isInteger(s.chapter.act) || s.chapter.act < 1) s.chapter.act = 1;
    return s.chapter;
  }

  /** 写日志：没有 ctx.log 的测试上下文也不炸 */
  function log(ctx, text) {
    if (ctx && typeof ctx.log === 'function') ctx.log(text);
  }

  /**
   * 推进章节：当前幕目标全部完成（或到达幕时限）时切下一幕；只切一幕。
   * 由 day.tick 的 chapters 阶段调用；不弹窗、不阻塞游戏。
   * @param {object} ctx
   * @returns {boolean} 是否发生了幕切换 / 幕完成
   */
  function advance(ctx) {
    const s = ctx && ctx.s;
    if (!s || typeof s !== 'object') return false;
    const acts = actList();
    if (!acts.length) return false;

    const chapter = ensureChapter(s);
    const index = actIndex(s);
    const act = acts[index];
    if (!act) return false;

    const id = String(act.id || index + 1);
    if (chapter.completed.includes(id)) return false;

    const goals = goalsOf(act).map(goal => goalProgress(s, goal));
    const goalsDone = goals.length === 0 || goals.every(goal => goal.done);
    const endDay = endDayOf(act);
    const timeUp = endDay != null && s.day >= endDay;
    if (!goalsDone && !timeUp) return false;

    chapter.completed.push(id);
    const name = actName(act, index);
    if (!goalsDone) {
      const missed = goals.filter(goal => !goal.done).map(goal => goal.label || goal.id).join('、');
      log(ctx, `🎬 第 ${index + 1} 幕「${name}」时限到了，目标未完成：${missed}。`);
    } else {
      log(ctx, `🎬 第 ${index + 1} 幕「${name}」的目标全部完成。`);
    }

    const next = acts[index + 1];
    if (next) {
      chapter.act = index + 2;
      chapter.startedDay = s.day;
      log(ctx, `🎬 进入第 ${index + 2} 幕「${actName(next, index + 1)}」。`);
    } else {
      log(ctx, '🎬 四幕主线落幕，接下来是你自己定义的成功。');
    }
    return true;
  }

  /** 当前唯一生效的信条；幕末可替换一次，机会可保留。 */
  function effects(s) {
    const data = optionalData('data.chapters');
    const creed = data && U.byId(data.creeds, s.chapter && s.chapter.creed);
    return creed ? creed.effects : {};
  }

  /** 只消耗已完成章节产生的选择机会；非法操作不改状态。 */
  function choose(ctx, id) {
    const s = ctx.s;
    const chapter = ensureChapter(s);
    const data = optionalData('data.chapters');
    const creed = data && U.byId(data.creeds, id);
    if (!Array.isArray(chapter.choices)) chapter.choices = [];
    if (s.over || !creed || chapter.choices.length >= chapter.completed.length) {
      log(ctx, '完成一幕后才能选择或更换信条。');
      return false;
    }
    chapter.creed = id;
    chapter.choices.push(id);
    if (creed.effects.rep) s.rep = U.clamp(s.rep + creed.effects.rep, 0, 100);
    if (creed.effects.sync) {
      const persona = OPC.require('domain.persona');
      s.agents.forEach(a => persona.bumpSync(a, creed.effects.sync * 100));
    }
    log(ctx, `📜 公司信条：${creed.name}。${creed.desc}`);
    return true;
  }

  return { current, progress, advance, effects, choose };
});
