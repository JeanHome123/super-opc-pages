// js/render/sprites.js —— 字符点阵精灵 + 绘制原语
// 说明：这里的数字都是「像素坐标」，属于美术参数，不放 data/balance（那里放玩法数值）。
OPC.define('render.sprites', [], function () {
  'use strict';

  const FONT = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';

  /** 机器人（9×11）。字母 = 调色板键，'.' = 透明 */
  const ROBOT = [
    '....a....',
    '....k....',
    '.kkkkkkk.',
    '.kbbbbbk.',
    '.kbebebk.',
    '.kbbbbbk.',
    '.kbbmbbk.',
    '.kkkkkkk.',
    'kkbbbbbkk',
    'kbbbbbbbk',
    'kbbbbbbbk',
  ];

  /** 老板（9×9）：h 头发 / s 皮肤 / k 眼睛 / m 嘴 / t 衣服 */
  const BOSS = [
    '..hhhhh..',
    '.hhhhhhh.',
    '.hsssssh.',
    '.sksssks.',
    '..ssmss..',
    '...sss...',
    '.ttttttt.',
    'ttttttttt',
    'ttttttttt',
  ];

  /** 实心矩形（整数坐标，保证像素锐利） */
  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 1px 描边矩形 */
  function frame(ctx, x, y, w, h, color) {
    rect(ctx, x, y, w, 1, color);
    rect(ctx, x, y + h - 1, w, 1, color);
    rect(ctx, x, y, 1, h, color);
    rect(ctx, x + w - 1, y, 1, h, color);
  }

  /**
   * 点阵精灵。
   * @param {CanvasRenderingContext2D} ctx
   * @param {string[]} rows
   * @param {number} x @param {number} y
   * @param {Object<string,string>} palette 字母 → 颜色
   * @param {number} [k] 放大倍数
   */
  function sprite(ctx, rows, x, y, palette, k = 2) {
    for (let row = 0; row < rows.length; row++) {
      const line = rows[row];
      for (let col = 0; col < line.length; col++) {
        const key = line[col];
        if (key === '.') continue;
        const color = palette[key];
        if (!color) continue;
        rect(ctx, x + col * k, y + row * k, k, k, color);
      }
    }
  }

  /**
   * 文本（像素风的硬阴影）。
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} content
   * @param {number} x @param {number} y
   * @param {{size?:number, color?:string, align?:string, bold?:boolean, shadow?:string}} [opts]
   */
  function text(ctx, content, x, y, opts = {}) {
    const { size = 6, color = '#f4ecd8', align = 'center', bold = false, shadow = '#00000099' } = opts;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    if (shadow) {
      ctx.fillStyle = shadow;
      ctx.fillText(content, Math.round(x) + 1, Math.round(y) + 1);
    }
    ctx.fillStyle = color;
    ctx.fillText(content, Math.round(x), Math.round(y));
  }

  /** 两点之间的像素线（用于白板折线、电缆） */
  function line(ctx, x1, y1, x2, y2, color) {
    ctx.fillStyle = color;
    let x = Math.round(x1);
    let y = Math.round(y1);
    const tx = Math.round(x2);
    const ty = Math.round(y2);
    const dx = Math.abs(tx - x);
    const dy = Math.abs(ty - y);
    const sx = x < tx ? 1 : -1;
    const sy = y < ty ? 1 : -1;
    let err = dx - dy;

    for (;;) {
      ctx.fillRect(x, y, 1, 1);
      if (x === tx && y === ty) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  return { FONT, ROBOT, BOSS, rect, frame, sprite, text, line };
});
