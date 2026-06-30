/**
 * @fileoverview The generation state model: the param knobs that drive the
 * engine and the data shapes it produces. `def` fills in defaults for any
 * unspecified knob; everything downstream reads from a complete params object.
 */

/**
 * Generation knobs, each a 0..1 weight unless noted. Keys: `density`,
 * `instrumentDensity`, `syncopation`, `swing`, `repetition`, `complexity`,
 * `energy`, `humanize`, `predictability`, `fillProbability`, `densitySpread`,
 * `instrumentSpread`, `turnaround`, `ghost`, and `oddMeter`.
 * @typedef {!Object<string, number>} Params
 */

/**
 * A single note event on the 16-step grid.
 * @typedef {{
 *   step: number,
 *   inst: string,
 *   velocity: number,
 *   micro: number,
 * }} Step
 */

/**
 * A generated pattern (one or more bars of step events).
 * @typedef {{
 *   steps: !Array<!Step>,
 *   bars: number,
 *   resolution: number,
 *   params: !Params,
 * }} Pattern
 */

/**
 * One arrangement section: a pattern plus its placement metadata.
 * @typedef {{
 *   idx: number,
 *   name: string,
 *   role: string,
 *   pattern: !Pattern,
 *   intensity: number,
 *   repeat: number,
 * }} Clip
 */

/**
 * A full song arrangement.
 * @typedef {{
 *   clips: !Array<!Clip>,
 *   bpm: number,
 *   totalBars: number,
 *   seconds: number,
 *   params: !Params,
 * }} Song
 */

/**
 * Fills in default values for any unspecified generation knobs.
 * @param {!Object=} p Partial overrides for the default params.
 * @return {!Params} A complete params object.
 */
export const def = (p = {}) => ({
  density: 0.5,
  instrumentDensity: 0.5,
  syncopation: 0.3,
  swing: 0.2,
  repetition: 0.7,
  complexity: 0.4,
  energy: 0.6,
  humanize: 0.3,
  predictability: 0.7,
  fillProbability: 0.2,
  densitySpread: 0.6,
  instrumentSpread: 0.6,
  turnaround: 0.6,
  ghost: 0.4,
  oddMeter: 0,
  ...p,
});
