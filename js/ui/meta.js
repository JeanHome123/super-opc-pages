// 浏览器存储适配；跨局计算全部交给 domain.meta。
OPC.define('ui.meta', ['domain.meta'], function (Meta) {
  'use strict';
  const KEY = 'opc.meta';
  const empty = () => Meta.normalize(null);

  /**
   * 严格读取：区分「没有记录」和「读取 / 解析失败」。
   * 只有 key 不存在才算空档案；getItem 抛错、JSON 损坏、非对象 / 数组 JSON 都算失败，
   * 调用方不得据此写盘，否则会用空档案覆盖玩家的旧档案。
   * @returns {{ok:true, meta:object}|{ok:false, reason:string, error?:Error}}
   */
  function readStrict() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch (error) {
      return { ok: false, reason: '存储读取异常', error };
    }
    if (raw === null || raw === undefined) return { ok: true, meta: empty() };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return { ok: false, reason: 'JSON 解析失败', error };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, reason: '档案不是对象' };
    }
    return { ok: true, meta: Meta.normalize(parsed) };
  }

  /** UI 展示用读取：失败时回退为空档案，面板照常渲染，不抛异常。 */
  function read() {
    const result = readStrict();
    return result.ok ? result.meta : empty();
  }
  function write(value) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); return true; }
    catch (error) { console.warn('[meta] 档案保存失败', error); return false; }
  }
  function recordMeta(s) {
    if (!s) return false;
    const result = readStrict();
    if (!result.ok) {
      console.warn(`[meta] 档案读取失败（${result.reason}），跳过记录以免覆盖旧档案`, result.error);
      return false;
    }
    return write(Meta.collect(result.meta, s));
  }
  function purchase(s, id) {
    const result = readStrict();
    if (!result.ok) {
      console.warn(`[meta] 传承购买失败：档案读取失败（${result.reason}）`, result.error);
      return false;
    }
    const next = Meta.purchase(result.meta, s, id);
    if (!next) return false;
    let oldMeta;
    let oldGame;
    try {
      oldMeta = localStorage.getItem(KEY);
      oldGame = localStorage.getItem('opc.save');
    } catch (error) {
      console.warn('[meta] 传承购买失败', error);
      return false;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next.meta));
      localStorage.setItem('opc.save', JSON.stringify(next.state));
    } catch (error) {
      try {
        if (oldMeta === null) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, oldMeta);
        if (oldGame === null) localStorage.removeItem('opc.save');
        else localStorage.setItem('opc.save', oldGame);
      } catch { /* 存储不可用时保留局内状态，提示玩家重试 */ }
      console.warn('[meta] 传承购买失败', error);
      return false;
    }
    Meta.commit(s, next);
    return true;
  }
  return { read, recordMeta, purchase };
});
