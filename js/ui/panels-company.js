// js/ui/panels-company.js —— 办公室 / 章节 / 升级 / 模型市场
OPC.define('ui.panels-company',
['ui.dom', 'core.util', 'core.format', 'data.balance', 'data.catalog', 'data.copy', 'domain.economy', 'ui.panels-base'],
function (DOM, U, F, B, D, C, Econ, Base) {
  'use strict';

  const { secHead, opt, safe, table, labelOf, officeStage, officeStages, officeIndex, slotsOf, rentOf, nextStageOf, metricText } = Base;

  const pipelineRule = (key, fallback) => (
    Number.isFinite(B[key]) ? B[key] : (B.pipeline && Number.isFinite(B.pipeline[key]) ? B.pipeline[key] : fallback)
  );

  // ---------------------------------------------------------------- 公司：合规认证
  function complianceBlock(s) {
    const api = opt('domain.audit');
    if (!api) return '';
    const score = safe(() => api.score(s), B.complianceStart);
    const risk = safe(() => api.riskOf(s), '中');
    const threshold = B.complianceCertThreshold;
    const certified = Array.isArray(s.certs) && s.certs.length > 0;
    const canCertify = score >= threshold && !certified;
    const tone = risk === '高' ? 'danger' : risk === '中' ? 'warn' : 'good';
    const hint = certified ? '已持有基础合规认证。'
      : score < threshold ? `合规分 ${score}，达到 ${threshold} 才能申请。`
        : '已达标，可以申请基础合规认证。';
    return secHead('合规认证', `${score}/100`, '', 'gap') + `
      <div class="item compliance-card">
        <div class="item-head">
          <span class="tag risk-${tone}">风险 ${DOM.esc(risk)}</span>
          <span class="spacer"></span>
          <button type="button" class="${canCertify ? 'primary' : ''}" data-act="audit-certify" ${canCertify ? '' : 'disabled'} title="${DOM.esc(hint)}">${certified ? '已认证' : '申请合规认证'}</button>
        </div>
        <div class="bar thin ${tone}" role="progressbar" aria-label="合规分" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}"><i style="width:${U.clamp(score, 0, 100)}%"></i></div>
        <div class="item-meta"><span>合规分 ${score}/100</span><span>认证门槛 ${threshold}</span><span>${certified ? '认证状态：已认证' : '认证状态：未认证'}</span></div>
        <div class="deploy-hint">${DOM.esc(hint)}</div>
      </div>`;
  }

  // ---------------------------------------------------------------- 公司：产线
  function pipelineBlock(s) {
    const api = opt('domain.pipeline');
    if (!api) return '';
    const list = safe(() => api.view(s), []);
    const agents = Array.isArray(s.agents) ? s.agents : [];
    const orchestrator = agents.find(agent => agent.role === 'orchestrator');
    const others = agents.filter(agent => agent.role !== 'orchestrator');
    const minOthers = pipelineRule('pipelineMinOthers', 2);
    const maxActive = pipelineRule('pipelineMax', 3);
    const active = list.filter(pipeline => pipeline.active).length;
    const canCreate = !!orchestrator && others.length >= minOthers && active < maxActive;
    const reason = !orchestrator ? '需要 1 名智能体编排师（先部署 orchestrator）'
      : others.length < minOthers ? `还需要 ${minOthers - others.length} 名其他 agent`
        : active >= maxActive ? `最多同时启用 ${maxActive} 条产线，先停用一条`
          : '自动取 1 名编排师 + 前 2 名其他 agent 组建产线';
    const rows = list.map(pipeline => {
      const members = pipeline.agents.map(agent => DOM.esc(agent.name)).join(' + ');
      const types = (pipeline.types || []).map(type =>
        `<span class="tag" style="color:var(--info)">${DOM.esc((C.types[type] || {}).name || type)}</span>`).join('');
      return `<div class="item pipeline-card ${pipeline.active ? '' : 'off'}">
        <div class="item-head">
          <b>${DOM.esc(pipeline.name)}</b>
          <span class="tag ${pipeline.active && pipeline.operational ? 'pipeline-on' : 'pipeline-off'}">${!pipeline.active ? '已停用' : pipeline.operational ? '启用中' : '成员未就绪'}</span>
          <span class="spacer"></span>
          ${pipeline.active ? `<button type="button" class="ghost" data-act="pipeline-archive" data-id="${pipeline.id}">停用</button>` : ''}
        </div>
        <div class="item-meta"><span>成员 ${members}</span><span>创建 D${F.int(pipeline.createdAt || 0)}</span></div>
        ${types ? `<div class="persona-row">${types}</div>` : ''}
      </div>`;
    }).join('');
    return secHead('产线', `${list.length} 条`, `<button type="button" data-act="pipeline-create" ${canCreate ? '' : 'disabled'} title="${DOM.esc(reason)}">自动组产线</button>`, 'gap') +
      (rows || '<div class="empty">还没有产线。部署 1 名编排师和 2 名其他 agent 后可以自动组产线。</div>') +
      `<div class="deploy-hint">${DOM.esc(reason)}</div>`;
  }

  // ---------------------------------------------------------------- 公司：办公室
  function renderOffice(s) {
    const stage = officeStage(s);
    const stages = officeStages();
    if (!stage) {
      DOM.paint(DOM.$('office'), secHead('办公室', '') +
        '<div class="empty">办公室数据未接入（P0-A2 / P0-A5）。</div>');
      return;
    }
    const index = officeIndex(s, stage);
    const slots = slotsOf(s);
    const rent = rentOf(s);
    const next = nextStageOf(s);
    const api = opt('domain.office');
    const canUpgrade = !!(api && typeof api.upgrade === 'function');
    const cost = next && next.cost != null ? Number(next.cost) : 0;
    const disabled = !canUpgrade || !next || s.cash < cost;
    const reason = !canUpgrade ? '办公室模块未接入（P0-A5）'
      : !next ? '已经是最后一个阶段'
        : s.cash < cost ? `现金不足，还差 ${F.money(cost - s.cash)}`
          : '搬迁后工位与房租按新阶段计算';
    const nextLine = next ? `<div class="office-next">
        <div class="next-copy">
          <span>下一阶段</span>
          <b>${DOM.esc(next.name || next.id)}</b>
          <span>${next.slots} 工位 · 房租 ${F.money(next.rent)}/月 · 搬迁 ${F.money(cost)}</span>
        </div>
        <button type="button" class="primary" data-act="office-upgrade" ${disabled ? 'disabled' : ''} title="${DOM.esc(reason)}">搬迁升级</button>
      </div>` : '<div class="office-next"><span class="muted">已经是最后一个阶段。这里的房租就是你的上限。</span></div>';

    DOM.paint(DOM.$('office'), secHead('办公室', `阶段 ${index + 1}/${stages.length || 1}`) + `
      <div class="item office-card">
        <div class="item-head">
          <b class="office-name">${DOM.esc(stage.name || stage.id)}</b>
          <span class="tag office-tag">${slots} 工位</span>
          <span class="spacer"></span>
          <span class="mono gold">${rent == null ? '—' : F.money(rent)}/月</span>
        </div>
        <div class="office-stats">
          <span>已用工位 <b>${s.agents.length}/${slots}</b></span>
          <span>房租 ${rent == null ? '—' : F.money(rent)}</span>
          <span>${Array.isArray(s.office && s.office.facilities) ? `设施 ${s.office.facilities.length} 件` : '设施 0 件'}</span>
        </div>
        ${stage.desc ? `<div class="office-desc">${DOM.esc(stage.desc)}</div>` : ''}
        ${nextLine}
        <div class="deploy-hint">${DOM.esc(reason)}</div>
      </div>` + complianceBlock(s) + pipelineBlock(s));
  }

  // ---------------------------------------------------------------- 公司：章节
  function renderChapter(s) {
    const api = opt('domain.chapters');
    const progress = api && typeof api.progress === 'function' ? safe(() => api.progress(s), null) : null;
    const acts = table('data.chapters', 'acts');
    const creeds = table('data.chapters', 'creeds');
    const rawAct = s.chapter && s.chapter.act;
    const fallbackAct = acts.find(item => item.id === rawAct) || acts[(Number(rawAct) || 1) - 1] || acts[0] || null;
    const actName = (progress && progress.actName) || (fallbackAct && (fallbackAct.name || fallbackAct.title)) || (s.chapter ? '第一幕' : '');
    if (!progress && !fallbackAct) {
      DOM.paint(DOM.$('chapter'), secHead('章节', '') +
        '<div class="empty">章节数据未接入（P0-A2 / P0-A5）。</div>');
      return;
    }

    const goals = (progress && Array.isArray(progress.goals) && progress.goals.length)
      ? progress.goals
      : ((fallbackAct && (fallbackAct.goals || fallbackAct.objectives)) || []);
    const pct = U.clamp(Number(progress && progress.pct) || 0, 0, 100);
    const achieved = progress ? progress.achieved : goals.filter(goal => goal.done).length;
    const days = fallbackAct && fallbackAct.startDay != null && fallbackAct.endDay != null
      ? `${fallbackAct.startDay}–${fallbackAct.endDay}`
      : fallbackAct && (fallbackAct.days || fallbackAct.range)
        ? (Array.isArray(fallbackAct.days) ? fallbackAct.days.join('–') : String(fallbackAct.days))
        : '';

    const goalRows = goals.map(goal => {
      const done = !!goal.done;
      const target = metricText(goal.metric, goal.target);
      const value = goal.current == null ? '' : `${metricText(goal.metric, goal.current)} / `;
      return `<div class="chapter-goal ${done ? 'done' : ''}">
        <span class="tick">${done ? '✓' : '○'}</span>
        <span class="goal-label">${DOM.esc(goal.label || goal.name || goal.id || '目标')}</span>
        <span class="goal-value">${DOM.esc(value + (goal.current == null ? '目标 ' : '') + target)}</span>
      </div>`;
    }).join('');
    const headExtra = progress ? `${achieved}/${goals.length}` : `${goals.length} 项`;
    const creedId = (s.chapter && (s.chapter.creed || s.chapter.creedId)) || s.creed || null;
    const choicesLeft = Math.max(0, ((s.chapter && s.chapter.completed) || []).length - ((s.chapter && s.chapter.choices) || []).length);
    const creedTags = creeds.length ? creeds.map(creed =>
      `<button type="button" class="tag creed ${creed.id === creedId ? 'on' : ''}" data-act="creed-choose" aria-pressed="${creed.id === creedId}" data-id="${DOM.esc(creed.id)}" ${!choicesLeft || s.over ? 'disabled' : ''} title="${DOM.esc(creed.desc || '')}">${DOM.esc(labelOf('creeds', creed.id, creed.name))} · ${DOM.esc(creed.desc || '')}</button>`).join('')
      : '<span class="muted">信条数据未接入（P0-A2）</span>';

    DOM.paint(DOM.$('chapter'), secHead('章节进度', headExtra) + `
      <div class="item chapter-card">
        <div class="chapter-top">
          <div class="chapter-act">
            <span class="act-no">ACT ${(progress && progress.actIndex) || (fallbackAct && fallbackAct.index) || 1}</span>
            <b>${DOM.esc(actName)}</b>
          </div>
          <span class="muted">${DOM.esc(days)}</span>
        </div>
        <div class="bar ${pct >= 100 ? '' : 'warn'}" role="progressbar" aria-label="章节完成度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" style="margin-top:8px"><i style="width:${pct}%"></i></div>
        ${progress
          ? `<div class="chapter-sub">目标 ${achieved}/${goals.length}　·　完成度 ${Math.round(pct)}%${progress.done ? '　·　本幕目标已达成，等待进入下一幕' : ''}</div>`
          : '<div class="chapter-sub">目标进度将在章节模块接入后显示。</div>'}
        <div class="chapter-goals">${goalRows || '<span class="muted">本幕没有额外目标。</span>'}</div>
        <div class="creed-block">
          <div class="creed-head"><span>信条</span><span>每幕完成 +1 次选择，当前 ${choicesLeft} 次；仅最新信条生效</span></div>
          <div class="creed-tags">${creedTags}</div>
        </div>
      </div>`);
  }

  function renderMarket(s) {
    const rows = s.models.map(model => {
      const price = Econ.priceOf(s, model);
      const discounted = model.discountUntil != null && model.discountUntil >= s.day;
      const using = s.agents.some(agent => agent.modelId === model.id);
      return `<tr class="${using ? '' : 'off'}">
        <td><span class="swatch" style="background:${model.color}"></span>${DOM.esc(model.name)}</td>
        <td class="muted">${DOM.esc(model.vendor)}</td>
        <td class="mono">${F.price(price)}${discounted ? ' <span class="good">5折</span>' : ''}</td>
        <td class="mono">${model.power}</td>
        <td class="mono">${Math.round(model.quality * 100)}%</td>
      </tr>`;
    }).join('');

    DOM.paint(DOM.$('market'), `${secHead('模型市场', String(s.models.length))}
      <table>
        <thead><tr><th>模型</th><th>厂商</th><th>¥/M</th><th>产出</th><th>质量</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="muted" style="margin-top:8px">换模型需付迁移费 ${F.money(B.switchFee)}；老模型会下线并强制迁移。</div>`);
  }

  function renderUpgrades(s) {
    const list = D.upgrades.map(upgrade => {
      const copy = C.upgrades[upgrade.id] || { name: upgrade.id, desc: '' };
      const owned = s.upgrades.includes(upgrade.id);
      const action = owned
        ? '<span class="pill" style="color:var(--accent)">已拥有</span>'
        : `<button type="button" data-act="buy" data-id="${upgrade.id}" ${s.cash < upgrade.cost ? 'disabled' : ''}>${F.money(upgrade.cost)}</button>`;
      return `<div class="item">
        <div class="item-head"><b>${DOM.esc(copy.name)}</b><span class="spacer"></span>${action}</div>
        <div class="item-meta" style="color:var(--muted)">${DOM.esc(copy.desc)}</div>
      </div>`;
    }).join('');

    DOM.paint(DOM.$('upgrades'),
      secHead('公司升级', `${s.upgrades.length}/${D.upgrades.length}`) + list);
  }

  return { renderOffice, renderChapter, renderMarket, renderUpgrades };
});
