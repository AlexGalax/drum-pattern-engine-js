/**
 * @fileoverview Operations on step lists: deduping and the small transforms
 * used when reshaping a one-bar groove (clone, drop instruments, force a 16th
 * hat lane, swap hats for a ride).
 */

import {STRONG} from './grid.js';

/**
 * Collapses duplicate hits (same step + instrument), keeping the loudest, and
 * returns them sorted by step.
 * @param {!Array<!Object>} hits The raw hits.
 * @return {!Array<!Object>} Deduped hits, sorted ascending by step.
 */
export const uniqHits = (hits) => {
  const m = new Map();
  for (const h of hits) {
    const k = h.step + ':' + h.inst;
    if (!m.has(k) || m.get(k).velocity < h.velocity) m.set(k, h);
  }
  return [...m.values()].sort((a, b) => a.step - b.step);
};

/**
 * Shallow-clones a list of step hits.
 * @param {!Array<!Object>} st The hits.
 * @return {!Array<!Object>} A new array of cloned hits.
 */
export const cloneSteps = (st) => st.map((h) => ({...h}));

/**
 * Removes all hits for the given instruments.
 * @param {!Array<!Object>} steps The hits.
 * @param {...string} x Instruments to drop.
 * @return {!Array<!Object>} The filtered hits.
 */
export function dropInst(steps, ...x) {
  return steps.filter((h) => !x.includes(h.inst));
}

/**
 * Replaces the hat lane with a steady 16th-note hat (accents on strong steps).
 * @param {!Array<!Object>} steps The hits (mutated and returned).
 * @return {!Array<!Object>} The hits with a full 16th hat lane.
 */
export function force16(steps) {
  steps = steps.filter((h) => h.inst !== 'hat');
  for (let s = 0; s < 16; s++)
    steps.push({step: s, inst: 'hat', velocity: STRONG(s) ? 78 : 46, micro: 0});
  return steps;
}

/**
 * Re-voices hat hits onto the ride.
 * @param {!Array<!Object>} steps The hits.
 * @return {!Array<!Object>} New hits with hats turned into rides.
 */
export function rideHats(steps) {
  return steps.map((h) => (h.inst === 'hat' ? {...h, inst: 'ride'} : h));
}
