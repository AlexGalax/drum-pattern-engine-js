/**
 * @fileoverview Step-grid predicates and the clamp helper. `STRONG` and
 * `spaced` answer questions about positions on the 16-step grid; `cl` keeps a
 * normalized weight in range.
 */

import {CLASS} from '../config.js';

/**
 * Whether a step falls on a strong metric position (downbeat or beat).
 * @param {number} s Step index.
 * @return {boolean} True for `'down'`/`'beat'` positions.
 */
export const STRONG = (s) => CLASS[s] === 'down' || CLASS[s] === 'beat';

/**
 * Whether a step has no neighbor already in `set` (keeps hits from clustering).
 * @param {!Set<number>} set Steps already taken.
 * @param {number} s Candidate step.
 * @return {boolean} True if both adjacent steps are free.
 */
export const spaced = (set, s) => !set.has(s - 1) && !set.has(s + 1);

/**
 * Clamps a value to the [0, 1] range.
 * @param {number} x The value.
 * @return {number} `x` clamped to [0, 1].
 */
export const cl = (x) => Math.max(0, Math.min(1, x));
