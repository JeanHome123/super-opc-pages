// js/ui/deploy-form.js —— 部署表单的临时选择：只活在 UI 层，不写游戏存档
// 面板重绘会重建 <select>，这里把玩家选过的职业 / 模型记在内存里，
// 重绘时按同一份状态输出 selected，点击部署时也按同一份状态提交。
OPC.define('ui.deploy-form', ['data.catalog'], function (D) {
  'use strict';

  let role = '';
  let model = '';

  /** 合法职业 id（顺序即下拉框顺序） */
  const roleIds = () => Object.keys((D && D.roles) || {});

  /** 当前可用模型 id；坏值 / 缺字段直接跳过 */
  function modelIds(s) {
    const list = s && Array.isArray(s.models) ? s.models : [];
    return list.map(item => (item && typeof item.id === 'string' ? item.id : '')).filter(Boolean);
  }

  /**
   * 记录玩家此刻在下拉框里的选择。
   * 空值与非法职业忽略：重绘时读到的占位值不能把临时状态写坏。
   * @param {{role?:string, model?:string}} [next]
   */
  function remember(next) {
    if (!next || typeof next !== 'object') return;
    if (typeof next.role === 'string' && D && D.roles && D.roles[next.role]) role = next.role;
    if (typeof next.model === 'string' && next.model) model = next.model;
  }

  /**
   * 解析出「渲染」与「提交」共用的选择：
   * 职业必须仍存在于 data.catalog；模型必须仍在当前可用列表里。
   * 模型下线后回退到首个实例的模型或列表第一个，不留下无效选项。
   * @param {object} s 当前状态（只读）
   * @returns {{role:string, model:string}}
   */
  function resolve(s) {
    const roles = roleIds();
    const pickedRole = role && roles.includes(role) ? role : (roles[0] || '');
    const models = modelIds(s);
    const preferred = (s && Array.isArray(s.agents) && s.agents[0] && s.agents[0].modelId) || '';
    const pickedModel = model && models.includes(model)
      ? model
      : (models.includes(preferred) ? preferred : (models[0] || ''));
    return { role: pickedRole, model: pickedModel };
  }

  /**
   * 记录并解析：面板重绘与点击提交都走这里，保证两边口径一致。
   * @param {object} s
   * @param {{role?:string, model?:string}} [next] 当前 DOM 里的值（可能不存在）
   * @returns {{role:string, model:string}}
   */
  function pick(s, next) {
    remember(next);
    return resolve(s);
  }

  /** 复位（测试与新局用） */
  function reset() {
    role = '';
    model = '';
  }

  return { pick, remember, resolve, reset };
});
