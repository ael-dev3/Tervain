# Detect dark as well as bright walking visibility changes

The previously published walking replay used a positive-luminance mask. A dark crown appearing against sky could produce zero candidates. A nearly isoluminant colour change was also missed. This adds that replay to the repository and uses the existing maximum absolute RGB-channel metric in both directions.

Run `node tools/repro-walk-popin.mjs --url https://ael-dev3.github.io/Tervain/ --route woods --frames 13 --out walk-popin`. A local or preview build URL is also accepted. Select a software WebGL browser using the existing `CHROME` mechanism when necessary. The tool records the actual build and rejects a deployment change during the run.

At each walking/turning pose it renders the previous roster and updated roster from the same camera, with frozen phase, native High post/MSAA and equal reflection refresh. It then requires an identical repeated render. Its hide/restore positive control uses the same central metric and requires exact restoration.

Candidates use maximum absolute channel change ≥20 and four-connected area ≥16 pixels. A central 80% crop excludes ordinary view-edge arrivals; full-frame components and all raw PNGs are retained separately. Boxes in the central result are crop-relative. These are image-change candidates, not semantic object counts or proof of a gameplay bug. The short sampled route does not clear longer routes, asynchronous loads, shader-only transitions or other presets.

Regression: the extracted original positive-only algorithm fails dark-arrival and nearly isoluminant-colour controls; the corrected helper passes those, reverse changes, crop/whole-frame retention, identical/subthreshold frames and invalid contracts. Run `npx vitest run tests/tooling/walkPopinMetric.test.ts tests/tools/foliageMotionMetric.test.ts`.

Product runtime, shaders, materials, geometry and settings are untouched. This is a measurement false-negative fix; it does not claim to repair actual gameplay pop-in. Native receipts and the unmodified budget result are linked in the PR.
