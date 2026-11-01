// js/render/particles.js —— 粒子系统（金币 / 飘字）
// 上限固定，避免长时间挂机后粒子无限增长。
OPC.define('render.particles', [], function () {
  'use strict';

  const MAX = 200;

  function createSystem() {
    /** @type {Array<object>} */
    let items = [];

    function push(particle) {
      if (items.length >= MAX) items.shift();
      items.push(particle);
    }

    /** 工位头顶撒金币（表示烧 token） */
    function coinBurst(x, y, count = 5) {
      for (let i = 0; i < count; i++) {
        push({
          kind: 'coin',
          x: x + Math.random() * 14 - 2,
          y: y - 6 - i,
          vy: -0.35 - Math.random() * 0.2,
          vx: (Math.random() - 0.5) * 0.25,
          life: 22 + Math.random() * 16,
          color: Math.random() < 0.25 ? '#fff0b3' : '#ffd166',
        });
      }
    }

    /** 飘字：交付 / 逾期 / 突发 */
    function floatText(text, color, x, y, size = 8) {
      push({ kind: 'text', text, color, x, y, vy: -0.28, vx: 0, life: 34, size });
    }

    /** 每帧推进；返回 false 表示已结束 */
    function update() {
      for (const particle of items) {
        particle.x += particle.vx || 0;
        particle.y += particle.vy || 0;
        particle.life -= 1;
      }
      items = items.filter(particle => particle.life > 0);
    }

    /** 绘制（在逻辑坐标系下） */
    function draw(ctx, drawText) {
      for (const particle of items) {
        const alpha = Math.min(1, particle.life / 12);
        ctx.globalAlpha = alpha;
        if (particle.kind === 'text') {
          drawText(ctx, particle.text, particle.x, particle.y, {
            color: particle.color,
            size: particle.size || 8,
            bold: true,
          });
        } else {
          ctx.fillStyle = particle.color;
          ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    function clear() {
      items = [];
    }

    return { coinBurst, floatText, update, draw, clear, count: () => items.length };
  }

  return { createSystem, MAX };
});
