OPC.define('ui.collection', ['ui.dom', 'core.format', 'data.balance'], function (DOM, F, B) {
  'use strict';

  function conditionText(condition) {
    if (!condition) return '';
    if (condition.all) return condition.all.map(conditionText).join('，并且');
    if (condition.any) return condition.any.map(conditionText).join('，或');
    const labels = { operatingCash: '净经营现金', cash: '现金', agents: '实例数', compliance: '合规',
      productUsers: '产品用户', rep: '声誉', mrr: '服务月订阅', day: '天数', soldFor: '收购金额' };
    if (condition.metric === 'over') return condition.target === 'lose' ? '公司破产' : '接受收购';
    return `${labels[condition.metric] || condition.metric} ${condition.op === 'lte' ? '≤' : condition.op === 'gt' ? '>' : '≥'} ${condition.target}`;
  }

  /** 图鉴只显示已解锁详情，条目数量来自实际内容表。 */
  function render(meta) {
    const groups = [
      ['结局墙', 'seen', 'data.endings', 'endings'],
      ['模型博物馆', 'models', 'data.catalog', 'models'],
      ['甲方档案', 'clients', 'data.clients', 'clients'],
      ['危机档案', 'crises', 'data.crises', 'crises'],
      ['技术档案', 'tech', 'data.tech', 'nodes'],
    ];
    const sections = groups.map(([title, key, module, field]) => {
      const rows = OPC.require(module)[field];
      const seen = new Set(meta[key] || []);
      return `<h3>${title} · ${rows.filter(x => seen.has(x.id)).length}/${rows.length}</h3>` + rows.map(x =>
        `<div class="item"><b>${seen.has(x.id) || key === 'seen' ? DOM.esc(x.name || x.id) : '尚未发现'}</b>
          <div class="item-meta">${key === 'seen' ? DOM.esc(conditionText(x.condition)) : seen.has(x.id) ? DOM.esc(x.desc || x.industry || '已收入档案') : '继续经营以解锁'}</div></div>`).join('');
    }).join('');
    const books = (meta.yearbooks || []).map(x => `<div class="item"><b>D${x.day} · ${DOM.esc(x.name)}</b><p>${DOM.esc(x.text)}</p><span>最终现金 ${F.money(x.cash)}</span></div>`).join('');
    return `<h2>创业档案</h2><p>已完成 ${F.int(meta.runs)} 局 · 可用遗产 ${F.int(meta.legacy)} 点</p><p class="dim">结局在退出或第 365 天判定；多项达标时优先取上方的结局。</p>
      <h3>最近公司年鉴</h3>${books || '<p class="dim">完成第一局后自动保存。</p>'}${sections}<button type="button" data-act="collection-close">返回</button>`;
  }

  /** 公司页的传承入口；新局可选择一项，避免永久滚雪球。 */
  function paint(s, meta) {
    const options = B.legacyOptions.map(x => `<button type="button" data-act="legacy-buy" data-id="${x.id}"
      ${s.over || s.day !== 0 || s.legacyBonus || meta.legacy < x.cost ? 'disabled' : ''}>${DOM.esc(x.name)} · ${x.cost} 点</button>`).join('');
    DOM.paint(DOM.$('legacy'), `<div class="sec-head"><b>传承与图鉴</b><button type="button" data-act="collection">查看档案</button></div>
      <button type="button" data-act="acquisition" ${OPC.require('domain.endings').canOfferAcquisition(s) ? '' : 'disabled'}>洽谈收购 · 第 ${B.acquisition.minDay} 天 / 声誉 ${B.acquisition.reputation}</button>
      <div class="item"><div>可用遗产 ${F.int(meta.legacy)} 点 · 已完成 ${F.int(meta.runs)} 局</div>
      <p class="dim">开局第 0 天限选一项：储备 +¥5,000、口碑 +5、研究 +5 RP；本局 ${s.legacyBonus ? '已选择' : '未选择'}。</p>
      <div class="modal-actions">${options}</div></div>`);
  }

  return { render, paint };
});
