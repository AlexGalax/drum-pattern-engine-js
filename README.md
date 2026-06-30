# pattern-engine (JS)

Universal drum-pattern + song-arrangement generator. **No runtime dependencies.**

The engine is **device-agnostic**: it emits a neutral *song* structure (instrument **roles**,
steps, velocity, micro-timing, bars, repeats, meter). A separate builder package turns that
into a concrete device format — e.g. [`smpltrek-builder`](../smpltrek-builder-js) writes a
Sonicware SmplTrek project. The same song could drive MIDI, another groovebox, etc.

This is the **single source of truth** for the engine; the Python port
([`pattern-engine-py`](https://github.com/AlexGalax/pattern-engine-py)) is kept byte-identical
via a parity check.

## Install

```bash
npm install pattern-engine
```

## Usage

```js
import { arrange } from 'pattern-engine';

const params = { density: 0.6, instrumentDensity: 0.65, energy: 0.75, swing: 0.15, ghost: 0.3 };
const song = arrange(params, { length: 'full', bpm: 124, seed: 12345, structure: 'electronic' });
// hand `song` to a builder, e.g. smpltrek-builder's buildProject()
```

## The song structure (the reuse interface)

`arrange(params, opts)` returns:

```
{
  clips: [{
    idx, name, role, repeat, intensity,
    pattern: {
      steps: [{ step, inst, velocity, micro }],  // inst = role string; velocity 0..1; micro = timing offset in step-fractions
      bars,            // bars in the clip
      stepsPerBar,     // 16 for 4/4 at 1/16
      note,            // note-resolution code (default 9 = 1/16)
      timesig,         // time-signature code (2 = 4/4)
      role
    }
  }],
  bpm, totalBars, seconds, params
}
```

`inst` is a **role** (`kick`, `snare`, `hat`, `ohh`, `ride`, `crash`, `tom1`, `perc`, …) — not a
note. A builder maps roles to notes. `note`/`timesig` use SmplTrek's index encoding today (a
small coupling that a future version may make fully semantic).

Other exports: `generatePattern`, `generateFill`, `engine` (namespace).

### Parameters (0..1)

`density`, `instrumentDensity`, `syncopation`, `swing`, `complexity`, `energy`, `humanize`,
`predictability`, `fillProbability`, `turnaround`, `densitySpread`, `ghost`, `oddMeter`.

### Options

`length` (`loop`/`short`/`full`), `bpm`, `seed`, `structure`, `feel`, `meterMode`, `meterSet`.

## Develop

```bash
npm install        # eslint + prettier
npm run format
npm run lint
```

## License

MIT — Alexander Schornberg.
