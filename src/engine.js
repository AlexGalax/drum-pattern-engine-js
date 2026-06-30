/**
 * @fileoverview Engine orchestrator and public surface. Defines `arrange` —
 * which plans a scene list and renders each scene into a song — and re-exports
 * the rest of the public API from the subsystems. This is the only module
 * `index.js` needs to import.
 *
 * Layering: index.js -> engine.js -> systems/* -> {config, params, utils}/*.
 */

import {def} from './params.js';
import {rng} from './utils/random.js';
import {generatePattern, generateFill} from './systems/voices.js';
import {sceneIntensity} from './systems/grooves.js';
import {songScenes, buildSection} from './systems/arrangement.js';
import {toGrid} from './render.js';
import {STRUCTURES, METERS} from './config.js';

/**
 * Builds a full multi-section song arrangement from generation knobs.
 * @param {!Object} params Generation knobs (see {@link Params}).
 * @param {{
 *   feel: (string|undefined),
 *   meterMode: (string|undefined),
 *   meterSet: (?Array<string>|undefined),
 *   seed: (number|undefined),
 *   length: (string|undefined),
 *   bpm: (number|undefined),
 *   structure: (string|undefined),
 * }=} opts Arrangement options: groove `feel`, odd-`meterMode`/`meterSet`,
 *     RNG `seed`, song `length`, `bpm`, and base `structure` name.
 * @return {!Song} The arranged song.
 */
function arrange(params, opts = {}) {
  const p = def(params);
  p.feel = opts.feel || 'straight';
  p._meterMode = opts.meterMode || 'none';
  p._meterSet = opts.meterSet || null;
  const seed = opts.seed || 1;
  const rnd = rng(seed * 7 + 3);
  const length = opts.length || 'full';
  const bpm = opts.bpm || 138;
  const scenes = songScenes(p, length, rnd, opts.structure || 'standard', seed);
  const baseSeed = seed * 101 + 5;
  const groove = new Set([
    'verse',
    'verseGh',
    'chorus',
    'outro',
    'build',
    'break',
    'halftime',
    'doubletime',
    'broken',
  ]);
  const n = scenes.length;
  const clips = scenes.map((s, i) => {
    const I =
      s.role.indexOf('fill') === 0 ? 0.7 : sceneIntensity(s.role, i, n, p);
    const pat = buildSection(
      p,
      s.role,
      groove.has(s.role) ? baseSeed : baseSeed + i * 13,
      seed * 31 + i * 7,
      I,
    );
    return {
      idx: i,
      name: s.role + ' (' + pat.bars + 'bar)',
      role: s.role,
      pattern: pat,
      intensity: I,
      repeat: s.role.indexOf('fill') === 0 ? 1 : Math.max(1, s.reps),
    };
  });
  const totalBars = clips.reduce((a, c) => a + c.pattern.bars * c.repeat, 0);
  return {
    clips,
    bpm,
    totalBars,
    seconds: Math.round((totalBars * 4 * 60) / bpm),
    params: p,
  };
}

export {
  generatePattern,
  generateFill,
  arrange,
  toGrid,
  def,
  STRUCTURES,
  METERS,
};
