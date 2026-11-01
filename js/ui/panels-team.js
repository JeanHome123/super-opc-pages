// js/ui/panels-team.js —— 团队 / 部署 / 归档 / 人格
OPC.define('ui.panels-team',
['ui.dom', 'core.util', 'core.format', 'data.balance', 'data.catalog', 'data.copy', 'domain.economy', 'ui.panels-base'],
function (DOM, U, F, B, D, C, Econ, Base) {
  'use strict';

  const { secHead, opt, safe, table, personaLabel, roleName, personaTagsOf, slotsOf, deployCost, archiveList } = Base;
  const SKILL_LABEL = { work: '产出', quality: '质量', token: 'token', sync: '同步', accident: '事故', relation: '关系', compliance: '合规' };

  function skillEffectTags(effects) {
    if (!effects || typeof effects !== 'object') return '';
    return Object.entries(effects).map(([key, value]) => {
      if (typeof value !== 'number' || !isFinite(value)) return '';
      const label = SKILL_LABEL[key] || key;
      return `<span class="tag skill-effect">${DOM.esc(`${label} ${value > 0 ? '+' : ''}${F.percent(value)}`)}</span>`;
    }).join('');
  }

  /**
   * 部署表单当前选择：先把上一次渲染出来的值记进 UI 临时状态，再解析成
   * 「仍合法的职业 + 仍可用的模型」。重绘后 select 不会回到默认值。
   * @param {object} s
   * @returns {{role:string, model:string}}
   */
  function pickDeploy(s) {
    const api = opt('ui.deploy-form');
    const roleEl = DOM.$('deployRole');
    const modelEl = DOM.$('deployModel');
    if (api && typeof api.pick === 'function') {
      return api.pick(s, {
        role: roleEl ? roleEl.value : '',
        model: modelEl ? modelEl.value : '',
      });
    }
    // 模块缺失时的降级：第一个职业 + 首个实例的模型
    const roles = Object.values(D.roles);
    const preferred = (s.agents[0] && s.agents[0].modelId) || (s.models[0] && s.models[0].id) || '';
    return { role: roles[0] ? roles[0].id : '', model: preferred };
  }

  /**
   * 恢复按钮的可用状态：与 domain.deploy.restore 的校验保持一致
   * （冷却按 archivedDay 起算，工位按当前办公室阶段）。
   */
  function restoreState(s, item, slots, deployReady) {
    if (!deployReady) return { blocked: true, reason: '部署模块未接入' };
    const archivedDay = typeof item.archivedDay === 'number' ? item.archivedDay : 0;
    const wait = B.restoreCooldownDays - (s.day - archivedDay);
    if (wait > 0) return { blocked: true, reason: `还需 ${wait} 天冷却才能恢复` };
    if (s.agents.length >= slots) {
      return { blocked: true, reason: `工位已满（${s.agents.length}/${slots}），先归档或升级办公室` };
    }
    return { blocked: false, reason: '恢复到工作区' };
  }

  function renderAgents(s) {
    const slots = slotsOf(s);
    const cost = deployCost(s);
    const full = s.agents.length >= slots;
    const deployReady = !!opt('domain.deploy');
    const auditReady = !!opt('domain.audit');
    const auditApi = opt('domain.audit');
    const compliance = auditApi ? {
      score: safe(() => auditApi.score(s), B.complianceStart),
      risk: safe(() => auditApi.riskOf(s), '中'),
    } : null;
    const riskTone = risk => risk === '高' ? 'danger' : risk === '中' ? 'warn' : 'good';
    const complianceStrip = compliance ? `<div class="item compliance-card">
      <div class="item-head"><span class="tag compliance-tag">合规</span><b>${F.int(compliance.score)}/100</b><span class="spacer"></span><span class="tag risk-${riskTone(compliance.risk)}">风险 ${DOM.esc(compliance.risk)}</span></div>
      <div class="bar thin ${riskTone(compliance.risk)}" role="progressbar" aria-label="合规分" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${F.int(compliance.score)}"><i style="width:${U.clamp(compliance.score, 0, 100)}%"></i></div>
      <div class="deploy-hint">合规分影响监管风险与认证资格；合规审计师可以发起审计。</div>
    </div>` : '';
    const archetypes = table('data.personas', 'archetypes');
    const quirks = table('data.personas', 'quirks');
    const skillsApi = opt('domain.skills');
    const skillDefs = table('data.skills', 'generic').concat(table('data.skills', 'roleSkills'));
    const skillName = id => {
      const hit = skillDefs.find(item => item && item.id === id);
      return hit ? hit.name || hit.id : id;
    };
    const deployPick = pickDeploy(s);

    const roleOpts = Object.values(D.roles).map(role =>
      `<option value="${DOM.esc(role.id)}" ${role.id === deployPick.role ? 'selected' : ''}>${DOM.esc(roleName(role.id))}</option>`).join('');
    const modelOpts = s.models.map(model =>
      `<option value="${DOM.esc(model.id)}" ${model.id === deployPick.model ? 'selected' : ''}>${DOM.esc(model.name)}</option>`).join('');
    const preview = archetypes.length
      ? archetypes.map(item => `<span class="tag persona" title="${DOM.esc(item.desc || '')}">${DOM.esc(personaLabel('archetypes', item.id))}</span>`).join('')
      : '<span class="muted">人格数据未接入（P0-A2）</span>';

    const hint = !deployReady ? '部署模块未接入（P0-A4）'
      : full ? `工位已满（${slots}/${slots}），先升级办公室或归档`
        : s.cash < cost ? `现金不足，还差 ${F.money(cost - s.cash)}`
          : '一次性部署成本；之后按天消耗算力';

    const deploy = `<div class="item deploy-box">
      <div class="deploy-head"><b>部署新实例</b><span class="muted">工位 ${s.agents.length}/${slots}</span></div>
      <div class="deploy-grid">
        <label class="field"><span>职业</span>
          <select id="deployRole" data-focus-key="deployRole" aria-label="部署职业">${roleOpts}</select>
        </label>
        <label class="field"><span>模型底座</span>
          <select id="deployModel" data-focus-key="deployModel" aria-label="部署模型">${modelOpts}</select>
        </label>
      </div>
      <div class="persona-preview">
        <div class="preview-head"><span>人格预览 · ${archetypes.length} 本源 / ${quirks.length} 怪癖</span><span>随机 1 + 2</span></div>
        <div class="persona-tags">${preview}</div>
      </div>
      <button type="button" class="primary" data-act="deploy" ${deployReady && !full && s.cash >= cost ? '' : 'disabled'}
        title="${DOM.esc(hint)}">部署 · ${F.money(cost)}</button>
      <div class="deploy-hint">${DOM.esc(hint)}</div>
    </div>`;

    const rows = s.agents.map(agent => {
      const project = s.projects.find(p => p.id === agent.busy);
      const model = U.byId(s.models, agent.modelId);
      const burn = project ? ` · ${F.money(Econ.dailyCost(s, agent))}/天` : '';
      const xp = agent.level < B.maxLevel ? ` <span class="muted">${agent.xp}/${agent.level * B.xpPerLevel}</span>` : '';
      const persona = agent.persona || {};
      const sync = Number(persona.sync);
      const hasSync = persona.sync != null && isFinite(sync);
      const syncValue = U.clamp(sync, 0, 100);
      const syncClass = sync < 20 ? 'danger' : sync < 50 ? 'warn' : '';
      const syncRow = hasSync ? `<div class="sync-row ${sync < 20 ? 'low' : ''}" title="同步率低于 20 时产出 -10%，不会离职">
          <span>同步率 ${F.int(syncValue)}%</span>
          <div class="bar thin ${syncClass}" role="progressbar" aria-label="同步率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${F.int(syncValue)}"><i style="width:${syncValue}%"></i></div>
        </div>` : '';
      const skillPoints = Number.isInteger(agent.skillPoints) ? agent.skillPoints : 0;
      const learned = Array.isArray(agent.skills) ? agent.skills : [];
      const learnedTags = learned.map(id => `<span class="tag skill-tag">${DOM.esc(skillName(id))}</span>`).join('');
      const candidates = skillsApi && typeof skillsApi.available === 'function'
        ? safe(() => skillsApi.available(agent), []) : [];
      const candidateHtml = candidates.map(skill => `<div class="skill-choice">
        <div class="skill-choice-head">
          <b>${DOM.esc(skill.name || skill.id)}</b>
          <span class="tag" style="color:var(--muted)">Lv${F.int(skill.level || 1)}</span>
          <span class="spacer"></span>
          <button type="button" data-act="skill-learn" data-id="${agent.id}" data-skill="${DOM.esc(skill.id)}" ${skillPoints > 0 ? '' : 'disabled'} title="${skillPoints > 0 ? '消耗 1 技能点' : '技能点不足，升级后获得'}">学习</button>
        </div>
        <div class="product-desc">${DOM.esc(skill.desc || '')}</div>
        <div class="skill-effects">${skillEffectTags(skill.effects)}</div>
      </div>`).join('');
      const skillBlock = skillsApi ? `<div class="skill-block">
        <div class="skill-head">
          <span class="tag skill-points">技能点 ${skillPoints}</span>
          <span class="muted">已学 ${learned.length}</span>
          <span class="spacer"></span>
          ${learned.length ? `<button type="button" class="ghost" data-act="skill-respec" data-id="${agent.id}" title="首次免费，之后消耗现金">洗点</button>` : ''}
        </div>
        ${learnedTags ? `<div class="persona-row">${learnedTags}</div>` : ''}
        ${candidateHtml || '<div class="skill-empty">当前等级没有可学技能。</div>'}
        ${skillPoints > 0 ? '' : '<div class="skill-empty">技能点 0 · 升级后获得 1 点。</div>'}
      </div>` : '';

      return `<div class="item agent-card">
        <div class="item-head">
          <span class="swatch" style="background:${model ? model.color : '#888'}"></span>
          <b>${DOM.esc(agent.name)}</b>
          <span class="pill">Lv${agent.level}${xp}</span>
          <span class="tag" style="color:var(--muted)">${DOM.esc(roleName(agent.role))}</span>
          <span class="pill skill-points">技能点 ${skillPoints}</span>
          <span class="spacer"></span>
          ${agent.role === 'auditor' ? `<button type="button" class="ghost" data-act="audit" data-id="${agent.id}"
            title="发起合规审计：消耗现金与精力" ${auditReady ? '' : 'disabled'}>发起审计</button>` : ''}
          <button class="ghost icon" type="button" data-act="archive" data-id="${agent.id}"
            title="归档：保留人格与记忆，不占工位" aria-label="归档 ${DOM.esc(agent.name)}" ${deployReady ? '' : 'disabled'}>归档</button>
        </div>
        <div class="persona-row">${personaTagsOf(agent)}</div>
        ${syncRow}
        <div class="item-meta">
          <span>${project ? `▶ ${DOM.esc(project.name)}${burn}` : '💤 空闲（不耗 token）'}</span>
          <span>模型 ${DOM.esc(model ? model.name : '—')}</span>
        </div>
        ${skillBlock}
        <button type="button" class="ghost" data-act="fork" data-id="${agent.id}" ${s.over || s.agents.length >= slots || s.cash < Econ.forkCost(s, agent) ? 'disabled' : ''}>Fork · ${F.money(Econ.forkCost(s, agent))}</button>
        <button type="button" class="ghost" data-act="agent-memory" data-id="${agent.id}">实例记忆 · ${(agent.persona && agent.persona.memory || []).length} 条</button>
        <div class="item-actions" style="margin-top:6px">
          <select data-agent="${agent.id}" data-focus-key="model-${agent.id}" aria-label="切换模型" title="换模型会触发人格漂移" style="flex:1">
            ${s.models.map(m => `<option value="${m.id}" ${m.id === agent.modelId ? 'selected' : ''}>🧠 ${DOM.esc(m.name)}</option>`).join('')}
          </select>
          <select data-target="${agent.id}" data-focus-key="target-${agent.id}" aria-label="指派项目" title="指派项目" style="flex:1">
            <option value="">📌 自动分配</option>
            ${s.projects.map(p => `<option value="${p.id}" ${p.id === agent.target ? 'selected' : ''}>📌 ${DOM.esc(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>`;
    }).join('') || '<div class="empty">还没有 agent。选好职业和模型，部署第一个实例。</div>';

    const archived = archiveList(s);
    const archiveRows = archived.length ? archived.map(item => {
      const model = U.byId(s.models, item.modelId);
      const restore = restoreState(s, item, slots, deployReady);
      return `<div class="item archive-item">
        <div class="item-head">
          <b>${DOM.esc(item.name)}</b>
          <span class="pill">Lv${item.level || 1}</span>
          <span class="tag" style="color:var(--muted)">${DOM.esc(roleName(item.role))}</span>
          <span class="spacer"></span>
          <button type="button" class="ghost" data-act="restore" data-id="${item.id}" ${restore.blocked ? 'disabled' : ''} title="${DOM.esc(restore.reason)}">恢复</button>
        </div>
        <div class="persona-row">${personaTagsOf(item)}</div>
        <div class="item-meta">
          <span>模型 ${DOM.esc(model ? model.name : '—')}</span>
          <span>归档于 D${item.archivedDay == null ? '—' : item.archivedDay}</span>
        </div>
        ${restore.blocked ? `<div class="deploy-hint">${DOM.esc(restore.reason)}</div>` : ''}
      </div>`;
    }).join('') : '<div class="empty">归档区空着。归档的 agent 会保留人格与记忆，不占工位。</div>';

    DOM.paint(DOM.$('agents'),
      secHead('Agent 团队', `${s.agents.length}/${slots}`) + complianceStrip + deploy + rows +
      secHead('归档区', String(archived.length), '', 'gap') + archiveRows);
  }

  return { renderAgents };
});
