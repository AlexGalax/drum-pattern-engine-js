/**
 * @fileoverview Dynamics: velocity shaping and micro-timing humanization,
 * derived from the params (energy/density/humanize) and the PRNG.
 */

/**
 * Computes a MIDI velocity (8..127) for a hit from a base level and the params.
 * @param {number} base Base loudness 0..1 before scaling.
 * @param {!Object} p The generation params.
 * @param {function(): number} rnd A PRNG.
 * @param {{accent: (boolean|undefined), ghost: (boolean|undefined)}=} o
 *     Optional accent/ghost flags.
 * @return {number} The velocity, clamped to 8..127.
 */
export function vel(base, p, rnd, o = {}) {
  let v = base * (0.55 + 0.45 * p.energy);
  if (o.accent) v *= 1 + 0.25 * p.energy * (0.5 + p.density);
  if (o.ghost) v *= 0.28;
  v *= 1 + (rnd() * 2 - 1) * p.humanize * 0.35;
  return Math.max(8, Math.min(127, Math.round(v * 127)));
}

// micro = note-timing offset in step-fractions (+ = late). Written to device byte3 (-99..+99).
/**
 * Computes a humanized micro-timing offset for a step (swing is handled
 * natively per-clip, so this is humanize-only).
 * @param {number} step Step index (currently unused; kept for symmetry).
 * @param {!Object} p The generation params.
 * @param {function(): number} rnd A PRNG.
 * @return {number} Timing offset in step-fractions (+ = late).
 */
export function micro(step, p, rnd) {
  // humanize only; SWING is now native per-clip (SQPR byte5)
  return Math.round((rnd() * 2 - 1) * p.humanize * 0.18 * 1000) / 1000;
}
