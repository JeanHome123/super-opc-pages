// js/ui/panels-story.js —— 事件链：进行中提示 / 正文 / 选项 / 跳过
OPC.define('ui.panels-story',
['ui.dom'],
function (DOM) {
  'use strict';

  /** 首次出现时把容器插到检视器顶部；无 active 时由 :empty 隐藏 */
  function host() {
    let el = DOM.$('story');
    if (el) return el;
    const body = DOM.$('inspBody');
    if (!body) return null;
    el = document.createElement('section');
    el.id = 'story';
    el.className = 'story-wrap';
    el.setAttribute('aria-label', '事件链进行中');
    body.insertBefore(el, body.firstChild);
    return el;
  }

  /**
   * @param {object} s
   * @param {{id:string,title:string,step:number,total:number,text:string,options:string[],canSkip?:boolean}|null} view
   */
  function renderStory(s, view) {
    const el = host();
    if (!el) return;
    if (!view) {
      DOM.paint(el, '');
      return;
    }
    const step = Number.isInteger(view.step) ? view.step : 0;
    const total = Number.isInteger(view.total) ? view.total : 0;
    const options = Array.isArray(view.options) ? view.options : [];
    const optionHtml = options.map((label, index) =>
      `<button type="button" class="story-option" data-act="chain-choose" data-index="${index}">
        <span class="story-index">${index + 1}</span>${DOM.esc(label)}
      </button>`).join('');
    const skip = view.canSkip === false ? '' :
      `<button type="button" class="ghost" data-act="chain-skip">跳过这条线</button>
       <span class="muted">跳过会标记为已看，不再触发</span>`;

    DOM.paint(el, `
      <div class="item story-card">
        <div class="story-head">
          <span class="tag story-tag">事件链</span>
          <b>${DOM.esc(view.title || view.id || '未命名事件链')}</b>
          <span class="story-step">第 ${step + 1}/${total || '?'} 步</span>
        </div>
        <p class="story-text">${DOM.esc(view.text || '')}</p>
        <div class="story-options">${optionHtml || '<span class="muted">这一步没有可选行动。</span>'}</div>
        <div class="story-foot">${skip}</div>
      </div>`);
  }

  return { renderStory };
});
