// js/render/office.js —— 像素办公室场景
// 场景逻辑尺寸随容器宽高比自适应：宽屏向两侧加宽、高屏向下加高，
// 保证画布铺满容器且不变形（不裁剪、不留黑边）。
OPC.define('render.office',
['core.util', 'data.catalog', 'domain.office', 'render.sprites', 'render.particles'],
function (U, D, OFFICE, SPR, PART) {
  'use strict';

  const BASE_W = 320;   // 房间基准宽度（逻辑像素）
  const BASE_H = 180;   // 房间基准高度
  const WALL_H = 56;
  const K = 3;          // 每个逻辑像素 = 3 个画布像素
  const ZOOM = 1.16;    // 视野缩放：>1 表示把房间“拍小一点”，四周多露出一些地板与墙
  const MAX_SLOTS = 12;

  // 基础色板保留旧版暖木色；各阶段只覆盖墙 / 地板 / 家具的少量颜色。
  const COLORS = {
    wall: '#4a382c',
    wallDark: '#413026',
    baseboard: '#2a1c14',
    floorA: '#cfa877',
    floorB: '#c39c6b',
    deskTop: '#c08150',
    deskBody: '#8a5733',
    deskLeg: '#573620',
    metal: '#cbb9a3',
    ink: '#1a1109',
    gold: '#ffc46b',
    dim: '#9c8871',
  };

  /** 五种办公室阶段的像素配色。客厅 / 共享办公 / 独立办公室差异最大。 */
  const THEMES = {
    livingRoom: {
      style: 'home',
      wall: '#5a4334', wallDark: '#503a2c', baseboard: '#2b1d15', trim: '#74533d',
      floorA: '#d5ad7b', floorB: '#c79d6b', floorStyle: 'plank', wallStyle: 'wallpaper',
      deskTop: '#c58552', deskBody: '#8d5835', deskLeg: '#56351f',
      rug: '#b37e56', rugEdge: '#9d6946', accent: '#ffc46b',
      leaf: '#7d9a4d', pot: '#a05a34', plaqueBg: '#2a1c14', plaqueInk: '#fff1d8',
    },
    coworking: {
      style: 'cowork',
      wall: '#364947', wallDark: '#2e403e', baseboard: '#1b2826', trim: '#56706b',
      floorA: '#979688', floorB: '#8d8c7e', floorStyle: 'concrete', wallStyle: 'panel',
      deskTop: '#bf9561', deskBody: '#7a563a', deskLeg: '#4a3424',
      rug: '#6c7d74', rugEdge: '#586c62', accent: '#7fd1b8',
      leaf: '#7a9a5d', pot: '#8f5c43', plaqueBg: '#182624', plaqueInk: '#e9fff7',
    },
    studio: {
      style: 'studio',
      wall: '#d8c9ae', wallDark: '#c8b99d', baseboard: '#6d5741', trim: '#f0e5d0',
      floorA: '#aa7e52', floorB: '#9d7148', floorStyle: 'parquet', wallStyle: 'panel',
      deskTop: '#b87a4b', deskBody: '#7c4c2d', deskLeg: '#4b2d1b',
      rug: '#718066', rugEdge: '#5c6c53', accent: '#d3a45e',
      leaf: '#748f50', pot: '#a8613b', plaqueBg: '#493323', plaqueInk: '#fff6e4',
    },
    floor: {
      style: 'floor',
      wall: '#35414e', wallDark: '#2f3a45', baseboard: '#1c232b', trim: '#637383',
      floorA: '#69727b', floorB: '#626b74', floorStyle: 'carpet', wallStyle: 'panel',
      deskTop: '#b4875b', deskBody: '#70513a', deskLeg: '#3f2d22',
      rug: '#4e5b68', rugEdge: '#43505b', accent: '#8dc3e6',
      leaf: '#688e62', pot: '#865a45', plaqueBg: '#18222c', plaqueInk: '#eff8ff',
    },
    campus: {
      style: 'campus',
      wall: '#43533f', wallDark: '#3d4c3a', baseboard: '#24301f', trim: '#6d825a',
      floorA: '#cfb181', floorB: '#c3a475', floorStyle: 'plank', wallStyle: 'green',
      deskTop: '#c08e58', deskBody: '#886039', deskLeg: '#54381f',
      rug: '#778b57', rugEdge: '#65784a', accent: '#a8b263',
      leaf: '#87a552', pot: '#a35e35', plaqueBg: '#263221', plaqueInk: '#f8f4e4',
    },
  };

  /** 墙饰位置：名称 / 描述来自 data.office，这里只决定怎么摆。 */
  const DECOR = {
    livingRoom: {
      style: 'home',
      windows: [
        { x: 8, y: 10, w: 42, h: 30, curtain: '#a9604a' },
        { x: 56, y: 10, w: 42, h: 30, curtain: '#a9604a' },
      ],
      board: { x: 108, y: 8, w: 88, h: 40, title: 'CASH' },
      plaque: { x: 206, y: 10, w: 74, h: 34 },
      clock: { x: 299, y: 26 },
    },
    coworking: {
      style: 'cowork',
      windows: [{ x: 8, y: 10, w: 110, h: 30, industrial: true }],
      board: { x: 126, y: 8, w: 82, h: 40, title: 'SPRINT' },
      plaque: { x: 216, y: 8, w: 72, h: 34 },
      clock: { x: 302, y: 52 },
    },
    studio: {
      style: 'studio',
      windows: [
        { x: 8, y: 10, w: 68, h: 32, blinds: true },
        { x: 84, y: 10, w: 68, h: 32, blinds: true },
      ],
      board: { x: 160, y: 8, w: 70, h: 38, title: 'RUNWAY' },
      plaque: { x: 238, y: 8, w: 64, h: 34 },
      clock: null,
    },
    floor: {
      style: 'floor',
      windows: [
        { x: 8, y: 8, w: 132, h: 34, skyline: true },
        { x: 148, y: 8, w: 84, h: 34, skyline: true },
      ],
      board: null,
      plaque: { x: 240, y: 8, w: 72, h: 36 },
      clock: null,
    },
    campus: {
      style: 'campus',
      windows: [
        { x: 8, y: 8, w: 118, h: 38, garden: true },
        { x: 134, y: 8, w: 84, h: 38, garden: true },
      ],
      board: null,
      plaque: { x: 226, y: 8, w: 86, h: 30 },
      clock: null,
    },
  };

  /**
   * 工位模板：2 人靠窗、4 人一排、6/8/12 人网格。
   * 12 人用 6×2 的紧凑网格，把纵向空间留给 CEO 与前景家具。
   */
  const LAYOUT_TEMPLATES = {
    2: { cols: 2, rows: 1, x0: 52, y0: 98, dx: 154, dy: 0, dense: false },
    4: { cols: 4, rows: 1, x0: 15, y0: 102, dx: 76, dy: 0, dense: false },
    6: { cols: 3, rows: 2, x0: 28, y0: 88, dx: 104, dy: 38, dense: false },
    8: { cols: 4, rows: 2, x0: 10, y0: 86, dx: 68, dy: 38, dense: false },
    12: { cols: 6, rows: 2, x0: 4, y0: 82, dx: 52, dy: 40, dense: true },
  };

  let canvas = null;
  let ctx = null;
  let particles = null;
  let fontScale = 1;
  let compact = false;

  // 当前视图尺寸（逻辑像素）与房间偏移
  let viewW = BASE_W;
  let viewH = BASE_H;
  let roomX = 0;
  let roomY = 0;

  // 当前阶段 / 布局：slotOf 与 tokenBurst 永远读这一份，不依赖固定 8 工位。
  let activeStage = null;
  let activeTheme = THEMES.livingRoom;
  let activeLayout = makeLayout(2);

  // ---------------------------------------------------------------- 初始化
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    particles = PART.createSystem();
    resize();
  }

  /**
   * 按容器宽高比计算逻辑尺寸：
   * 比 16:9 宽 → 增加宽度；比 16:9 高 → 增加高度。房间居中，多出来的部分是同一间屋子的延伸。
   */
  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.height > 0 ? rect.width / rect.height : BASE_W / BASE_H;

    const baseH = Math.round(BASE_H * ZOOM);
    const baseW = Math.round(BASE_W * ZOOM);
    if (aspect >= baseW / baseH) {
      viewH = baseH;
      viewW = U.clamp(Math.round(baseH * aspect), baseW, 760);
    } else {
      viewW = baseW;
      viewH = U.clamp(Math.round(baseW / aspect), baseH, 520);
    }

    roomX = Math.round((viewW - BASE_W) / 2);
    roomY = Math.round((viewH - BASE_H) / 2);

    if (canvas.width !== viewW * K || canvas.height !== viewH * K) {
      canvas.width = viewW * K;
      canvas.height = viewH * K;
    }

    compact = rect.width > 0 && rect.width < 620;
    fontScale = compact ? 1.5 : 1;
  }

  /** 按阶段工位数生成布局；异常值也收敛到 1..12，绘制永远有合法坐标。 */
  function makeLayout(rawCount) {
    const count = U.clamp(Math.round(Number(rawCount) || 2), 1, MAX_SLOTS);
    let template = LAYOUT_TEMPLATES[2];
    if (count > 2) template = LAYOUT_TEMPLATES[4];
    if (count > 4) template = LAYOUT_TEMPLATES[6];
    if (count > 6) template = LAYOUT_TEMPLATES[8];
    if (count > 8) template = LAYOUT_TEMPLATES[12];

    const slots = [];
    for (let i = 0; i < count; i++) {
      slots.push({
        x: template.x0 + (i % template.cols) * template.dx,
        y: template.y0 + Math.floor(i / template.cols) * template.dy,
      });
    }
    const dense = template.dense || count > 9;
    return {
      count,
      dense,
      slots,
      boss: count >= 12
        ? { x: 8, y: 158, w: 46, compact: true }
        : { x: 254, y: 156, w: 58, compact: false },
      rug: count <= 2
        ? { x: 30, y: 82, w: 258, h: 58 }
        : count <= 4
          ? { x: 4, y: 80, w: 312, h: 54 }
          : count <= 8
            ? { x: 4, y: 72, w: 312, h: 82 }
            : { x: 2, y: 62, w: 316, h: 84 },
    };
  }

  /** 读取当前阶段，并只在工位数变化时重建布局。 */
  function syncStage(s) {
    const state = s && typeof s === 'object' ? s : {};
    const stage = OFFICE.stageOf(state);
    const count = U.clamp(Math.round(OFFICE.slots(state) || 2), 1, MAX_SLOTS);
    activeStage = stage || null;
    activeTheme = THEMES[stage && stage.id] || THEMES.livingRoom;
    if (!activeLayout || activeLayout.count !== count) activeLayout = makeLayout(count);
    return activeTheme;
  }

  /** @param {number} index @returns {{x:number,y:number}} 房间坐标系 */
  function slotOf(index) {
    const slots = activeLayout.slots;
    if (!slots.length) return { x: 0, y: 0 };
    const i = U.clamp(Math.round(Number(index) || 0), 0, slots.length - 1);
    return slots[i] || slots[0];
  }

  function tokenBurst(index) {
    if (!particles) return;
    const slot = slotOf(index);
    particles.coinBurst(roomX + slot.x + 16, roomY + slot.y - 26, 5);
  }

  function floatText(text, color) {
    if (!particles) return;
    particles.floatText(text, color, roomX + 262, roomY + 120, 8 * fontScale);
  }

  // ---------------------------------------------------------------- 背景
  function skyColors(day) {
    const phase = ((day % 30) + 30) % 30;
    if (phase < 10) return { top: '#ffd9a0', bottom: '#ffeccd', night: 0 };
    if (phase < 20) return { top: '#e8935a', bottom: '#ffcf9c', night: 0.08 };
    return { top: '#3a2a35', bottom: '#2a1e28', night: 0.3 };
  }

  /** 整幅墙面 + 踢脚线（铺满视图宽度） */
  function drawWallBase(theme) {
    SPR.rect(ctx, 0, 0, viewW, WALL_H, theme.wall);
    if (theme.wallStyle === 'wallpaper') {
      for (let x = 0; x < viewW; x += 32) {
        SPR.rect(ctx, x, 0, 1, WALL_H, theme.wallDark);
        SPR.rect(ctx, x + 16, 0, 1, WALL_H, '#ffffff12');
      }
      SPR.rect(ctx, 0, 42, viewW, 1, theme.trim);
      SPR.rect(ctx, 0, 43, viewW, 6, '#00000018');
    } else if (theme.wallStyle === 'panel') {
      for (let x = 0; x < viewW; x += 40) SPR.rect(ctx, x, 0, 2, WALL_H, theme.wallDark);
      SPR.rect(ctx, 0, 25, viewW, 1, '#ffffff10');
      SPR.rect(ctx, 0, 2, viewW, 1, '#ffffff12');
    } else if (theme.wallStyle === 'green') {
      SPR.rect(ctx, 0, 0, viewW, 4, theme.wallDark);
      for (let x = 12; x < viewW; x += 46) {
        SPR.rect(ctx, x, 8, 3, 3, theme.leaf);
        SPR.rect(ctx, x + 4, 12, 2, 2, theme.leaf);
        SPR.rect(ctx, x - 4, 17, 3, 2, '#6d8a50');
      }
    }
    SPR.rect(ctx, 0, WALL_H - 3, viewW, 3, theme.baseboard);
    SPR.rect(ctx, 0, WALL_H, viewW, 1, theme.trim);
  }

  /** 整幅地板：木地板 / 水泥 / 拼花 / 地毯，近处压暗。 */
  function drawFloorBase(theme) {
    const top = WALL_H;
    SPR.rect(ctx, 0, top, viewW, viewH - top, theme.floorA);

    if (theme.floorStyle === 'plank') {
      for (let y = top; y < viewH; y += 9) {
        SPR.rect(ctx, 0, y, viewW, 9, y % 18 === 0 ? theme.floorA : theme.floorB);
        SPR.rect(ctx, 0, y, viewW, 1, '#6b4a2d33');
        const offset = ((y - top) / 9) % 2 ? 24 : 0;
        for (let x = offset; x < viewW; x += 48) SPR.rect(ctx, x, y + 1, 1, 8, '#6b4a2d22');
      }
    } else if (theme.floorStyle === 'parquet') {
      for (let y = top; y < viewH; y += 12) {
        for (let x = 0; x < viewW; x += 24) {
          const odd = ((x / 24) + Math.floor((y - top) / 12)) % 2;
          SPR.rect(ctx, x, y, 24, 12, odd ? theme.floorA : theme.floorB);
          SPR.rect(ctx, x, y, 1, 12, '#5d3e2877');
          SPR.rect(ctx, x, y, 24, 1, '#5d3e2844');
        }
      }
    } else if (theme.floorStyle === 'carpet') {
      for (let y = top; y < viewH; y += 16) {
        for (let x = 0; x < viewW; x += 16) {
          const odd = ((x / 16) + (y / 16)) % 2 < 1;
          SPR.rect(ctx, x, y, 16, 16, odd ? theme.floorA : theme.floorB);
          SPR.rect(ctx, x + 2, y + 7, 12, 1, '#0000000d');
        }
      }
    } else {
      for (let y = top; y < viewH; y += 32) {
        for (let x = 0; x < viewW; x += 32) {
          const odd = ((x / 32) + (y / 32)) % 2 < 1;
          SPR.rect(ctx, x, y, 32, 32, odd ? theme.floorA : theme.floorB);
          SPR.rect(ctx, x, y, 32, 1, '#2f3c3a33');
          SPR.rect(ctx, x, y, 1, 32, '#2f3c3a22');
        }
      }
      for (let x = 0; x < viewW; x += 67) {
        SPR.rect(ctx, x, top + 13, 2, 2, '#ffffff12');
      }
    }

    const fade = Math.min(40, Math.round((viewH - WALL_H) * 0.28));
    for (let y = viewH - fade; y < viewH; y += 2) {
      ctx.fillStyle = `rgba(28, 18, 12, ${0.05 + ((y - (viewH - fade)) / Math.max(fade, 1)) * 0.26})`;
      ctx.fillRect(0, y, viewW, 2);
    }
    ctx.fillStyle = 'rgba(12, 8, 5, .38)';
    ctx.fillRect(0, WALL_H, viewW, 3);
  }

  // ---------------------------------------------------------------- 墙饰
  function drawWindow(win, frame, day, style) {
    const sky = skyColors(day);
    SPR.rect(ctx, win.x - 2, win.y - 2, win.w + 4, win.h + 4, COLORS.ink);
    SPR.rect(ctx, win.x, win.y, win.w, win.h, sky.top);
    SPR.rect(ctx, win.x, win.y + Math.round(win.h * 0.62), win.w, Math.round(win.h * 0.38), sky.bottom);

    const drift = (frame * 0.12 + win.x * 0.7) % (win.w + 18);
    const cloudX = win.x + drift - 12;
    SPR.rect(ctx, Math.max(win.x + 1, cloudX), win.y + 7, 9, 2, '#fff6e6dd');
    SPR.rect(ctx, Math.max(win.x + 1, cloudX) + 2, win.y + 6, 5, 1, '#fff6e6dd');

    const count = style === 'skyline' ? 8 : 5;
    for (let i = 0; i < count; i++) {
      const bx = win.x + 3 + i * Math.max(8, Math.floor((win.w - 6) / count));
      const bh = 4 + ((i * 7 + day) % 6);
      SPR.rect(ctx, bx, win.y + win.h - bh - 1, 6, bh, sky.night > 0.2 ? '#2a1e22' : '#d9b98d');
    }

    if (style === 'blinds') {
      for (let y = win.y + 3; y < win.y + win.h - 2; y += 4) {
        SPR.rect(ctx, win.x + 1, y, win.w - 2, 1, '#fff7e8aa');
      }
    } else if (style === 'industrial') {
      SPR.rect(ctx, win.x + Math.round(win.w * 0.33), win.y, 2, win.h, COLORS.ink);
      SPR.rect(ctx, win.x + Math.round(win.w * 0.66), win.y, 2, win.h, COLORS.ink);
      SPR.line(ctx, win.x + 2, win.y + win.h - 2, win.x + win.w - 2, win.y + 2, '#241b15aa');
    } else if (style === 'garden') {
      SPR.rect(ctx, win.x + 1, win.y + win.h - 6, win.w - 2, 5, '#7f9e5144');
      SPR.rect(ctx, win.x + 5, win.y + 3, 3, 3, '#87a55288');
      SPR.rect(ctx, win.x + win.w - 12, win.y + 6, 3, 3, '#87a55288');
    }

    SPR.rect(ctx, win.x + Math.round(win.w / 2) - 1, win.y, 2, win.h, COLORS.ink);
    SPR.rect(ctx, win.x, win.y + Math.round(win.h / 2) - 1, win.w, 2, COLORS.ink);
    SPR.frame(ctx, win.x - 2, win.y - 2, win.w + 4, win.h + 4, '#140d08');

    if (win.curtain) {
      SPR.rect(ctx, win.x - 5, win.y - 3, 5, win.h + 9, win.curtain);
      SPR.rect(ctx, win.x + win.w, win.y - 3, 5, win.h + 9, win.curtain);
      SPR.rect(ctx, win.x - 5, win.y - 3, 5, 2, '#d39b78');
      SPR.rect(ctx, win.x + win.w, win.y - 3, 5, 2, '#d39b78');
      SPR.rect(ctx, win.x - 7, win.y - 5, win.w + 14, 2, '#7a4d38');
    }
  }

  /** 白板上的现金折线：数据只读，无数据时画一条平线。 */
  function drawWhiteboard(s, board, theme) {
    SPR.rect(ctx, board.x, board.y, board.w, board.h, '#f4ead6');
    SPR.frame(ctx, board.x, board.y, board.w, board.h, '#b09a7d');
    SPR.text(ctx, board.title || 'CASH', board.x + 4, board.y + 9, {
      size: 5 * fontScale, color: theme.plaqueBg, align: 'left', shadow: null,
    });

    const hist = Array.isArray(s.hist) && s.hist.length ? s.hist : [0];
    const max = Math.max.apply(null, hist);
    const min = Math.min.apply(null, hist.concat([0]));
    const span = (max - min) || 1;
    const left = board.x + 4;
    const right = board.x + board.w - 4;
    const top = board.y + 13;
    const bottom = board.y + board.h - 5;

    SPR.rect(ctx, left, bottom, right - left, 1, '#cdbba0');
    for (let i = 1; i < hist.length; i++) {
      const x1 = left + Math.round((i - 1) * (right - left) / Math.max(hist.length - 1, 1));
      const y1 = bottom - Math.round((hist[i - 1] - min) / span * (bottom - top));
      const x2 = left + Math.round(i * (right - left) / Math.max(hist.length - 1, 1));
      const y2 = bottom - Math.round((hist[i] - min) / span * (bottom - top));
      SPR.line(ctx, x1, y1, x2, y2, hist[i] >= hist[i - 1] ? '#7d8f46' : '#c0553f');
    }
    SPR.rect(ctx, board.x + board.w - 14, board.y + 4, 9, 7, '#ffd166');
    SPR.text(ctx, 'D', board.x + board.w - 9, board.y + 9, {
      size: 4 * fontScale, color: theme.plaqueBg, shadow: null,
    });
  }

  function drawPlaque(stage, box, theme) {
    if (!box) return;
    const name = stage && (stage.name || stage.id) ? String(stage.name || stage.id) : '办公室';
    const desc = stage && stage.desc ? String(stage.desc).split(/[，。；]/)[0] : '';
    SPR.rect(ctx, box.x, box.y, box.w, box.h, theme.plaqueBg);
    SPR.frame(ctx, box.x, box.y, box.w, box.h, theme.accent);
    SPR.rect(ctx, box.x + 3, box.y + 3, box.w - 6, 1, '#ffffff22');
    SPR.text(ctx, name, box.x + box.w / 2, box.y + 12, {
      size: 5.6 * fontScale, color: theme.plaqueInk, bold: true, shadow: null,
    });
    if (desc) {
      SPR.text(ctx, desc.length > 11 ? `${desc.slice(0, 10)}…` : desc, box.x + box.w / 2, box.y + 23, {
        size: 4.4 * fontScale, color: theme.accent, shadow: null,
      });
    }
  }

  function drawClock(clock, frame) {
    if (!clock) return;
    const { x, y } = clock;
    SPR.rect(ctx, x - 7, y - 7, 14, 14, '#140d08');
    SPR.rect(ctx, x - 6, y - 6, 12, 12, '#f4ecd8');
    const minute = Math.floor(frame / 6) % 12;
    SPR.line(ctx, x, y,
      x + Math.round(Math.cos(minute / 12 * Math.PI * 2) * 4),
      y + Math.round(Math.sin(minute / 12 * Math.PI * 2) * 4), '#4a382c');
    SPR.rect(ctx, x - 1, y - 1, 2, 2, '#c0453c');
  }

  /** 每个阶段的墙面小装饰，让三套风格一眼能分辨。 */
  function drawWallExtras(style, theme, frame) {
    if (style === 'home') {
      SPR.rect(ctx, 4, 2, 312, 1, '#c9a87d');
      for (let x = 14; x < 316; x += 28) {
        SPR.rect(ctx, x, 3, 2, 2, frame % 80 < 40 ? '#ffd166' : '#8a6d47');
      }
    } else if (style === 'cowork') {
      SPR.rect(ctx, 0, 2, BASE_W, 2, '#1c2928');
      for (let x = 16; x < BASE_W; x += 72) {
        SPR.rect(ctx, x, 1, 3, 6, '#5e716c');
        SPR.rect(ctx, x + 1, 6, 1, 9, '#aab8ad66');
      }
    } else if (style === 'floor') {
      SPR.rect(ctx, 4, 2, 312, 1, '#8dc3e655');
      SPR.rect(ctx, 12, 4, 44, 1, '#8dc3e633');
    } else if (style === 'campus') {
      for (let x = 14; x < BASE_W; x += 88) {
        SPR.rect(ctx, x, 0, 1, 8 + (x % 7), '#6e8b51');
        SPR.rect(ctx, x - 3, 7 + (x % 7), 7, 2, theme.leaf);
      }
    }
  }

  function drawWallDecor(s, frame, stage) {
    const theme = activeTheme;
    const decor = DECOR[stage && stage.id] || DECOR.livingRoom;
    for (const win of decor.windows) drawWindow(win, frame, s.day || 0, win.blinds ? 'blinds' : win.industrial ? 'industrial' : win.skyline ? 'skyline' : win.garden ? 'garden' : 'home');
    if (decor.board) drawWhiteboard(s, decor.board, theme);
    drawPlaque(stage, decor.plaque, theme);
    drawClock(decor.clock, frame);
    drawWallExtras(decor.style, theme, frame);
  }

  // ---------------------------------------------------------------- 家具
  function drawServerRack(x, y, busyCount, slots) {
    const h = 54;
    SPR.rect(ctx, x, y, 26, h, '#241a15');
    SPR.frame(ctx, x, y, 26, h, '#140d08');
    const ratio = slots > 0 ? busyCount / slots : 0;
    for (let bay = 0; bay < 6; bay++) {
      const by = y + 4 + bay * 8;
      SPR.rect(ctx, x + 2, by, 22, 6, '#2e211a');
      const on = ((bay * 13 + Math.floor(by)) % 11) < 3 + ratio * 7;
      SPR.rect(ctx, x + 4, by + 2, 2, 2, on ? '#a8b263' : '#3f4a2a');
      SPR.rect(ctx, x + 8, by + 2, 2, 2, (bay + Math.floor(by / 2)) % 5 === 0 ? COLORS.gold : '#4d3a1f');
      SPR.rect(ctx, x + 14, by + 2, 6, 1, '#1b120c');
    }
  }

  function drawCooler(x, y) {
    SPR.rect(ctx, x + 2, y + 6, 10, 12, '#e6d9c3');
    SPR.rect(ctx, x + 2, y + 6, 10, 2, '#b5a48c');
    SPR.rect(ctx, x + 4, y + 2, 6, 5, '#cfe3d9');
    SPR.rect(ctx, x + 4, y + 1, 6, 1, '#e6f2ea');
    SPR.rect(ctx, x + 5, y + 9, 2, 2, '#c98a5b');
    SPR.rect(ctx, x + 8, y + 9, 2, 2, '#c0553f');
    SPR.rect(ctx, x + 2, y + 18, 10, 2, '#8f7761');
  }

  function drawBox(x, y) {
    SPR.rect(ctx, x, y, 13, 10, '#c08a52');
    SPR.rect(ctx, x, y, 13, 2, '#cfa06a');
    SPR.rect(ctx, x + 5, y, 3, 10, '#a87a48');
    SPR.rect(ctx, x + 6, y - 1, 1, 1, '#8a6238');
  }

  function drawSofa(x, y, theme) {
    SPR.rect(ctx, x, y, 54, 4, '#5f3e31');
    SPR.rect(ctx, x + 2, y + 4, 50, 12, '#8b5b4a');
    SPR.rect(ctx, x, y + 4, 3, 14, '#6f4639');
    SPR.rect(ctx, x + 51, y + 4, 3, 14, '#6f4639');
    SPR.rect(ctx, x + 2, y + 16, 4, 2, '#4d2f22');
    SPR.rect(ctx, x + 48, y + 16, 4, 2, '#4d2f22');
    SPR.rect(ctx, x + 8, y + 5, 16, 5, '#a8654f');
    SPR.rect(ctx, x + 30, y + 5, 16, 5, '#a8654f');
    SPR.rect(ctx, x + 4, y + 4, 2, 12, theme.accent);
  }

  function drawPlant(x, y, theme, scale = 1) {
    SPR.rect(ctx, x + 2 * scale, y + 8 * scale, 9 * scale, 8 * scale, theme.pot);
    SPR.rect(ctx, x + 2 * scale, y + 8 * scale, 9 * scale, 2 * scale, '#8a4a28');
    SPR.rect(ctx, x, y, 13 * scale, 9 * scale, theme.leaf);
    SPR.rect(ctx, x + 3 * scale, y - 4 * scale, 8 * scale, 6 * scale, '#87a552');
    SPR.rect(ctx, x + 5 * scale, y - 7 * scale, 4 * scale, 4 * scale, '#9cb968');
  }

  function drawCoffeeBar(x, y, theme) {
    SPR.rect(ctx, x, y, 76, 17, '#5c3d28');
    SPR.rect(ctx, x, y, 76, 3, '#b07c4c');
    SPR.rect(ctx, x + 4, y - 8, 20, 8, '#3a2a20');
    SPR.rect(ctx, x + 7, y - 5, 14, 3, '#e6d9c3');
    SPR.rect(ctx, x + 32, y - 5, 4, 5, '#f4ecd8');
    SPR.rect(ctx, x + 39, y - 5, 4, 5, '#e8e4f0');
    SPR.rect(ctx, x + 54, y - 10, 4, 10, '#cfe3d9');
    SPR.rect(ctx, x + 56, y - 8, 2, 2, theme.accent);
  }

  function drawShelf(x, y, theme) {
    SPR.rect(ctx, x, y, 34, 28, '#6a472d');
    SPR.rect(ctx, x + 2, y + 2, 30, 24, '#3b2a1c');
    for (let row = 0; row < 3; row++) {
      SPR.rect(ctx, x + 2, y + 3 + row * 8, 30, 1, '#b78958');
      for (let col = 0; col < 3; col++) {
        SPR.rect(ctx, x + 5 + col * 9, y + 4 + row * 8, 5, 5, ['#a85b4f', '#7d8f46', '#c9a35e'][(row + col) % 3]);
      }
    }
    SPR.rect(ctx, x + 30, y - 3, 3, 3, theme.accent);
  }

  function drawCoffeeTable(x, y, theme) {
    SPR.rect(ctx, x, y, 38, 3, '#8f633f');
    SPR.rect(ctx, x + 2, y + 3, 2, 8, '#5a3b25');
    SPR.rect(ctx, x + 34, y + 3, 2, 8, '#5a3b25');
    SPR.rect(ctx, x + 12, y - 4, 6, 4, '#f4ecd8');
    SPR.rect(ctx, x + 24, y - 2, 8, 2, theme.accent);
  }

  /** 工位区地毯：只比地板深一点点，靠一圈浅边线区分。 */
  function drawRug(theme) {
    const rug = activeLayout.rug;
    SPR.rect(ctx, rug.x, rug.y, rug.w, rug.h, theme.rug);
    SPR.rect(ctx, rug.x, rug.y, rug.w, 1, theme.rugEdge);
    SPR.rect(ctx, rug.x, rug.y + rug.h - 1, rug.w, 1, theme.rugEdge);
    SPR.rect(ctx, rug.x, rug.y, 1, rug.h, theme.rugEdge);
    SPR.rect(ctx, rug.x + rug.w - 1, rug.y, 1, rug.h, theme.rugEdge);
    SPR.rect(ctx, rug.x + 4, rug.y + 4, rug.w - 8, 1, '#ffffff14');
    if (theme.style === 'cowork') {
      for (let x = rug.x + 12; x < rug.x + rug.w - 8; x += 32) {
        SPR.rect(ctx, x, rug.y + 8, 14, 1, '#ffffff0e');
      }
    }
  }

  /** 前景家具：不同阶段换一套，保持工位之间可通行。 */
  function drawStageFurniture(stage, busyCount) {
    const style = (DECOR[stage && stage.id] || DECOR.livingRoom).style;
    const theme = activeTheme;
    const count = activeLayout.count;
    if (style === 'home') {
      drawSofa(104, 158, theme);
      drawPlant(2, 146, theme);
      drawPlant(300, 140, theme);
      drawBox(232, 166);
      drawBox(244, 168);
      drawCoffeeTable(174, 164, theme);
      drawCooler(82, 150);
    } else if (style === 'cowork') {
      drawCoffeeBar(6, 160, theme);
      drawCooler(88, 150);
      drawPlant(2, 130, theme);
      drawPlant(300, 146, theme);
      drawServerRack(290, 64, busyCount, count);
      drawBox(212, 166);
    } else if (style === 'studio') {
      drawShelf(6, 148, theme);
      drawSofa(106, 160, theme);
      drawPlant(154, 154, theme, 1.2);
      drawCooler(196, 150);
      drawPlant(300, 148, theme);
      drawBox(232, 168);
    } else if (style === 'floor') {
      drawShelf(6, 148, theme);
      drawSofa(96, 160, theme);
      drawCoffeeTable(154, 164, theme);
      drawPlant(2, 140, theme);
      drawPlant(300, 142, theme);
      drawCooler(214, 150);
      drawBox(236, 168);
    } else if (style === 'campus') {
      drawSofa(90, 160, theme);
      drawCoffeeTable(150, 164, theme);
      drawPlant(2, 136, theme, 1.2);
      drawPlant(300, 136, theme, 1.2);
      drawPlant(54, 160, theme);
      drawBox(210, 166);
    }
  }

  function drawDesk(x, y, agent, s, frame, showLabel) {
    const busy = !!(agent && agent.busy);
    const theme = activeTheme;
    const dense = activeLayout.dense;

    if (agent) {
      const model = U.byId(s.models || [], agent.modelId) || U.byId(D.models, agent.modelId);
      const bob = busy && frame % 8 < 4 ? 1 : 0;
      SPR.sprite(ctx, SPR.ROBOT, x + 7, y - 30 + bob, {
        k: COLORS.ink,
        b: model ? model.color : '#b09a7d',
        m: COLORS.ink,
        e: busy ? '#ffd9a0' : '#6b5b47',
        a: busy && frame % 6 < 3 ? '#e2574c' : '#6b3a2a',
      });
    }

    SPR.rect(ctx, x + 9, y - 12, 15, 10, '#140d08');
    SPR.rect(ctx, x + 10, y - 11, 13, 8, busy ? '#ffd9a0' : '#33241a');
    if (busy) {
      for (let line = 0; line < 3; line++) {
        SPR.rect(ctx, x + 11, y - 10 + line * 2, 4 + (line % 2) * 5, 1, '#7a4a1a');
      }
    }
    SPR.rect(ctx, x + 15, y - 2, 3, 2, '#3a2a20');

    SPR.rect(ctx, x - 2, y - 2, 38, 3, theme.deskTop);
    SPR.rect(ctx, x - 2, y + 1, 38, 8, theme.deskBody);
    SPR.rect(ctx, x - 2, y + 1, 38, 1, '#96653c');
    SPR.rect(ctx, x + 1, y + 9, 2, 6, theme.deskLeg);
    SPR.rect(ctx, x + 33, y + 9, 2, 6, theme.deskLeg);

    SPR.rect(ctx, x + 28, y - 5, 4, 3, '#f4ecd8');
    SPR.rect(ctx, x + 28, y - 6, 4, 1, '#d3c3a4');
    SPR.rect(ctx, x + 10, y - 1, 12, 1, '#dcc9a6');

    if (!showLabel) return;
    const name = agent ? String(agent.name || 'agent') : '空工位';
    const shown = dense && name.length > 5 ? `${name.slice(0, 4)}…` : name;
    SPR.text(ctx, agent ? `${shown} Lv${agent.level}` : shown, x + 16, y + (dense ? 8 : 22), {
      size: (dense ? 4.5 : 5.5) * fontScale,
      color: agent ? theme.plaqueInk : COLORS.dim,
      shadow: '#000000aa',
    });
  }

  function drawBoss(frame) {
    const { x, y, w, compact: small } = activeLayout.boss;
    const theme = activeTheme;
    const scale = small ? 1 : 1.6;
    const labelY = small ? y + 18 : y + 21;
    if (!small) {
      SPR.rect(ctx, x + 34, y - 16, 12, 14, '#3a2a1a');
      SPR.sprite(ctx, SPR.BOSS, x + 30, y - 30, {
        h: '#2f2114', s: '#f2c9a0', k: '#241a12', m: '#b85c4e', t: '#c0453c',
      }, scale);
    } else {
      SPR.sprite(ctx, SPR.BOSS, x + 17, y - 12, {
        h: '#2f2114', s: '#f2c9a0', k: '#241a12', m: '#b85c4e', t: '#c0453c',
      }, 1);
    }

    SPR.rect(ctx, x, y - 2, w, 3, theme.deskTop);
    SPR.rect(ctx, x, y + 1, w, small ? 7 : 12, theme.deskBody);
    SPR.rect(ctx, x + 4, y + 3, Math.max(6, w - 12), 1, '#4a2b18');
    SPR.rect(ctx, x + 2, y - 8, small ? 9 : 14, 7, '#1b1008');
    SPR.rect(ctx, x + 3, y - 7, small ? 7 : 12, 5, frame % 40 < 20 ? '#ffc46b' : '#f0b45a');
    SPR.rect(ctx, x + w - 6, y - 4, 4, 3, '#f4ecd8');

    SPR.text(ctx, '你 (CEO)', x + w / 2, labelY, {
      size: (small ? 4.5 : 6) * fontScale, color: COLORS.gold, bold: true, shadow: '#000000cc',
    });
  }

  // ---------------------------------------------------------------- 主绘制
  function draw(s, frame) {
    if (!ctx) return;
    const state = s && typeof s === 'object' ? s : {};
    syncStage(state);
    const agents = Array.isArray(state.agents) ? state.agents : [];
    const busyCount = agents.filter(agent => agent && agent.busy).length;
    const theme = activeTheme;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(K, 0, 0, K, 0, 0);

    // 房间底色铺满整个视图（多出来的部分与房间同色，视觉上连成一体）
    SPR.rect(ctx, 0, 0, viewW, viewH, theme.wallDark);
    drawWallBase(theme);
    drawFloorBase(theme);

    // 墙饰跟随房间水平居中
    ctx.save();
    ctx.translate(roomX, 0);
    drawWallDecor(state, frame, activeStage);
    ctx.restore();

    // 地面家具：垂直方向居中（高屏时上下各多出一条地板）
    ctx.save();
    ctx.translate(roomX, roomY);

    drawRug(theme);
    drawStageFurniture(activeStage, busyCount);

    const order = activeLayout.slots.map((slot, index) => ({ slot, index }))
      .sort((a, b) => a.slot.y - b.slot.y);
    const frontY = Math.max(...activeLayout.slots.map(slot => slot.y));
    for (const item of order) {
      drawDesk(item.slot.x, item.slot.y, agents[item.index], state, frame, item.slot.y === frontY);
    }

    drawBoss(frame);
    ctx.restore();

    // 两侧多出来的空间：补一些装饰，避免显得空
    if (roomX > 18) {
      drawPlant(8, Math.round(viewH * 0.55), theme);
      drawPlant(viewW - 26, Math.round(viewH * 0.5), theme);
      drawBox(24, Math.round(viewH * 0.8));
      drawBox(viewW - 40, Math.round(viewH * 0.78));
    }

    const night = skyColors(state.day || 0).night;
    if (night > 0) {
      ctx.fillStyle = `rgba(24, 16, 20, ${night})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }
    const glow = ctx.createLinearGradient(0, 0, 0, viewH);
    glow.addColorStop(0, theme.style === 'studio' ? 'rgba(255, 228, 180, .08)' : 'rgba(255, 196, 107, .10)');
    glow.addColorStop(0.45, 'rgba(255, 196, 107, .02)');
    glow.addColorStop(1, 'rgba(255, 196, 107, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, viewW, viewH);

    particles.update();
    particles.draw(ctx, SPR.text);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { init, draw, tokenBurst, floatText, slotOf, resize };
});
