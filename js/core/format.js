// js/core/format.js —— 显示格式化（纯函数，UI 与日志共用）
OPC.define('core.format', [], function () {
  'use strict';

  /** ¥1,234（负数显示为 -¥1,234） */
  const money = n => (n < 0 ? '-¥' : '¥') + Math.round(Math.abs(n)).toLocaleString('zh-CN');

  /** 0.856 → '86%' */
  const percent = (v, digits = 0) => `${(v * 100).toFixed(digits)}%`;

  /** 正数带 + 号 */
  const signed = n => (n > 0 ? `+${n}` : `${n}`);

  /** 精力 / 声誉这类 0~100 的整数 */
  const int = n => String(Math.round(n));

  /** 第 N 天 / 第 M 月 */
  const dayLabel = day => `第 ${day} 天`;
  const monthOf = day => Math.floor(day / 30) + 1;

  /** 模型价格：¥4 / ¥1.5 */
  const price = n => `¥${Math.round(n * 10) / 10}`;

  return { money, percent, signed, int, dayLabel, monthOf, price };
});
