/**
 * @fileoverview Deterministic randomness. `rng` is a seedable PRNG factory
 * (mulberry32) and `pickWeighted` draws indices from a weight list without
 * replacement.
 */

/**
 * Creates a deterministic PRNG (mulberry32) seeded by `seed`.
 * @param {number} seed The seed.
 * @return {function(): number} A function returning floats in [0, 1).
 */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws up to `count` indices from `weights` without replacement, weighted by
 * value; `force` pre-selects indices that always appear.
 * @param {!Array<number>} weights Per-index weights (0 disables an index).
 * @param {number} count How many indices to draw (including forced ones).
 * @param {function(): number} rnd A PRNG from {@link rng}.
 * @param {!Array<number>=} force Indices to always include.
 * @return {!Array<number>} The chosen indices, sorted ascending.
 */
export function pickWeighted(weights, count, rnd, force = []) {
  const chosen = new Set(force);
  const pool = weights
    .map((w, i) => [i, w])
    .filter((x) => x[1] > 0 && !chosen.has(x[0]));
  count = Math.max(0, Math.min(count - chosen.size, pool.length));
  for (let n = 0; n < count; n++) {
    const total = pool.reduce((a, x) => a + x[1], 0);
    let r = rnd() * total;
    let k = 0;
    while (k < pool.length - 1 && r > pool[k][1]) {
      r -= pool[k][1];
      k++;
    }
    chosen.add(pool[k][0]);
    pool.splice(k, 1);
  }
  return [...chosen].sort((a, b) => a - b);
}
