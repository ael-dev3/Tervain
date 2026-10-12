# Software WebGL self-verification

Headless checks explicitly use ANGLE SwiftShader. Headed hardware play gates retain their existing renderer and timing thresholds. Software timing is not evidence of Mac GPU frame pacing.

Build and serve the production application with local original models:

```sh
npm ci
npm run build -- --mode software
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

In another terminal:

```sh
node tools/software-webgl-check.mjs --out software-webgl-proof
```

The check requires WebGL 2, a SwiftShader renderer, journey readiness, a nonblank 640×360 low-preset game capture, and rejection of an outstanding protocol request when the browser closes. The JSON includes the artifact's build revision. It does not assert that all deferred populations are loaded, assess image quality, or pass the hardware performance gate. CI uploads the report and screenshot for every PR.

For the browser disconnect bug, run the same reproducible check with both driver versions against the served build:

```sh
git show main:tools/cdp.mjs > baseline-cdp.mjs
node tools/cdp-disconnect-repro.mjs --driver baseline-cdp.mjs --expect pending --out disconnect-before.json
node tools/cdp-disconnect-repro.mjs --expect rejected --out disconnect-after.json
```

Use a baseline revision predating the fix in place of `main` once it is merged. The baseline request remains pending after closure; the patched request rejects. The harness owns a process group and cleans up the baseline's browser children. The committed [before](software-webgl/disconnect-before.json) and [after](software-webgl/disconnect-after.json) reports reproduce this difference. The [production-build report](software-webgl/smoke.json) and [capture](software-webgl/game.png) verify the rendered application.

Per-bug evidence must additionally exercise the relevant behavior against both build revisions, with deterministic counts, distances, collision results or byte counts. This generic smoke check cannot replace that evidence. Use screenshots or clips for visual behavior, and the hardware gate for GPU performance and shimmer conclusions. Do not upload raw console logs, source URLs, system descriptions or private paths.
