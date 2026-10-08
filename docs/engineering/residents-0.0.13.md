# Residents — 0.0.13

The residents were reworked ([A63](../decisions.md)). The requirements were better-looking surfaces, no clipping, motion
that stays smooth and makes sense, and no deformation or distortion as they move. Every supplied model keeps its
files, hashes, geometry, UVs, textures, eleven joints and triangle budget. The work happens when an actor is built, in
the vertex stage, and in how the surfaces are shaded and posed. All of it lives in
[presentation/npc/](../../src/presentation/npc/) and is switched on for every resident in the game; the review lab can
switch each part off to compare.

Since A65 each resident has a 24-joint rig of its own and moves with authored clips
([resident rigs and motion](resident-rigs-0.0.13.md)). The surfaces, covered layers and dual-quaternion skinning below
carry over to that rig; the joint fit, skin repair, fitted poses, seats and tools below now serve the procedural poser,
which a resident keeps when its rig file is unavailable.

## Joints where the body bends

The prepared residents share one generic joint layout: every elbow hangs straight below its shoulder and every knee
straight below its hip, whatever the model. Relaxed forearms angle forward or back and most stances stand wide, so the
real elbows sat 3–12 cm and the real knees up to 10 cm from the joints that bent them, and a bent forearm or shin
sheared its joint. [jointFit.ts](../../src/presentation/npc/jointFit.ts) refits each actor's private skeleton on load:
the elbow moves to the arm's own centre at elbow height, the knee onto the line from the hip to the measured ankle.
Names, parents, axes and the skin are unchanged and the inverse binds are recomputed, so the figure is identical at
rest and only bends where its own joints are.

## Skin that stays whole

Every prepared skin follows one zone field. Four parts of it fought the poser
([skinRepair.ts](../../src/presentation/npc/skinRepair.ts)):

- **Hip seam.** A quarter of the thigh's weight vanished across one row of triangles at 0.90 m, so a seated hip
  creased. The field is re-derived continuously, fading out by 0.96 m as intended.
- **Shoulder.** The shoulder was a hard cut, every vertex all arm or all torso, so a raised or swinging arm tore it.
  The seam is now blended along the surface, 6 cm either side within 15 cm of the joint.
- **Garments carried by the arms.** Capes, aprons and packs within reach of the source arm were given to the arm and
  swung with it. Surface beyond the arm's measured reach, and detached panels beside it, go back to the body. This is
  opt-in per model where it was measured: Joss Merrin's cape, Hesper Lowe's apron and the fisher's pack.
- **Cloth between the legs.** Skirts, hems, tabards and capes were split down the middle between the legs and tore
  when the legs parted. Cloth that joins the two legs now shares them, by diffusing the split along the surface; separate
  trouser legs never touch below the crotch and keep their own leg. Mara Venn and the fireside resident keep their
  measured long-skirt fit. Pack frames, pauldrons and collars above the neck line stay on the shoulders when the head
  turns.

Positions, UVs, normals, joints and binds are untouched, and four influences still sum to one. The repair is computed
once per source model and shared by every actor of it.

## Joints blended as rigid motions

Linear blending averages bone matrices. Where two joints that share a vertex turn far apart, the average shrinks:
elbows pinch, shoulders cave in, a twisted sleeve collapses. Residents now blend each joint's rigid motion as a unit dual
quaternion, which keeps the surface at its length and volume
([dualQuaternionSkinning.ts](../../src/presentation/npc/dualQuaternionSkinning.ts)). The motions are packed after the
joint matrices in the skeleton's own bone texture (12 × 12 for eleven joints), so the colour pass and every shadow pass
read the same frame. A CPU twin of the blend backs the audits and tests.

## Arms that clear the body

On load each model is measured ([poseFit.ts](../../src/presentation/npc/poseFit.ts)): its torso, hips, thighs and shins
become radial envelopes around their joints, its forearms and hands a few dozen sample points. Short searches then fit:

- **The hanging arm.** The least outward lift that clears hips, skirts and coats at rest (at most 0.24 rad), and the
  extra a walking swing needs as the hand passes a flared skirt (at most 0.2 rad).
- **Gestures that touch the body.** Hands on hips, hands clasped before the belt, hands behind the back and crossed
  arms are placed by two-joint reach on the figure's own surfaces
  ([armReach.ts](../../src/presentation/npc/armReach.ts)): the palm goes to a point on this body, the elbow towards a
  natural pole, and the target steps out a centimetre at a time until forearm and hand ride clear.

A gesture that cannot be placed clear of a body is never chosen for that figure: Oren Halvek's right forearm cannot
ride clear over the left, so crossed arms are left out of that routine, as are clasped hands for the first ford bandit.
Figures whose arms carry a garment swing their arms less and look about or shift their weight instead of folding their
arms. The head-scratch gesture, which reached into faces or above heads on most models, is replaced by hands clasped
before the belt. The poser blends to the fitted angles; nothing is simulated per frame. Figures without a fitted body
(the procedural people) keep written gestures; their hands on hips, which used to stick out in front of the waist, are
now placed by the same reach on the generic frame, and their hands behind the back meet behind it.

## Sitting on real seats

The village's plank benches are 0.55 m high. Each model's seat contact (the buttocks and the backs of the thighs) is
measured on load ([seat.ts](../../src/presentation/npc/seat.ts)), and a seat's height then decides where the hips go:
the contact rests on the seat, the thighs stay level unless the seat is high, when they slope so the soles still reach
the ground, and on a low seat the shins reach forward. Seated residents rest their palms on their thighs. The inn bench
and the ford camp are now places on the actual benches, and the fireside resident sits on the hearth bench at the same
height. Before, every seated resident lowered the hips by one generic amount, which left the seat about 20 cm below a
plank's top.

## Tools for their trades

Four tasks are fitted per body and drawn with tools in hand ([workProps.ts](../../src/presentation/npc/workProps.ts)),
built from the game's own vertex-coloured kit and shown only while their owner works:

| Task | Resident | Tools and motion |
| --- | --- | --- |
| Writing | Sel Anrit, seated at the ford camp | A ledger on the lap and a quill: short strokes along a line, pausing to dip and read |
| Provisioning | Rowan Vale, at the hunter's counter | Hands on the counter; every eight seconds an arrow is lifted to eye height and turned |
| Stonework | Pell Dunmore, at the quarry face | Chisel on the rock, hammer raised slowly and struck fast |
| Measuring | Mara Venn, Sister Edda Sorn, Bess Corran | A measuring rod, the hand sliding along it |

Rowan's place moved 13 cm closer to the counter and Pell's place at the quarry face to within a hammer's reach of the
rock, so the hands meet the counter and the chisel meets stone. Every complete actor stays within its 50,000-triangle
budget with its tools. Under Reduced Motion the hammer's stroke shrinks about the chisel contact rather than the hands
moving elsewhere.

## Surfaces

The prepared models carry one soft 1536 px colour atlas and a damped normal bake under a single rough, non-metal
response, so skin, wool, leather and steel all shaded alike and read as wax or clay.
[residentSurface.ts](../../src/presentation/npc/residentSurface.ts) decides per pixel what each surface is made of, from
its colour and from where it sits on the body (the face, neck, forearms and hands may be bare):

- skin has a finer sheen and lets light bleed a little past its shadow line, warmer there;
- wool and linen stay matte, show their sculpted folds more strongly and catch a soft sheen at grazing angles;
- leather is a little glossier, and on the armoured figures bare steel is metal;
- close up, a fine procedural grain (skin, weave, leather pebble, file marks) sits in the figure's own bind space, so
  it stays put on the moving surface and fades out before it could shimmer;
- a small unsharp mask restores edge contrast where a texel covers about a pixel or more, and the maps are sampled
  anisotropically.

**Covered layers.** Clothes come in layers: an apron's lining against the skirt, the skirt under the apron, legs inside
the skirt, the back under a cape. The bake never saw those covered surfaces and filled them with one flat dark colour.
A deep bend across coarse cloth, a seated knee most of all, could carry a covered layer a few centimetres through its
cover, where it showed as dark shards in the cloth. Each model's covered layers are found on load: another surface lies
within 6 cm in front of them along their normal, or they are the back of cloth whose outer face is covered. They yield
5 cm of depth to whatever covers them, without moving on screen, and their backs, which only show when they have been
carried through, are neither drawn nor cast shadows. Arms, hands and the head neither count as covered nor cover.

## Cost

The repairs and fits are computed once per source model when its first actor is built; every further actor of that
model with the same repair settings reuses them. Surface priors and covered layers keep separate cache entries for
the joint-fit settings that affect them, so the lab's comparisons do not reuse another configuration's measurements.
On the development machine the first builds of all seventeen models take about 2.7 s together on
the CPU (the covered-layer search about 0.8 s of it); later actors take a few milliseconds. Per frame, skinning blends
dual quaternions instead of matrices in the vertex stage and the surface adds a few texture reads and noise terms per
pixel. No per-frame GPU timing was taken.

## Review lab

After `npm run dev`, `/tools/npc-lab.html` shows one resident under the real poser with each part switchable
(`dualQuaternion`, `skinRepair`, `jointFit`, `poseFit`, `surface`), seats and work sites, and debug views of skin
weights, leg sharing, garment release, covered layers and per-triangle stretch. Its `window.lab` interface drives the
same views from headless capture scripts.

Replacing a lab figure releases its private geometry, materials, textures, skeleton and shadow resources through the
game's disposal helper. The joint overlay reuses its buffers and materials until that figure is replaced; a late
load request cannot replace a more recently requested figure.

## Verification

New tests cover:

- the dual-quaternion blend, its shader chunks in the colour and shadow passes, and agreement with linear skinning on
  single-joint points of a delivered model;
- the skin repair on delivered models: normalised influences and an untouched template, a blended shoulder seam, the
  thigh's share past the hip seam, a skirt's stride stretch, trouser legs kept apart and Mara's fit kept;
- two-joint reach accuracy, the fitted hanging arm and every touching gesture on five delivered bodies, gestures the
  fit could not place left out of the routine, garment figures' arms;
- the seat solve, a delivered resident's seat on a 0.55 m bench, the work tools, their visibility and budget, and the
  hammer stroke under Reduced Motion;
- the surface classification prior, the composed shader (normal-bake repair, dual quaternions, surface) and the
  covered-layer search, yield and back-face rules in the colour and shadow passes.

Updated tests: the fireside resident's seat rests on the hearth bench's plank; the four models outside the long-skirt
fit keep their source skin without the repair and take the shared repair with it; the clasped-hands gesture replaces
the head scratch; the stand-in rig of the pose tests exercises the written poses; and the hashing tests of the model
ledger and the world audio have longer timeouts, as they share the disk with workers parsing the same models.

Headless captures of every resident from the front at rest and from behind mid-stride, every standing gesture on the
cast, seated figures on a bench, all four tasks with tools, and before/after pairs (skirt stride, hands on hips, cape
stride, seated long skirt, writing, surface close-up) were reviewed, along with in-game views of the working residents.

## Limits

- No cloth simulation. On a seated figure a long skirt's back panel drapes a few centimetres into the front edge of the
  plank, and a few thin slivers of covered cloth can still show on folded aprons.
- Hesper Lowe's apron panel, fused to the right forearm in the source, still follows that forearm a little; that
  figure's arm swing is reduced and its routine has no arm gestures.
- No foot IK or turning in place, and slow walking can still slide the feet a little. (A69 later steps residents round
  on the spot and plants seated feet; see [figures, crowns and timber](figures-crowns-timber-0.0.13.md#residents).)
- Thornback and the approved hero are untouched. (A69 later rebuilds the hero's model; see the same record.)
