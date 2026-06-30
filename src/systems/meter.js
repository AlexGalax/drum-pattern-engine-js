/**
 * @fileoverview Odd-meter grooves. A meter's bar = steps-per-bar x
 * note-resolution (e.g. 7/8 = 14 steps @ 1/16). `meterBar` lays a single bar of
 * the given meter and `meterGroove` stacks several into a section.
 */

import {METERS} from '../config.js';
import {rng} from '../utils/random.js';
import {vel, micro} from '../utils/dynamics.js';
import {uniqHits} from '../utils/steps.js';
import {shaped} from './grooves.js';

function meterBar(base, M, seed) {
  const p = shaped(base, 'verse');
  const rnd = rng(seed);
  const h = [];
  const isBeat = (s) => M.beats.includes(s);
  const add = (st, inst, v, o) =>
    h.push({
      step: st,
      inst,
      velocity: vel(v, p, rnd, o || {}),
      micro: micro(st, p, rnd),
    });
  if (base.feel === 'jazz') {
    M.beats.forEach((st, i) => add(st, 'ride', 0.6, {accent: i === 0}));
    for (let s = 2; s < M.steps; s += 4) {
      if (rnd() < 0.5) add(s, 'ride', 0.42);
    }
    M.back.forEach((st) => add(st, 'hat', 0.5));
    add(0, 'kick', 0.42);
    const n = Math.round(1 + p.complexity * 2 + p.ghost * 1.5);
    for (let k = 0; k < n; k++) {
      const st = 1 + Math.floor(rnd() * (M.steps - 1));
      add(st, 'snare', 0.3 + rnd() * 0.3, {ghost: rnd() < 0.6});
    }
  } else {
    M.beats.forEach((st, i) => {
      if (i === 0 || rnd() < 0.4 + p.density * 0.5)
        add(st, 'kick', i === 0 ? 0.95 : 0.8, {accent: i === 0});
    });
    M.back.forEach((st) => add(st, 'snare', 0.95, {accent: true}));
    const every = p.density > 0.6 || p.energy > 0.7 ? 1 : 2;
    for (let s = 0; s < M.steps; s += every)
      add(s, 'hat', isBeat(s) ? 0.55 : 0.34, {accent: isBeat(s)});
    if (p.ghost > 0.3)
      for (let s = 1; s < M.steps; s += 2) {
        if (rnd() < p.ghost * 0.5) add(s, 'ghost', 0.4, {ghost: true});
      }
  }
  return uniqHits(h);
}

/**
 * Builds a multi-bar section in an odd meter.
 * @param {!Object} base The (intensity-aware) base params.
 * @param {string} mk Meter key (see {@link METERS}); falls back to `'7/8'`.
 * @param {number} bars How many bars to generate.
 * @param {number} seed Deterministic RNG seed.
 * @return {{
 *   steps: !Array<!Object>,
 *   bars: number,
 *   role: string,
 *   stepsPerBar: number,
 *   note: number,
 *   timesig: number,
 * }} The meter section.
 */
export function meterGroove(base, mk, bars, seed) {
  const M = METERS[mk] || METERS['7/8'];
  const steps = [];
  for (let b = 0; b < bars; b++)
    meterBar(base, M, seed + b * 7).forEach((hh) =>
      steps.push({...hh, step: hh.step + b * M.steps}),
    );
  return {
    steps,
    bars,
    role: 'meter:' + mk,
    stepsPerBar: M.steps,
    note: M.note,
    timesig: M.sig,
  };
}
