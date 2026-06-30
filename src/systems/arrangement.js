/**
 * @fileoverview Turning params into a song's raw material: `songScenes` plans
 * the scene list from a base structure (jittered by predictability/complexity),
 * and `buildSection`/`buildFill`/`turnaround` render each scene into multi-bar
 * step data by delegating to the groove and meter systems.
 */

import {STRUCTURES} from '../config.js';
import {rng} from '../utils/random.js';
import {cloneSteps} from '../utils/steps.js';
import {shaped, rhythmGroove, groove1bar} from './grooves.js';
import {meterGroove} from './meter.js';
import {generateFill} from './voices.js';

// turnaround = varied last bar before a section repeats/changes; flavor + intensity from p.turnaround
/**
 * Varies the last bar of a section (tom fill, snare build, drop, or open) to
 * lead into the next, scaled by `p.turnaround`.
 * @param {!Array<!Object>} groove1 The section's one-bar groove.
 * @param {!Object} p The base params.
 * @param {number} seed Deterministic RNG seed.
 * @return {!Array<!Object>} The turnaround bar's hits.
 */
function turnaround(groove1, p, seed) {
  const rnd = rng(seed);
  const t = p.turnaround != null ? p.turnaround : 0.6;
  let bar = groove1.filter(
    (h) => !(h.step >= 12 && (h.inst === 'hat' || h.inst === 'openhat')),
  );
  const flavor =
    t < 0.34
      ? 'tom'
      : ['tom', 'snareBuild', 'drop', 'open'][Math.floor(rnd() * 4)];
  if (flavor === 'tom') {
    const toms = ['tom1', 'tom2', 'tom3', 'tom4'];
    if (t > 0.6)
      [12, 13, 14, 15].forEach((st, i) => {
        if (i % 2 === 0 || rnd() < t)
          bar.push({
            step: st,
            inst: toms[i],
            velocity: i % 2 ? 75 : 100,
            micro: 0,
          });
      });
    else {
      bar.push({step: 12, inst: 'tom1', velocity: 100, micro: 0});
      bar.push({step: 14, inst: 'tom3', velocity: 95, micro: 0});
    }
    bar.push({step: 15, inst: 'snare', velocity: 88, micro: 0});
  } else if (flavor === 'snareBuild') {
    bar = bar.filter(
      (h) => !(h.step >= 12 && (h.inst === 'snare' || h.inst === 'ghost')),
    );
    [12, 13, 14, 15].forEach((st, i) =>
      bar.push({
        step: st,
        inst: 'snare',
        velocity: Math.min(120, 68 + i * 16),
        micro: 0,
      }),
    );
  } else if (flavor === 'drop') {
    bar = bar.filter((h) => h.step < 12);
    if (rnd() < t) bar.push({step: 14, inst: 'snare', velocity: 70, micro: 0});
    bar.push({step: 15, inst: 'snare', velocity: 92, micro: 0});
  } else {
    bar = bar.filter((h) => !(h.step >= 12 && h.inst === 'kick'));
    bar.push({step: 14, inst: 'openhat', velocity: 92, micro: 0});
    bar.push({step: 15, inst: 'kick', velocity: 96, micro: 0});
  }
  return bar;
}

// multi-bar section
/**
 * Builds a multi-bar section: dispatches fills and odd meters, otherwise lays
 * four bars of groove with an optional turnaround on the last bar.
 * @param {!Object} base The base params.
 * @param {string} role The section role (or `'fill:X'` / `'meter:X'`).
 * @param {number} seed Deterministic RNG seed.
 * @param {?number} gateSeed Independent seed for the turnaround gate.
 * @param {?number} intensity Section intensity (0..1), threaded in as `_I`.
 * @return {{steps: !Array<!Object>, bars: number, role: string}} The section.
 */
export function buildSection(base, role, seed, gateSeed, intensity) {
  if (role.indexOf('fill') === 0) return buildFill(base, role, seed);
  if (role.indexOf('meter:') === 0)
    return meterGroove(
      intensity != null ? {...base, _I: intensity} : base,
      role.split(':')[1],
      2,
      seed,
    );
  const b = intensity != null ? {...base, _I: intensity} : base;
  const bars = 4;
  const turn = new Set(['verse', 'verseGh', 'variation', 'chorus']);
  const trnd = rng((gateSeed != null ? gateSeed : seed) * 3 + 7);
  const RH = new Set(['halftime', 'doubletime', 'broken']);
  const clave = b.feel === 'bossa' || b.feel === 'latin'; // 2-bar feels: regenerate groove per bar
  const g = RH.has(role)
    ? rhythmGroove(b, role, seed)
    : clave
      ? null
      : groove1bar(b, role, seed);
  const steps = [];
  for (let bb = 0; bb < bars; bb++) {
    const g1 = clave ? groove1bar(b, role, seed, bb) : g;
    const doTurn =
      bb === bars - 1 &&
      turn.has(role) &&
      trnd() < (b.turnaround != null ? b.turnaround : 0.6);
    const bar = doTurn ? turnaround(g1, b, seed + bb) : cloneSteps(g1);
    if (bb === 0 && (role === 'chorus' || role === 'outro'))
      bar.push({step: 0, inst: 'crash', velocity: 122, micro: 0});
    if (role === 'chorus')
      bar.push({step: 14, inst: 'openhat', velocity: 74, micro: 0});
    bar.forEach((h) => steps.push({...h, step: h.step + bb * 16}));
  }
  return {steps, bars, role};
}

// fills: role 'fill:X' = 1 bar of type X ; 'fill2:X' = 2 bars (setup + X)
/**
 * Builds a fill section: `'fill:X'` is one bar of type X, `'fill2:X'` is a
 * 2-bar setup-then-X.
 * @param {!Object} base The base params.
 * @param {string} role The fill role string.
 * @param {number} seed Deterministic RNG seed.
 * @return {{steps: !Array<!Object>, bars: number, role: string}} The fill.
 */
export function buildFill(base, role, seed) {
  const p = shaped(base, 'verse');
  const two = role.indexOf('fill2') === 0;
  const type = role.split(':')[1] || 'tom';
  const steps = [];
  const push = (bar, arr) =>
    arr.forEach((h) =>
      steps.push({
        step: h.step + bar * 16,
        inst: h.inst,
        velocity: h.velocity,
        micro: 0,
      }),
    );
  if (two) {
    push(0, generateFill(p, seed, 'setup').steps);
    push(1, generateFill(p, seed + 5, type).steps);
    return {steps, bars: 2, role};
  }
  push(0, generateFill(p, seed, type).steps);
  return {steps, bars: 1, role};
}

// build the scene list: take the base structure, then break it up by (1-predictability)
/**
 * Plans the ordered scene list for a song: starts from a base structure, then
 * jitters lengths, swaps variations, and inserts fills, intermezzi, and odd
 * meters under the param knobs.
 * @param {!Object} p The generation params (with `_meterMode`/`_meterSet`).
 * @param {string} length `'full'`, `'short'`, or `'loop'`.
 * @param {function(): number} rnd A PRNG (unused placeholder for parity).
 * @param {string} structName Base structure name (see {@link STRUCTURES}).
 * @param {number} seed Deterministic RNG seed.
 * @return {!Array<{role: string, reps: number}>} The scene list.
 */
export function songScenes(p, length, rnd, structName, seed) {
  if (length === 'loop') return [{role: 'verse', reps: 1}];
  let scenes = (STRUCTURES[structName] || STRUCTURES.standard).map((t) => {
    const a = t.split(':');
    return {role: a[0], reps: +a[1]};
  });
  if (length === 'short')
    scenes = scenes
      .filter((s, i) => i < 6 || s.role === 'outro')
      .map((s) => ({
        role: s.role,
        reps:
          s.role === 'intro' || s.role === 'outro'
            ? 1
            : Math.max(1, Math.round(s.reps / 2)),
      }));
  const vary = 1 - p.predictability;
  const cx = p.complexity;
  const fp = p.fillProbability;
  const sd = seed || 1;
  // independent streams, FIXED draws per scene -> each param acts monotonically & independently
  const rRep = rng(sd * 131 + 1);
  const rSwap = rng(sd * 131 + 2);
  const rExt = rng(sd * 131 + 3);
  const rFill = rng(sd * 131 + 4);
  const rInt = rng(sd * 131 + 5);
  const rSub = rng(sd * 131 + 6);
  const rMet = rng(sd * 131 + 7);
  const out = [];
  scenes.forEach((s0, i) => {
    const s = {...s0};
    const repG = rRep();
    const repDir = rRep();
    const swapG = rSwap();
    const swapPick = rSwap();
    const extG = rExt();
    const extPick = rExt();
    const fillG = rFill();
    const fillA = rFill();
    const fillB = rFill();
    const intG = rInt();
    const intA = rInt();
    const subG = rSub();
    const subPick = rSub();
    if (s.role !== 'intro' && s.role !== 'outro') {
      if (repG < vary * 0.7) s.reps += repDir < 0.5 ? -1 : 1; // PRED: scene-length jitter
      if (s.role === 'chorus' && p.energy > 0.7 && repDir < 0.5) s.reps += 1; // ENERGY: longer choruses
      s.reps = Math.max(1, Math.min(6, s.reps));
      if (s.role === 'verse' && swapG < vary * 0.75)
        s.role = swapPick < 0.5 ? 'variation' : 'verseGh'; // PRED: variation swap
    }
    if (
      (s.role === 'chorus' || s.role === 'verseGh') &&
      i > 1 &&
      extG < vary * 0.55
    )
      out.push({role: extPick < 0.5 ? 'variation' : 'break', reps: 1}); // PRED: extra section
    if (
      (s.role === 'chorus' || s.role === 'build') &&
      i > 0 &&
      fillG < Math.max(fp, cx * 0.45 + vary * 0.2)
    ) {
      // FILLS or COMPLEXITY
      const two = fillA < 0.3 + fp * 0.3 + cx * 0.3;
      const dropy = fillB < 0.25 + p.syncopation * 0.4 + vary * 0.35;
      out.push({
        role:
          (two ? 'fill2:' : 'fill:') +
          (dropy ? 'drop' : fillA < 0.55 ? 'tom' : 'roll'),
        reps: 1,
      });
    }
    if (
      i > 1 &&
      (s.role === 'build' || s.role === 'chorus' || s.role === 'verseGh') &&
      intG < cx * 0.6 + vary * 0.25
    )
      // COMPLEXITY: intermezzo
      out.push({
        role:
          p.energy > 0.7
            ? intA < 0.5
              ? 'doubletime'
              : 'broken'
            : intA < 0.6
              ? 'halftime'
              : 'broken',
        reps: 1,
      });
    if (
      s.role !== 'intro' &&
      s.role !== 'outro' &&
      s.reps >= 4 &&
      subG < cx * 0.55 + vary * 0.2
    ) {
      // COMPLEXITY: subdivide long scene
      const half = Math.max(1, Math.floor(s.reps / 2));
      out.push({role: s.role, reps: half});
      out.push(
        subPick < 0.5
          ? {role: 'fill:tom', reps: 1}
          : {role: s.role === 'chorus' ? 'variation' : 'verseGh', reps: 1},
      );
      out.push({role: s.role, reps: Math.max(1, s.reps - half)});
    } else out.push(s);
  });
  // ODD METERS (genre-specific): intermezzo = brief odd-meter breaks; structural = whole sections in odd time
  const om = p.oddMeter || 0;
  const mMode = p._meterMode;
  const mSet = p._meterSet && p._meterSet.length ? p._meterSet : ['3/4', '7/8'];
  const pick = () => mSet[Math.floor(rMet() * mSet.length)];
  if (om > 0.05 && mMode === 'intermezzo') {
    const nM = Math.round(om * 2);
    const slots = [];
    out.forEach((x, idx) => {
      if (x.role === 'chorus' || x.role === 'build') slots.push(idx);
    });
    for (let k = 0; k < nM && k < slots.length; k++)
      out.splice(slots[k] + k, 0, {role: 'meter:' + pick(), reps: 1});
  } else if (om > 0.05 && mMode === 'structural') {
    const nM = Math.round(om * 3);
    const cand = [];
    out.forEach((x, idx) => {
      if (['verse', 'verseGh', 'variation'].includes(x.role)) cand.push(idx);
    });
    for (let k = 0; k < nM && k < cand.length; k++)
      out[cand[k]].role = 'meter:' + pick();
  }
  let res = out;
  if (res.length > 16) {
    const last = res[res.length - 1];
    res = res.slice(0, 15);
    res.push(last);
  }
  return res;
}
