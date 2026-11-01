// js/boot.js —— 启动器：按 manifest 串行注入模块脚本，然后启动 app
// 串行（async=false）保证执行顺序，file:// 下也能正常工作，无需打包器。
(function (global) {
  'use strict';

  const files = global.OPC_MANIFEST;
  const statusEl = document.getElementById('bootStatus');
  const overlay = document.getElementById('boot');

  // 以 boot.js 自身位置为基准解析模块路径：这样页面放在任何子目录都能正确加载。
  const BASE = (function resolveBase() {
    const self = document.currentScript;
    if (!self || !self.src) return '';
    return self.src.replace(/js\/boot\.js(\?[^#]*)?(#.*)?$/, '');
  })();

  function fail(file, error) {
    console.error('[boot] 加载失败', file, error);
    if (statusEl) {
      statusEl.innerHTML =
        `<b class="bad">模块加载失败</b><br><span class="dim">${file}</span>` +
        `<br><span class="dim">按 F12 打开控制台查看详细错误；或检查 js/manifest.js 里的路径。</span>`;
    }
  }

  function done() {
    try {
      const app = global.OPC.boot('app');
      if (app && typeof app.start === 'function') app.start();
      if (overlay) overlay.remove();
    } catch (error) {
      console.error('[boot] 启动失败', error);
      if (statusEl) statusEl.innerHTML = `<b class="bad">启动失败</b><br><span class="dim">${error.message}</span>`;
    }
  }

  function loadAt(index) {
    if (index >= files.length) return done();

    const script = document.createElement('script');
    script.src = BASE + files[index];
    script.async = false;
    script.onload = () => loadAt(index + 1);
    script.onerror = () => fail(files[index]);
    document.head.appendChild(script);
  }

  if (!files || !files.length) {
    fail('js/manifest.js', new Error('OPC_MANIFEST 为空'));
    return;
  }
  loadAt(0);
})(typeof globalThis !== 'undefined' ? globalThis : this);
