/**
 * @fileoverview Rendering patterns for human inspection. `toGrid` turns a
 * pattern into an ASCII step grid (one row per instrument), handy for debugging
 * and previews.
 */

/**
 * Renders a pattern as a human-readable ASCII step grid (one row per
 * instrument, `X` = hit), useful for debugging and previews.
 * @param {!Pattern} pattern The pattern to render.
 * @return {string} The multi-line grid.
 */
export function toGrid(pattern) {
  const A = {
    kick: 'K ',
    snare: 'Sn',
    ghost: ' g',
    hat: 'hh',
    openhat: 'OH',
    ride: 'Rd',
    crash: 'CR',
    perc: 'pc',
    tom1: 'T1',
    tom2: 'T2',
    tom3: 'T3',
    tom4: 'T4',
  };
  const ord = [
    'crash',
    'openhat',
    'ride',
    'hat',
    'perc',
    'tom1',
    'tom2',
    'tom3',
    'tom4',
    'snare',
    'ghost',
    'kick',
  ];
  const rows = {};
  for (const h of pattern.steps) {
    (rows[h.inst] = rows[h.inst] || Array(16).fill('. '))[h.step] = 'X ';
  }
  return ord
    .filter((r) => rows[r])
    .map((r) => `${A[r]}|${rows[r].join('')}|`)
    .join('\n');
}
