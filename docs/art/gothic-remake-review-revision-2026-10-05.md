# Gothic / Remake review revision — 5 October 2026

The owner supplied `Tervain-Gothic3-Remake-review.html` and asked to make the game
substantially closer to Gothic. This is a same-version **0.0.12** follow-up under
[A54](../decisions.md), extending the [coastal bay revision](coastal-bay-revision-2026-10-05.md)
and [earlier Gothic-inspired presentation](gothic-direction-revision-2026-10-05.md).
Final runtime source is locally committed at **`88cf6678`**, including the
`03f73a9` woodland/renderer implementation and final grass/night corrections.
Strict TypeScript, **1,131 tests in 115 files (101.99 s)**, committed-source
production build **(7.27 s)** and bounded native acceptance pass. Publication
is pending integration as recorded below.

## What the review establishes

The attachment's main Tervain evidence is pinned to **0.0.10 /`d1f3ba6`**,
reviewed on 4 October. It predates the supplied Meshy tree selection, custom
foliage, preceding material pass and revised bay. Its older population counts,
grade settings, camera framing, scores and contact audit do not describe the
current candidate. It also distinguishes a native Gothic 3 launch without
confirmed forest pixels from separately preserved Remake thumbnails and fresh
Tervain frames. These are different evidence sources, not an equal-camera or
equal-weather comparison.

Useful visible lessons are layered plant colonies, broad family groupings,
lower broadleaf edges against taller conifers, worn routes left open through
the vegetation, and ground/rock/water/settlement edges shaping a forest.
Repeated substantial pine columns and continuous pale grass were concerns in
the older Tervain frames. The review's proposed targets and recommendations are
study material, not executable instructions, universal Gothic measurements,
new density quotas, performance results or approved lore.

The attachment and extracted study images remain local review material outside
the repository. No Gothic or Remake image, mesh, texture, animation, font,
program code or gameplay data enters main Tervain, and reference imagery is not
fed to image generation. Separate reference routes and data are unchanged.

## Original woodland and ground changes

The warm woodland now selects several existing approved broadleaf source forms
rather than repeating one wide-rooted source form throughout the habitat. The eastern oak
companion body is widened and repositioned as an authoring envelope so that
actual accepted adults occupy a two-dimensional body after source grounding,
wood, crown, clearing and road rejection. The swale oak body is retained.
This deliberately revises the accepted world population; it does not deform
source meshes or move shared keyed tree origins.

The independent CPU audit loads actual delivered Pine and Meshy geometry and
uses the same all-LOD whole-base grounding, wood radius and crown-fit callbacks
as `buildFlora`. Its before-source is **`1c577ff`**. These are accepted-source
population and geometry measurements, not texture pixels or frame submissions:

| Measure | Before | Candidate |
| --- | ---: | ---: |
| Accepted flora including nonblocking detail | 447 | 456 |
| Canonical blocking trees | 247 | 254 |
| Custom Pine /Meshy trees | 132 /315 | 129 /327 |
| Eastern oak accepted trees /adults | 4 /2 | 11 /4 |
| Eastern oak adult-origin narrow-axis span | Approximately 0 m | 31.533 m |
| Swale oak accepted trees /adults /narrow-axis span | 6 /4 /32.763 m | 6 /4 /32.763 m |

The blocker delta is **nine additions and two removals**, with 245 shared keys.
Shared origins have no X/Z moves; 229 shared full records are unchanged and the
remaining source/stand records are intentionally retuned. The audit preserves
zero clearing-envelope conflicts and cross-preset canonical wood authority.
Origin span, stem count and crown-disc/shade proxies are not canopy coverage,
sky-hole percentage, visual quality scores or FPS. Existing source binaries,
uniform source scale and static attached foliage remain protected.

One continuous original colony field now coordinates grass and woodland floor.
Slender, lower, folded grass retains the same blade topology while allowing
more shaded humus and understory to read. The native sunny oak review exposed
pale angular straw despite the first palette correction. Lower sky-biased
normals, darker root/tip paint and less dry-gold mixing now retain fold contrast
and subdued olive/brown light without changing placements or topology. Ferns have distinct upright and
spreading forms with connected stems and leaflets; shrubs vary between taller
and wider connected branch forms. Moss becomes an asymmetric low carpet, and
litter, logs and nearby fungi share irregular colony relationships rather than
separate repeated grid offsets. Source-crown envelopes, full plant footprints,
terrain tangent agreement and interaction exclusions still govern acceptance.
Low nonblocking detail can be thinned by quality; canonical tree contacts cannot.

The terrain shares accepted geometric crown cover as a soft diffuse sky-light
occlusion field. Direct sunlight and real shadow maps keep their own authority:
this proxy is neither a new collision surface nor a physically simulated canopy
shadow. The distant promontory supplies a valid zero-canopy attribute and
continues to borrow the world's original terrain paint. The road's grass/humus
shoulder transition is broadened smoothly without changing road support or its
clear playable strip.

## Calmer coastal atmosphere

Independent value-noise channels replace the derivative-channel warp that
curled the old low-frequency clouds into giant bright swirls. Smaller detached
pearl/slate banks, thin restrained wisps and less broad sun-halo energy leave
quiet sky between the landscape silhouettes. Daytime haze reveals the distant
ridge more clearly. The first native 22:00 forest view was too dark to navigate
at default brightness. A bounded cool slate-blue diffuse floor and ground bounce
now reveal the road, bark, roots and hero without adding nighttime sunlight;
the night sky, moonlight and player's brightness control remain. An existing
24:00/00:00 hemisphere mismatch is repaired so the
ambient and ground fill no longer jump at midnight. Cloud/star motion still
freezes in Reduced Motion.

The coastal sea reduces reflected-sky and sun-highlight energy. Its geometry,
resolved relief, depth absorption/transmission, dry-land masking, foam,
anti-flicker derivatives and capture stability remain. This is a color/value
revision, not a new water simulation or Gothic renderer equivalence. The
separate menu sky, score, ships, wisp clock, single banner and light treatment
are maintained.

## Resident terrain tiles and rendering tradeoffs

The original ground is partitioned into **64 m resident full-detail tiles**.
Every tile retains the same authored triangle surface, global normals and
material fields at boundaries. Frustum culling applies independently to the
main camera and water captures; there is no distance LOD, terrain unloading,
draw-distance reduction or visual/support height change. The existing global
height/support grid, map and collider authority remain.

Tiles can omit off-camera ground submissions, but shared-edge vertices and
per-tile geometry add CPU memory and potential draw calls. This is a measured
source/geometry tradeoff, not demonstrated hardware acceleration. No warmed
GPU benchmark, reference-PC qualification or FPS gain is claimed. The review's
three-run 1080p/p95 suggestion remains an unfulfilled proposed measurement,
not a test-suite timing target.

## Verification and acceptance limits

| Evidence | Status |
| --- | --- |
| Final implementation | Local runtime **88cf6678**, verified in native production F3, version 0.0.12. |
| Final combined suite | Strict TypeScript and **1,131 tests in 115 files pass (101.99 s)**. The preceding 1,130-test first pass and 1,120-test coastal result remain historical. |
| Atmosphere coverage | Combined regressions include finite full-day light/fog, midnight and twilight continuity, bounded default-brightness night fill, Reduced Motion/brightness, sea relief/disposal and water-capture behavior. |
| Accepted-tree source audit | Counts/deltas above are recorded in local `accepted-stands-before.json`, `accepted-stands-candidate.json` and `accepted-stands-delta.json`. Final native High confirms 456 trees /254 contacts /548 floor pieces. |
| Committed-source production build | Vite production build passes **7.27 s**. The existing entry-chunk size advisory remains. |
| Terrain planes/normals/material boundaries and disposal | Covered by the passing combined regressions; no support-grid or source-asset changes. |
| Native forest, bay and night readability | Final production High day/night, eastern oak body, coastal panorama and High /Medium /Low forest views pass the bounded appearance review. Same trail player is grounded at (-181,1.5,13) in all presets; all retain 254 canonical contacts. |
| Native input and console | Ordinary Space visibly jumps and consumes stamina, followed by grounded recovery; M and I open/close the map and empty inventory. Captured warning/error log is empty. Brief W /Shift+W pulses do not demonstrate sustained gait or speed; those contracts are covered by controller/animation regressions. |
| Warmed same-device performance | Not measured; no FPS or p95 gain claimed. |
| Required CI /approved hosting /served revision | Pending integration and verification of the served version/revision. |

Final native views use the ordinary **1422×800 CSS** viewport without an
override. High /Medium /Low use **DPR 1.8 /1.5 /1** and retain respectively
**456 /398 /342 trees**, **548 /365 /200 floor pieces**, the same contacts and
grounded trail position. Each final preset is a fresh query-driven startup;
the preceding `03f73a9` Settings High →Medium →Low →High rebuild loop separately
verified retained pose/contact identity. No final-source full rebuild loop is
claimed. Trail and oak views use 60° FOV; the explicitly elevated bay camera
uses 70° only for composition review. The world clock advances between captures,
so these are not identical-time comparison frames.

Static look views use the query fixture's Reduced Motion. The subsequent
`motion=1` native road/input check restores ordinary cosmetic animation, proves
jump/landing and map/inventory interaction, and returns to a paused High preview.
Attached tree foliage remains static. This is not a new moving-water cadence
benchmark or a sustained walking/running recording. F3 frame counters are
uncontrolled review samples, not warmed comparative GPU acceptance; heavy High
forest views still submit substantial tree/shadow work and need performance
qualification. Exact terrain preservation/culling/disposal has separate tests.

The local `tervain-gothic-remake-revision` evidence folder preserves final
runtime texts, `final-corrected-tests.log`, `final-corrected-build.log`,
`final-console.json`, the `final-*.jpg` native captures and
`final-evidence-manifest.json`. Earlier `after-*` /`prefinal-*` images are
iteration evidence, including the rejected overly dark night and pale grass;
they do not replace final acceptance. The study file's SHA-256 is
`d85139ca277b0195e7b4f26e02ae2bd2e30fde23c18b49c451083cadeaf8873b`.

The approved Wanderer, source tree/NPC/Pine assets and budgets, saves, calibrated
walking/running and two-minute running endurance, inventory/map/empty starting
hotbar, readable first-town/lighthouse routes, and static attached gameplay
foliage remain. Component checks, CPU audits and older native frames do not
replace current native acceptance. This bounded art pass does not establish
full-game Gothic parity or universal no-clipping proof.

See the [current release record](../production/releases/0.0.12.md) for
historical acceptance evidence and publication status. Final-source CI,
deployment and served version/revision verification remain pending integration;
these local checks do not establish a live release.
