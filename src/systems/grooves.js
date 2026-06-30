/**
 * @fileoverview Signature genre grooves and the role/intensity shaping they
 * share. The param engine can't derive idiomatic figures (jazz ride comping,
 * jungle chops, one-drop, clave), so each feel has a hand-written groove;
 * hats/ghosts/dynamics stay parametric. `groove1bar` dispatches by feel and
 * `rhythmGroove` covers the rhythm-change intermezzi.
 */

import {ROLE_INT} from '../config.js';
import {cl, STRONG} from '../utils/grid.js';
import {rng} from '../utils/random.js';
import {vel, micro} from '../utils/dynamics.js';
import {uniqHits, dropInst, force16, rideHats} from '../utils/steps.js';
import {generatePattern} from './voices.js';

/**
 * Lifts a section's role + position into a 0..1 intensity, scaled by the
 * energy and section-contrast (densitySpread) knobs.
 * @param {string} role The section role.
 * @param {number} pos The section's position in the song.
 * @param {number} n Total section count.
 * @param {!Object} p The generation params.
 * @return {number} Intensity in [0, 1].
 */
export function sceneIntensity(role, pos, n, p) {
  let v = ROLE_INT[role] != null ? ROLE_INT[role] : 0.7;
  v += n > 1 ? (pos / (n - 1) - 0.5) * 0.2 : 0; // later sections build a touch
  v += (p.energy - 0.5) * 0.3; // energy lifts the whole arc
  v = 0.6 + (v - 0.6) * (0.4 + 1.2 * p.densitySpread); // Section Contrast = development range (flat<->dramatic)
  return cl(v);
}

// map a scene's intensity to its groove params: low intensity = thinner kit (instruments drop out)
/**
 * Scales the base params by a role's intensity so low-intensity sections play
 * a thinner kit.
 * @param {!Object} base The base params (optionally carrying `_I` intensity).
 * @param {string} role The section role.
 * @return {!Object} A new, role-shaped params object.
 */
export function shaped(base, role) {
  const I =
    base._I != null ? base._I : ROLE_INT[role] != null ? ROLE_INT[role] : 0.7;
  const p = {...base};
  p.instrumentDensity = cl(base.instrumentDensity * (0.5 + 0.95 * I)); // gates hats/perc/openhat in & out
  p.density = cl(base.density * (0.65 + 0.6 * I));
  p.energy = cl(base.energy * (0.78 + 0.4 * I));
  if (role === 'verseGh' || role === 'variation')
    p.complexity = cl(p.complexity + 0.2);
  if (role === 'variation') p.syncopation = cl(p.syncopation + 0.15);
  return p;
}

// SIGNATURE GROOVES — genre figures the param engine can't derive (hats/ghosts/dynamics still parametric)
function grooveJazz(base, role, seed) {
  const p = shaped(base, role);
  const rnd = rng(seed);
  const h = [];
  const add = (st, inst, v, o) =>
    h.push({
      step: st,
      inst,
      velocity: vel(v, p, rnd, o || {}),
      micro: micro(st, p, rnd),
    });
  [0, 4, 8, 12].forEach((st) => add(st, 'ride', 0.62, {accent: STRONG(st)})); // ride on the beats
  [6, 14].forEach((st) => {
    if (rnd() < 0.55 + p.density * 0.45) add(st, 'ride', 0.5);
  }); // density -> swing skip notes
  [2, 10].forEach((st) => {
    if (rnd() < p.density * 0.7) add(st, 'ride', 0.42);
  });
  [4, 12].forEach((st) => add(st, 'hat', 0.5)); // hi-hat foot on 2 & 4
  if (p.instrumentDensity > 0.55)
    [0, 8].forEach((st) => {
      if (rnd() < (p.instrumentDensity - 0.55) * 2.2) add(st, 'hat', 0.34);
    }); // instrDensity -> extra foot
  add(0, 'kick', 0.42);
  if (rnd() < 0.3 + p.density * 0.4) add(8, 'kick', 0.36); // feathered kick
  if (p.syncopation > 0.3)
    [6, 10, 14].forEach((st) => {
      if (rnd() < p.syncopation * 0.5)
        add(st, 'kick', 0.6 + rnd() * 0.2, {accent: true});
    }); // syncopation -> dropped bombs
  const comp = [2, 3, 6, 7, 10, 11, 14, 15];
  const n = Math.round(1 + p.complexity * 4 + p.ghost * 2); // complexity+ghost -> comping density
  for (let k = 0; k < n; k++) {
    const st = comp[Math.floor(rnd() * comp.length)];
    add(st, 'snare', 0.3 + rnd() * 0.3, {ghost: rnd() < 0.55});
  }
  return uniqHits(h);
}

function grooveTwoStep(base, role, seed) {
  const p = shaped(base, role);
  const rnd = rng(seed);
  const h = []; // D'n'B
  const add = (st, inst, v, o) =>
    h.push({
      step: st,
      inst,
      velocity: vel(v, p, rnd, o || {}),
      micro: micro(st, p, rnd),
    });
  add(0, 'kick', 0.96, {accent: true});
  add(10, 'kick', 0.85); // 1 + 'and of 3'
  if (p.density > 0.55) add(6, 'kick', 0.7);
  if (p.density > 0.78 && rnd() < 0.6) add(13, 'kick', 0.6);
  if (p.syncopation > 0.3)
    [3, 7, 11, 14].forEach((st) => {
      if (rnd() < p.syncopation * 0.45) add(st, 'kick', 0.6);
    }); // syncopation -> rolling kicks
  add(8, 'snare', 0.98, {accent: true}); // backbeat on 3 (two-step)
  if (p.complexity > 0.5 && rnd() < p.complexity) add(12, 'snare', 0.62); // complexity -> extra snare
  [3, 7, 11, 14].forEach((st) => {
    if (rnd() < p.ghost * 0.9) add(st, 'ghost', 0.45, {ghost: true});
  });
  if (p.complexity > 0.55)
    [2, 5, 13, 15].forEach((st) => {
      if (rnd() < p.complexity * 0.5) add(st, 'ghost', 0.4, {ghost: true});
    }); // complexity -> ghost rolls
  const six = p.density > 0.6 || p.energy > 0.7;
  (six ? [...Array(16).keys()] : [0, 2, 4, 6, 8, 10, 12, 14]).forEach((st) =>
    add(st, 'hat', STRONG(st) ? 0.55 : 0.33, {accent: STRONG(st)}),
  );
  if (p.instrumentDensity > 0.6) add(14, 'openhat', 0.5);
  if (p.instrumentDensity > 0.8) add(6, 'openhat', 0.42); // instrDensity -> open hats
  return uniqHits(h);
}

function grooveBreak(base, role, seed) {
  const p = shaped(base, role);
  const rnd = rng(seed);
  const h = []; // Jungle
  const add = (st, inst, v, o) =>
    h.push({
      step: st,
      inst,
      velocity: vel(v, p, rnd, o || {}),
      micro: micro(st, p, rnd),
    });
  add(0, 'kick', 0.95, {accent: true});
  add(10, 'kick', 0.8);
  if (rnd() < 0.3 + p.density * 0.6) add(6, 'kick', 0.7);
  if (p.density > 0.7 && rnd() < 0.6) add(13, 'kick', 0.62); // density -> kick density
  add(4, 'snare', 0.9, {accent: true});
  add(12, 'snare', 0.92, {accent: true}); // breakbeat on 2 & 4
  if (p.syncopation > 0.3)
    [7, 10, 11].forEach((st) => {
      if (rnd() < p.syncopation * 0.5) add(st, 'snare', 0.7);
    }); // syncopation -> displaced snares
  const gp = 0.3 + p.ghost * 0.7 + p.complexity * 0.3; // complexity+ghost -> chop density
  [2, 3, 6, 7, 9, 11, 13, 14, 15].forEach((st) => {
    if (rnd() < gp * 0.6) add(st, 'ghost', 0.5, {ghost: true});
  });
  [...Array(16).keys()].forEach((st) =>
    add(st, 'hat', STRONG(st) ? 0.5 : 0.3, {accent: STRONG(st)}),
  );
  if (p.instrumentDensity > 0.6) add(2, 'openhat', 0.45);
  if (p.instrumentDensity > 0.75) [0, 8].forEach((st) => add(st, 'ride', 0.4)); // instrDensity -> layers
  return uniqHits(h);
}

function grooveOneDrop(base, role, seed) {
  const p = shaped(base, role);
  const rnd = rng(seed);
  const h = []; // Dub/reggae one-drop: beat 1 left open, kick+snare "drop" together on beat 3 (step 8)
  const add = (st, inst, v, o) =>
    h.push({
      step: st,
      inst,
      velocity: vel(v, p, rnd, o || {}),
      micro: micro(st, p, rnd),
    });
  add(8, 'kick', 0.95, {accent: true});
  if (p.density > 0.5) add(0, 'kick', 0.55); // density -> reinstate beat 1
  if (p.energy > 0.65) add(14, 'kick', 0.5); // energy -> pickup into the drop
  add(8, 'snare', 0.85, {accent: true}); // the drop (cross-stick character)
  [2, 6, 10, 14].forEach((st) => add(st, 'hat', 0.55)); // off-beat skank
  if (p.energy > 0.7)
    for (let s = 0; s < 16; s++) if (s % 4 !== 2) add(s, 'hat', 0.3); // energy -> 16ths between skanks
  if (p.instrumentDensity > 0.7) add(14, 'openhat', 0.5);
  if (p.ghost > 0.5) add(11, 'ghost', 0.25 * p.ghost); // ghost -> snare pickup
  return uniqHits(h);
}

function grooveBossa(base, role, seed, bar) {
  const p = shaped(base, role);
  const rnd = rng(seed);
  const h = []; // 2-bar son clave (3-2) on rim/cross-stick; gentle, ride/hat 8ths
  const add = (st, inst, v, o) =>
    h.push({
      step: st,
      inst,
      velocity: vel(v, p, rnd, o || {}),
      micro: micro(st, p, rnd),
    });
  const clave = bar % 2 === 0 ? [0, 6, 12] : [4, 8]; // 3-side then 2-side
  clave.forEach((st) => add(st, 'rim', 0.7));
  add(0, 'kick', 0.65); // soft surdo-ish kick, each bar
  add(6, 'kick', 0.55);
  [0, 2, 4, 6, 8, 10, 12, 14].forEach((st) => add(st, 'hat', 0.4)); // steady 8ths
  if (p.ghost > 0.4) [2, 10].forEach((st) => add(st, 'ghost', 0.2 * p.ghost)); // brush-snare ghosts
  return uniqHits(h);
}

function grooveLatin(base, role, seed, bar) {
  const p = shaped(base, role);
  const rnd = rng(seed);
  const h = []; // 2-bar son clave (3-2); hand-percussion kit (no kick/snare drum -> roles reused per kitmap)
  const add = (st, inst, v, o) =>
    h.push({
      step: st,
      inst,
      velocity: vel(v, p, rnd, o || {}),
      micro: micro(st, p, rnd),
    });
  const clave = bar % 2 === 0 ? [0, 6, 12] : [4, 8];
  clave.forEach((st) => add(st, 'ride', 0.8, {accent: true})); // clave (claves -> ride slot)
  [6, 12].forEach((st) => add(st, 'kick', 0.85, {accent: STRONG(st)})); // bombo, each bar
  add(8, 'snare', 0.7, {accent: true}); // timbale backbeat
  if (p.syncopation > 0.5) add(11, 'snare', 0.45); // syncopation -> extra timbale hit
  [0, 2, 4, 6, 8, 10, 12, 14].forEach((st) => add(st, 'hat', 0.5)); // shaker 8ths
  if (p.energy > 0.6) for (let s = 1; s < 16; s += 2) add(s, 'hat', 0.3); // energy -> shaker 16ths
  if (role === 'chorus' || role === 'build' || p.instrumentDensity > 0.6)
    [0, 4, 8, 12].forEach((st) => add(st, 'perc', 0.6)); // cowbell on the quarters at high intensity
  add(6, 'tom1', 0.55 * p.instrumentDensity); // congas: open tones on the &s, scaled by density
  add(14, 'tom2', 0.55 * p.instrumentDensity);
  return uniqHits(h);
}

/**
 * Builds one bar of groove for a section, dispatching by the feel in `base`.
 * @param {!Object} base The (role-aware) base params, carrying `feel`.
 * @param {string} role The section role.
 * @param {number} seed Deterministic RNG seed.
 * @param {number=} bar Bar index within the section (for 2-bar clave feels).
 * @return {!Array<!Object>} The bar's hits.
 */
export function groove1bar(base, role, seed, bar = 0) {
  const feel = base.feel || 'straight';
  if (feel === 'jazz') return grooveJazz(base, role, seed);
  if (feel === 'twostep') return grooveTwoStep(base, role, seed);
  if (feel === 'breakbeat') return grooveBreak(base, role, seed);
  if (feel === 'onedrop') return grooveOneDrop(base, role, seed);
  if (feel === 'bossa') return grooveBossa(base, role, seed, bar);
  if (feel === 'latin') return grooveLatin(base, role, seed, bar);
  const p = shaped(base, role);
  let g = generatePattern(p, seed).steps;
  if (role === 'intro') g = dropInst(g, 'snare', 'ghost', 'openhat');
  if (role === 'build') g = force16(g);
  if (role === 'break') g = rideHats(g);
  return g;
}

// rhythm-change feels (same tempo, different perceived speed) for intermezzi
/**
 * Builds a rhythm-change groove (`halftime`, `doubletime`, or `broken`) for an
 * intermezzo section.
 * @param {!Object} base The base params.
 * @param {string} role One of `'halftime'`, `'doubletime'`, `'broken'`.
 * @param {number} seed Deterministic RNG seed.
 * @return {!Array<!Object>} The bar's hits.
 */
export function rhythmGroove(base, role, seed) {
  const p = shaped(base, role);
  const rnd = rng(seed);
  const hits = [];
  const add = (st, inst, v) =>
    hits.push({step: st, inst, velocity: v, micro: micro(st, p, rnd)});
  const gp = p.ghost != null ? p.ghost : 0.4;
  if (role === 'halftime') {
    // feels half-speed: backbeat on beat 3
    for (let st = 0; st < 16; st += 2) add(st, 'hat', STRONG(st) ? 68 : 44);
    add(0, 'kick', vel(0.92, p, rnd, {accent: true}));
    if (rnd() < 0.5) add(10, 'kick', vel(0.8, p, rnd));
    add(8, 'snare', vel(0.95, p, rnd, {accent: true}));
    if (gp > 0.4) add(11, 'ghost', vel(0.45, p, rnd, {ghost: true}));
  } else if (role === 'doubletime') {
    // feels double-speed: 16th hats, doubled backbeat
    for (let st = 0; st < 16; st++)
      add(
        st,
        'hat',
        st % 4 === 0 ? vel(0.6, p, rnd, {accent: true}) : vel(0.34, p, rnd),
      );
    [0, 4, 8, 12].forEach((st) =>
      add(st, 'kick', vel(0.9, p, rnd, {accent: STRONG(st)})),
    );
    [2, 6, 10, 14].forEach((st) =>
      add(st, 'snare', vel(0.85, p, rnd, {accent: true})),
    );
  } else {
    // 'broken' — displaced/syncopated
    for (let st = 0; st < 16; st += 2) add(st, 'hat', STRONG(st) ? 66 : 42);
    [0, 6, 10].forEach((st) =>
      add(st, 'kick', vel(0.9, p, rnd, {accent: STRONG(st)})),
    );
    [4, 12].forEach((st) => add(st, 'snare', vel(0.9, p, rnd, {accent: true})));
    if (gp > 0.3) {
      add(7, 'ghost', vel(0.45, p, rnd, {ghost: true}));
      add(15, 'ghost', vel(0.42, p, rnd, {ghost: true}));
    }
  }
  const m = new Map();
  for (const h of hits) {
    const k = h.step + ':' + h.inst;
    if (!m.has(k) || m.get(k).velocity < h.velocity) m.set(k, h);
  }
  return [...m.values()];
}
