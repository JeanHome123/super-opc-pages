// 跨局规则；存储由 ui.meta 适配，不直接访问浏览器。
OPC.define('domain.meta', ['data.balance', 'data.catalog'], function (B, D) {
  'use strict';
  const keys = ['seen', 'claimed', 'models', 'clients', 'crises', 'tech'];
  const strings = value => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string'))] : [];

  /** 旧跨局记录迁移为可用副本。 */
  function normalize(raw) {
    const meta = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const count = n => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    const out = { legacy: count(meta.legacy), runs: count(meta.runs) };
    for (const key of keys) out[key] = strings(meta[key]);
    out.yearbooks = (Array.isArray(meta.yearbooks) ? meta.yearbooks : []).filter(x => x && typeof x.runId === 'string').slice(-B.yearbooksMax)
      .map(x => ({ runId: x.runId, name: String(x.name || ''), day: Number.isFinite(x.day) ? x.day : 0,
        cash: Number.isFinite(x.cash) ? x.cash : 0, text: String(x.text || '') }));
    return out;
  }

  /** 收集遇见过的条目，结局每局只结算一次；刷保存不重复领奖。 */
  function collect(raw, s) {
    const meta = normalize(raw);
    const add = (key, list) => { meta[key] = strings(meta[key].concat(list)); };
    add('models', (s.models || []).map(x => x.id).concat(D.models.filter(x => x.release <= s.day).map(x => x.id)));
    add('clients', [...(s.offers || []), ...(s.projects || [])].map(x => x.client && x.client.archetype).concat(Object.keys(s.clientRelations || {})));
    add('crises', (s.crisisHistory || []).map(x => x.id).concat(s.crisis ? [s.crisis.id] : []));
    add('tech', s.tech || []);
    if (s.ending && s.runId && !meta.claimed.includes(s.runId)) {
      add('claimed', [s.runId]);
      add('seen', [s.ending.id]);
      meta.legacy += Math.max(0, Math.floor(s.legacy || 0));
      meta.runs += 1;
      meta.yearbooks.push({ runId: s.runId, name: s.ending.name, day: s.day, cash: s.cash, text: s.ending.yearbook || '' });
      meta.yearbooks = meta.yearbooks.slice(-B.yearbooksMax);
    }
    return meta;
  }

  /** 新局开局只可选一次传承；消费点数与开局效果一并返回。 */
  function purchase(raw, s, id) {
    const meta = normalize(raw);
    const item = B.legacyOptions.find(x => x.id === id);
    if (!item || s.day !== 0 || s.legacyBonus || s.over || meta.legacy < item.cost) return false;
    meta.legacy -= item.cost;
    const state = { ...s, legacyBonus: id, cash: s.cash + (item.cash || 0),
      rep: s.rep + (item.rep || 0), rp: s.rp + (item.rp || 0) };
    return { meta, state };
  }

  /** 为旧档补稳定局标识；UI 只提供随机 UUID，不直接写状态。 */
  function identify(s, id) {
    if (!s.runId && typeof id === 'string') s.runId = id;
  }

  /** 存储适配层成功持久化后，才提交事务中的局内状态。 */
  function commit(s, transaction) { Object.assign(s, transaction.state); }

  return { normalize, collect, purchase, identify, commit };
});
