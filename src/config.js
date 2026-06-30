/**
 * @fileoverview Static tuning tables for the engine: the step-grid
 * classification, per-role intensity levels, base song structures, and
 * odd-meter definitions. Pure data — no behavior, no imports.
 */

/**
 * 16-step grid position -> metric class: `'down'` (downbeats), `'beat'` (other
 * quarter notes), `'eighth'` (offbeats), `'e'` and `'a'` (16th subdivisions).
 * @const {!Object<number, string>}
 */
export const CLASS = {
  0: 'down',
  8: 'down',
  4: 'beat',
  12: 'beat',
  2: 'eighth',
  6: 'eighth',
  10: 'eighth',
  14: 'eighth',
  1: 'e',
  5: 'e',
  9: 'e',
  13: 'e',
  3: 'a',
  7: 'a',
  11: 'a',
  15: 'a',
};

/**
 * Base "character level" per section role (0..1) -> drives orchestration
 * (which instruments play and how hard).
 * @const {!Object<string, number>}
 */
export const ROLE_INT = {
  intro: 0.3,
  verse: 0.6,
  verseGh: 0.72,
  variation: 0.8,
  chorus: 1.0,
  build: 0.9,
  break: 0.2,
  outro: 0.4,
  halftime: 0.55,
  doubletime: 0.95,
  broken: 0.72,
};

/**
 * Per-genre base song structures. Each scene is a `'role:repeats'` string (a
 * 4-bar scene looped `repeats` times); `arrange` mutates these into the final
 * scene list.
 * @const {!Object<string, !Array<string>>}
 */
export const STRUCTURES = {
  standard: [
    'intro:1',
    'verse:4',
    'chorus:4',
    'verse:3',
    'chorus:4',
    'break:2',
    'build:2',
    'chorus:5',
    'outro:1',
  ],
  electronic: [
    'intro:2',
    'build:3',
    'chorus:6',
    'break:2',
    'build:3',
    'chorus:6',
    'outro:2',
  ],
  hiphop: ['intro:1', 'verse:6', 'chorus:3', 'verse:6', 'chorus:3', 'outro:1'],
  motorik: [
    'intro:2',
    'verse:6',
    'verseGh:5',
    'build:2',
    'chorus:6',
    'outro:2',
  ],
  funk: [
    'intro:1',
    'verse:3',
    'chorus:3',
    'variation:2',
    'break:1',
    'chorus:3',
    'build:2',
    'chorus:3',
    'outro:1',
  ],
  jazz: [
    'intro:1',
    'verse:4',
    'chorus:5',
    'variation:4',
    'chorus:4',
    'verse:3',
    'outro:2',
  ],
};

// ODD METERS: meter = steps-per-bar x note-resolution (e.g. 7/8 = 14 @ 1/16)
/**
 * Odd-meter definitions keyed by time signature. Each entry gives the bar's
 * step count, note-resolution index, signature index, main pulse `beats`, and
 * `back`beat positions.
 * @const {!Object<string, {
 *   steps: number,
 *   note: number,
 *   sig: number,
 *   beats: !Array<number>,
 *   back: !Array<number>,
 * }>}
 */
export const METERS = {
  // beats = main pulses (kick), back = backbeat (snare); steps in 1/16 grid (note idx 9)
  '3/4': {steps: 12, note: 9, sig: 1, beats: [0, 4, 8], back: [4]},
  '5/4': {steps: 20, note: 9, sig: 3, beats: [0, 4, 8, 12, 16], back: [8]},
  '7/4': {
    steps: 28,
    note: 9,
    sig: 5,
    beats: [0, 4, 8, 12, 16, 20, 24],
    back: [8, 20],
  },
  '5/8': {steps: 10, note: 9, sig: 6, beats: [0, 4], back: [4]}, // 2+3
  '6/8': {steps: 12, note: 9, sig: 7, beats: [0, 6], back: [6]}, // compound
  '7/8': {steps: 14, note: 9, sig: 8, beats: [0, 4, 8], back: [8]}, // 2+2+3
};
