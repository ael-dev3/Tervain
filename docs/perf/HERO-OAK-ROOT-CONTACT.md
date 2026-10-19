# Hero-oak twig-root contact

Reproduced on published **0.0.33 · b317734**. Candidate **f20bb6952**, PR #696, repairs generated wood after leaf seating. It changes no card placement, textures, materials, palette, menus or collision prefix.

## Cause and repair

Canopy linking can delete a parent twig plan after another twig was anchored to it. Remaining child plans retain their old origins. Across the three near hero-oak templates, ten first rendered ring centres sit more than 0.12 **template-local** metres from other wood. The same plans are reused by many instances: this is ten logical roots, not ten world trees or detached crown-card counts.

Reconnect separated origins to retained source wood or an earlier emitted twig centreline. Preserve each planned endpoint, ring count and index topology. Rebuild only the appended wood **after** canopy seating: repairing it earlier moved seated leaves in the preliminary study. The hero's `twigIndex` is the trunk-only collision prefix, not the appended-twig boundary, so the helper derives appended ranges from the actual plans.

| Template | Flagged roots before / after | First stem segments crossing prior wood, before / after | Wood triangles |
| --- | ---: | ---: | ---: |
| hero-oak | 2 / 0 | 0 / 2 | 5,068 |
| hero-oak-b | 3 / 0 | 0 / 3 | 4,758 |
| hero-oak-c | 5 / 0 | 0 / 5 | 4,850 |

The ray test runs from the actual first ring centre to the next ring centre against **preceding** rendered wood triangles. Own/later triangles cannot establish support. It validates the entry graft, not every possible intersection farther along the whole stem. Centre-to-surface distance is not a literal surface clearance.

22 focused tests pass, including unchanged source wood prefix, collision boundary, twig tips, triangle indices and all nine source leaf LOD buffers. Production build/typecheck passes. All three compiled near-wood hashes match the source-tested candidate, and all three native near-leaf hashes match live **after the runtime leaf-island pass**, independently confirming no indirect card movement there. [Source contact data](proofs/hero-oak-root-contact/source-contact.json), [compiled agreement](proofs/hero-oak-root-contact/compiled-agreement.json), [live hashes](proofs/hero-oak-root-contact/native-baseline.json), [candidate hashes](proofs/hero-oak-root-contact/native-candidate.json).

## Player-path views and visibility limits

For each logical root, inspect the instance with the nearest authored road centre line. Camera height is terrain +1.7 m; FOV55, High, native 640×360 post/MSAA4. The camera looks up toward the root. All ten tested positions pass the ordinary movement-collider query. This is a manually positioned eye-height road view, **not** a recorded input-driven walk or full physics-route test. World coordinates follow (x,y,z).

The root region is a 101×101-pixel square centred on the projected old ring centre. Six fixtures show graft changes there (2,3,4,6,8,9). They are partly occluded, often only a few pixels; nearby grafts can share the rectangle. This supports visible **graft** correction in those views, not visibility of every exact ring-cap surface. Fixtures 0,1,5,7 have no root-region change and are classed as **occluded/unverified**, not visible successes. Other views could reveal them; this is not a visibility census of every instance.

The gap below is the old ring-centre distance scaled into **world metres** for the selected instance. It is not an uncovered screen-space gap or literal surface clearance. All final ring-centre distances are below 0.12 template-local m, with first-segment contact independently checked.

| Pose | Tree / logical twig | Old root world position | Eye position on path | Old world distance | Changed root-region pixels | Native screenshots |
| --- | --- | --- | --- | ---: | ---: | --- |
| 0 | `tree:wild:69:26` / 23 | (60.818, 12.766, -10.362) | (58.057, 3.285, -14.043) | 1.225 | 0 | [before](proofs/hero-oak-root-contact/renders/before-0.png) / [after](proofs/hero-oak-root-contact/renders/after-0.png) |
| 1 | `tree:wild:69:26` / 30 | (59.582, 17.916, -7.423) | (55.856, 3.273, -12.392) | 0.473 | 0 | [before](proofs/hero-oak-root-contact/renders/before-1.png) / [after](proofs/hero-oak-root-contact/renders/after-1.png) |
| 2 | `tree:wild:59:18` / 22 | (-3.131, 8.138, -49.579) | (3.076, 5.370, -50.465) | 0.245 | 12 | [before](proofs/hero-oak-root-contact/renders/before-2.png) / [after](proofs/hero-oak-root-contact/renders/after-2.png) |
| 3 | `tree:wild:47:37` / 20 | (-83.602, 5.073, 66.551) | (-90.000, 2.935, 62.000) | 0.238 | 30 | [before](proofs/hero-oak-root-contact/renders/before-3.png) / [after](proofs/hero-oak-root-contact/renders/after-3.png) |
| 4 | `tree:wild:47:37` / 16 | (-83.577, 4.935, 66.753) | (-90.000, 2.935, 62.000) | 0.238 | 33 | [before](proofs/hero-oak-root-contact/renders/before-4.png) / [after](proofs/hero-oak-root-contact/renders/after-4.png) |
| 5 | `tree:wild:41:32:sapling` / 29 | (-114.902, 8.063, 33.556) | (-117.584, 6.031, 24.167) | 0.196 | 0 | [before](proofs/hero-oak-root-contact/renders/before-5.png) / [after](proofs/hero-oak-root-contact/renders/after-5.png) |
| 6 | `tree:wild:47:37` / 15 | (-83.262, 3.880, 69.452) | (-90.000, 2.935, 62.000) | 0.085 | 18 | [before](proofs/hero-oak-root-contact/renders/before-6.png) / [after](proofs/hero-oak-root-contact/renders/after-6.png) |
| 7 | `tree:wild:41:32:sapling` / 24 | (-116.116, 9.478, 34.262) | (-118.893, 6.132, 24.541) | 0.600 | 0 | [before](proofs/hero-oak-root-contact/renders/before-7.png) / [after](proofs/hero-oak-root-contact/renders/after-7.png) |
| 8 | `tree:wild:23:27` / 13 | (-228.711, 8.535, 11.963) | (-223.334, 2.785, 21.061) | 1.241 | 63 | [before](proofs/hero-oak-root-contact/renders/before-8.png) / [after](proofs/hero-oak-root-contact/renders/after-8.png) |
| 9 | `tree:wild:32:27` / 10 | (-163.342, 9.730, 6.160) | (-169.853, 6.460, 17.178) | 3.578 | 17 | [before](proofs/hero-oak-root-contact/renders/before-9.png) / [after](proofs/hero-oak-root-contact/renders/after-9.png) |

Every retained pair has equal draw/triangle submissions; all ten restored controls match every RGB channel, with zero console/GL errors. [Full rendered receipt](proofs/hero-oak-root-contact/rendered.json) includes exact camera positions and counters; [path targets](proofs/hero-oak-root-contact/path-targets.json) includes transforms and local coordinates. Restored PNGs are retained beside before/after images.

The initial cold multi-view run was **rejected** when draw counts rose 269→289 while images remained equal at a later pose. The final replay drains streaming before comparisons. Raster is suppressed only for discarded state warm-up, then restored before a full native warm frame and all retained frames. Shadows refresh for retained renders. The script rejects a suppressed raster flag, changed deployment, restored-control drift, errors or increased submissions. That state-only warm-up is separate from the budget gate, which renders normally throughout. Fixed/rest wind is used; animated-wind contact is not claimed.

## Cost and gate

| Metric | Published b317734 | Compiled f20bb6952 | Delta |
| --- | ---: | ---: | ---: |
| Max draws, stock gate | 285 | 285 | 0 |
| Max triangles, stock gate | 3,048,306 | 3,048,306 | 0 |
| Console errors | 0 | 0 | 0 |
| Shader programs / texture taps added | — | 0 | 0 |
| New per-frame JS repair calls | 0 | 0 | 0 |

The helper runs during model construction, adding a temporary wood rebuild/search then disposing old geometry. Extra load CPU is not benchmarked. Final geometry topology and shader paths are unchanged; this is not a hardware frame-time or heat measurement. The page does not measure shader cost or JS timing; zero added frame calls is a source-path fact, not a timing result.

**play-gate: PASS f20bb6952**, actual exit 0, allowance 0, two same-revision live probes and four completed samples per probe. [Stock receipt](proofs/hero-oak-root-contact/budget.md). Hardware motion/visual review and live publication remain maintainer work; this does not close the overall foliage-quality goal.

## Reproduce

```sh
npx vitest run tests/presentation/heroTwigRootContact.test.ts tests/presentation/twigRootContact.test.ts tests/presentation/twigTangentFrame.test.ts tests/presentation/twigBarkSearch.test.ts tests/presentation/canopyBaseline.test.ts
HERO_ROOT_RECEIPT=hero-contact.json npx vitest run tests/presentation/heroTwigRootReceipt.test.ts
node tools/inspect-hero-root-paths.mjs hero-root-paths.json
node tools/repro-live-hero-twig-roots.mjs --paths hero-root-paths.json --out hero-renders
```

The two rendered tools require a WebGL-capable Chrome; software WebGL is supported. The second tool accepts `--url BUILD_URL` but deliberately requires its loaded revision to match the supplied path inventory. It applies the current source helper to native registered wood in that browser session, leaving native foliage/materials intact. Independent compiled hashes and stock gate above verify the shipped candidate separately. `tools/read-hero-geometry.mjs BUILD_URL_PREFIX OUTPUT_JSON` reads an already-open diagnostic browser without changing its state; browser metadata is not published.
