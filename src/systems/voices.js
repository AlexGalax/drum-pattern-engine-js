/**
 * @fileoverview Single-bar voice generation: the per-instrument skeletons
 * (kick, snare, hats, percussion) and fills that compose into one bar.
 * `generatePattern` and `generateFill` are the public entry points; the voice
 * helpers below are the building blocks the arrangement systems also draw on.
 */

import {CLASS} from '../config.js';
import {def} from '../params.js';
import {rng, pickWeighted} from '../utils/random.js';
import {STRONG, spaced} from '../utils/grid.js';
import {vel, micro} from '../utils/dynamics.js';

// STEP 2 — kick skeleton + syncopated/offbeat additions (spaced)
function kickSkeleton(p) {
  const d = p.density;
  if (d < 0.28) return [0];
  if (d < 0.5) return [0, 8];
  if (d < 0.72) return p.syncopation > 0.55 ? [0, 8] : [0, 4, 8, 12];
  return [0, 4, 8, 12];
}

/**
 * Builds the kick voice for one bar.
 * @param {!Object} p The generation params.
 * @param {function(): number} rnd A PRNG.
 * @return {!Array<number>} Kick step indices, sorted ascending.
 */
export function barKick(p, rnd) {
  const hits = new Set(kickSkeleton(p));
  const cand = [];
  if (p.syncopation > 0.3) cand.push(3, 7, 11, 15);
  if (p.density > 0.55 || p.complexity > 0.45) cand.push(2, 6, 10, 14);
  if (p.energy > 0.62) cand.push(2, 6, 10, 14);
  const pool = [...new Set(cand)].filter((s) => !hits.has(s));
  const w = pool.map((s) =>
    CLASS[s] === 'a' ? 0.4 + p.syncopation : 0.4 + p.complexity,
  );
  const n = Math.round(
    p.syncopation * 1.6 +
      Math.max(0, p.density - 0.5) * 2.4 +
      p.complexity * 1.2 +
      Math.max(0, p.energy - 0.5) * 1.6,
  );
  pickWeighted(w, n, rnd).forEach((i) => {
    const s = pool[i];
    if (s != null && spaced(hits, s)) hits.add(s);
  });
  return [...hits].sort((a, b) => a - b);
}

// STEP 4 — support voices (#5: leaner for more room)
/**
 * Builds the snare voice (backbeat plus ghost notes).
 * @param {!Object} p The generation params.
 * @param {function(): number} rnd A PRNG.
 * @return {{main: !Array<number>, ghosts: !Array<number>}} Backbeat and ghost
 *     step indices.
 */
export function snareVoice(p, rnd) {
  const main = [4, 12];
  const ghosts = [];
  const g = p.ghost != null ? p.ghost : 0.4;
  if (g > 0.08) {
    const cand = [3, 7, 10, 11, 15].filter((s) => !main.includes(s));
    const w = cand.map((s) => (CLASS[s] === 'a' ? 1.5 : 0.8));
    const n = Math.round(g * 4);
    pickWeighted(w, n, rnd).forEach((i) => {
      if (cand[i] != null) ghosts.push(cand[i]);
    });
  }
  return {main, ghosts};
}

/**
 * Builds the hi-hat voice (closed pattern plus open-hat accents).
 * @param {!Object} p The generation params.
 * @param {function(): number} rnd A PRNG.
 * @return {{steps: !Array<number>, open: !Array<number>}} Closed and open hat
 *     step indices.
 */
export function hatVoice(p, rnd) {
  const sixteenth = p.density > 0.66 && (p.complexity > 0.5 || p.energy > 0.72); // stricter -> more room
  let steps = sixteenth ? [...Array(16).keys()] : [0, 2, 4, 6, 8, 10, 12, 14];
  if (!sixteenth && p.density < 0.45)
    steps = steps.filter((s) => s % 4 === 0 || rnd() < 0.35 + p.density); // breathe at low density
  const open =
    p.energy > 0.45 && p.instrumentDensity > 0.6
      ? p.energy > 0.75
        ? [6, 14]
        : [14]
      : [];
  return {steps, open};
}

/**
 * Builds the auxiliary percussion voice (only at high instrument density).
 * @param {!Object} p The generation params.
 * @param {function(): number} rnd A PRNG.
 * @return {!Array<number>} Percussion step indices.
 */
export function percVoice(p, rnd) {
  if (p.instrumentDensity < 0.82) return [];
  const cand = [6, 14, 3, 11];
  const n = Math.round((p.instrumentDensity - 0.82) * 4 + p.complexity * 1);
  return pickWeighted(
    cand.map(() => 1),
    n,
    rnd,
  )
    .map((i) => cand[i])
    .filter((x) => x != null);
}

// STEP 6 — fills, several TYPES (tom run / snare roll / drop-pause / 2-bar setup)
/**
 * Builds one bar of fill hits of the given type.
 * @param {!Object} p The generation params.
 * @param {function(): number} rnd A PRNG.
 * @param {string=} type Fill flavor (`'tom'`, `'roll'`, `'drop'`, `'setup'`).
 * @return {!Array<!Object>} Fill hits (role-keyed; resolved by the caller).
 */
export function fillBar(p, rnd, type) {
  const hits = [];
  const c = p.complexity;
  type = type || 'tom';
  if (type === 'drop') {
    // a breath/pause: accent then silence + tiny pickup
    hits.push({
      step: 0,
      role: 'crash',
      velocity: vel(0.95, p, rnd, {accent: true}),
    });
    if (rnd() < 0.6)
      hits.push({step: 0, role: 'kick', velocity: vel(0.85, p, rnd)});
    if (rnd() < 0.55) {
      hits.push({step: 14, role: 'snare', velocity: vel(0.55, p, rnd)});
      hits.push({step: 15, role: 'snare', velocity: vel(0.78, p, rnd)});
    }
    return hits;
  }
  if (type === 'roll') {
    // snare roll, rising
    for (let s = 0; s < 16; s++)
      hits.push({
        step: s,
        role: 'snare',
        velocity: vel(0.35 + (s / 15) * 0.6, p, rnd, {accent: s % 4 === 0}),
      });
    hits.push({
      step: 0,
      role: 'kick',
      velocity: vel(0.9, p, rnd, {accent: true}),
    });
    return hits;
  }
  if (type === 'setup') {
    // first bar of a 2-bar fill: groove + building hint, space
    hits.push({
      step: 0,
      role: 'kick',
      velocity: vel(0.9, p, rnd, {accent: true}),
    });
    hits.push({
      step: 4,
      role: 'snare',
      velocity: vel(0.88, p, rnd, {accent: true}),
    });
    hits.push({step: 8, role: 'kick', velocity: vel(0.8, p, rnd)});
    if (c > 0.4)
      hits.push({step: 10, role: 'tom1', velocity: vel(0.6, p, rnd)});
    hits.push({
      step: 12,
      role: 'snare',
      velocity: vel(0.85, p, rnd, {accent: true}),
    });
    hits.push({step: 14, role: 'tom2', velocity: vel(0.72, p, rnd)});
    return hits;
  }
  // 'tom' — phrased descending tom run, keep pulse, leave gaps
  const fillStart = c < 0.4 ? 12 : c < 0.7 ? 8 : 6;
  hits.push({
    step: 0,
    role: 'kick',
    velocity: vel(0.92, p, rnd, {accent: true}),
  });
  if (fillStart >= 8)
    hits.push({
      step: 4,
      role: 'snare',
      velocity: vel(0.88, p, rnd, {accent: true}),
    });
  const toms = ['tom1', 'tom2', 'tom3', 'tom4'];
  const span = 16 - fillStart;
  const gap = c > 0.6 ? 1 : 2;
  for (let s = fillStart; s < 16; s += gap) {
    const t = toms[Math.min(3, Math.floor(((s - fillStart) / span) * 4))];
    const acc = s % 2 === 0;
    if (gap === 1 && !acc && rnd() > 0.4 + c * 0.4) continue;
    hits.push({
      step: s,
      role: t,
      velocity: vel(acc ? 0.9 : 0.6, p, rnd, {accent: acc}),
    });
  }
  if (c > 0.55)
    hits.push({step: 15, role: 'snare', velocity: vel(0.82, p, rnd)});
  return hits;
}

/**
 * Generates a single bar of role-based step events.
 * @param {!Object} params Generation knobs (see {@link Params}); missing keys
 *     are defaulted.
 * @param {number=} seed Deterministic RNG seed.
 * @return {!Pattern} A one-bar pattern.
 */
export function generatePattern(params, seed = 1) {
  const p = def(params);
  const rnd = rng(seed);
  const hits = [];
  const add = (step, role, velocity) =>
    hits.push({step, inst: role, velocity, micro: micro(step, p, rnd)});
  barKick(p, rnd).forEach((s) =>
    add(s, 'kick', vel(0.9, p, rnd, {accent: STRONG(s)})),
  );
  if (p.instrumentDensity >= 0.2) {
    const sn = snareVoice(p, rnd);
    sn.main.forEach((s) => add(s, 'snare', vel(0.9, p, rnd, {accent: true})));
    sn.ghosts.forEach((s) => add(s, 'ghost', vel(0.5, p, rnd, {ghost: true})));
  }
  if (p.instrumentDensity >= 0.45) {
    const ht = hatVoice(p, rnd);
    ht.steps.forEach((s) =>
      add(s, 'hat', vel(STRONG(s) ? 0.58 : 0.38, p, rnd, {accent: STRONG(s)})),
    );
    ht.open.forEach((s) => add(s, 'openhat', vel(0.58, p, rnd)));
  }
  if (p.instrumentDensity >= 0.82)
    percVoice(p, rnd).forEach((s) => add(s, 'perc', vel(0.45, p, rnd)));
  const m = new Map();
  for (const h of hits) {
    const k = h.step + ':' + h.inst;
    if (!m.has(k) || m.get(k).velocity < h.velocity) m.set(k, h);
  }
  return {
    steps: [...m.values()].sort((a, b) => a.step - b.step),
    bars: 1,
    resolution: 16,
    params: p,
  };
}

/**
 * Generates a single-bar drum fill.
 * @param {!Object} params Generation knobs (see {@link Params}); missing keys
 *     are defaulted.
 * @param {number=} seed Deterministic RNG seed.
 * @param {string=} type Fill flavor (e.g. `'tom'`, `'roll'`, `'drop'`);
 *     undefined picks one from the params.
 * @return {!Pattern} A one-bar fill pattern.
 */
export function generateFill(params, seed = 1, type) {
  const p = def(params);
  const rnd = rng(seed);
  return {
    steps: fillBar(p, rnd, type).map((h) => ({
      step: h.step,
      inst: h.role,
      velocity: h.velocity,
      micro: 0,
    })),
    bars: 1,
    resolution: 16,
    params: p,
  };
}
