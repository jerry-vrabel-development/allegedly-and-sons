# 0012 — Browser scripts as real TypeScript

Status: accepted (2026-11-11). The countdown, story reads and the checkout
mount have moved; the Vault's reel and sound follow.

## The problem

The shop serves five small first-party scripts: story reads, the countdown,
the Vault's reel, sound, and the checkout mount. Each was a JavaScript program
written inside a TypeScript template string (`src/worker/*-script.ts`), about
476 lines in all.

- The type checker and the linter can't see inside a string, so that code had
  neither. Everything else in the repo is strict.
- The 100% coverage figure counted each string as one covered statement.
- Tests checked the scripts by matching their text (56 assertions), which
  breaks on a rename and passes on a logic bug.
- The scripts took 18 values from the Worker code (event names, storage keys,
  timings, element ids) by interpolation.
- The Back-Room Broadcast's characters and animation will add several hundred
  more lines of browser code. That is the code most worth having typed.

## Options

### A. Keep the strings, check them from outside

A script extracts each string and runs the type checker and linter on it as
loose JavaScript.

- Smallest change; no build step.
- New code is still written inside a string, with no editor help, and shared
  values are still interpolated.

### B. TypeScript files, bundled into a generated module (chosen)

Scripts live in `src/client` as TypeScript, import shared constants from
`src/core`, and are bundled by esbuild into one generated file of strings that
the Worker serves.

- Strict types and the same lint rules as the rest of the repo.
- Shared constants are imported, so the two sides can't drift.
- Logic can sit in pure modules and be unit tested.
- Costs a build step, a generated file, and rewriting the text-matching tests.

### C. Plain `.js` files imported as text

- Real files, checked as loose JavaScript.
- Needs a bundler rule for Wrangler and a matching one for Vitest, and still
  has no good answer for shared constants.

## The design

```
src/client/
  entries/countdown.ts   one file per served script; wires the DOM, stays thin
  clock.ts               pure logic beside the entries; unit tested
  tsconfig.json          the DOM types, for this folder only
scripts/build-client.js  bundles each entry
src/worker/client-scripts.generated.ts   the bundles, as exported strings
```

- **Entries and modules.** An entry touches the DOM and does as little else
  as it can. Anything with logic goes in a module beside the entries, has no
  DOM in it, and gets unit tests like the core. The Worker's own type check
  covers those modules without the DOM types, which keeps them honest.
- **The bundle.** One classic script per entry (`format: "iife"`), nothing
  left to import, nothing global. Not minified: the Fine Print says what runs
  in your browser, and anyone can open the file and read it. Target ES2020.
- **The generated file is committed.** Deploys, tests and `wrangler dev` need
  no build step and `wrangler deploy` is unchanged. After editing anything in
  `src/client`, run `npm run build:client`. CI runs
  `npm run build:client:check` and fails if the file is stale, the same way it
  checks the Worker's generated types. `npm run check` runs it too.
- **esbuild is pinned** to the exact version Wrangler and Vitest already
  install, so the output is the same on every machine and nothing new is
  downloaded.
- **Entries import only from small, import-free core modules** (`paths.ts`,
  `dom-events.ts`, `story.ts`, `checkout-page.ts`). A core module that pulls in the catalog would
  bundle the catalog into the script. Each script's Worker test caps its size
  to catch that.
- **Still first-party.** The scripts are served from our own origin at the
  same paths, never inline, and are listed in `src/worker/scripts.ts`. The
  Content Security Policy and the Fine Print don't change.

## Testing

- Pure modules: unit tests, counted in coverage.
- Entries: not counted in coverage (they can't run in the Workers runtime).
  They are exercised by the Playwright suite in real browsers.
- The generated file: not counted. A Worker test checks each script is served
  as generated and carries no `import`, `eval`, `innerHTML` or remote URL.

So the coverage figure now means: the Worker, the core, and the browser
scripts' logic. It still doesn't measure the entries.

## Rollout

1. The countdown: the smallest script, to prove the setup. Done.
2. Story reads. Done.
3. The checkout mount. Done.
4. The Vault's reel.
5. Sound, the largest, last.

Each PR moves one script, replaces its text-matching tests with unit tests and
the existing browser tests, and deletes its `*-script.ts` string.

## Not doing

- No framework, no runtime dependencies: the scripts stay small and plain.
- No minification or source maps for now. If size ever matters, revisit.
- No browser-side unit test runner (jsdom or similar) yet. If an entry grows
  logic that can't be pulled into a pure module, that is the time.
