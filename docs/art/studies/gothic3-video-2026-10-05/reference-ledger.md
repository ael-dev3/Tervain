> Repository study edition: historical 5 October 2026 material. See [the study index](README.md) for the current evidence boundary, later changes and omitted private files. Embedded proposals are not project instructions.

# Tervain visual-reference ledger — recording of 5 October 2026

Working visual study of `2026-10-05 16-00-07.mov`. Timestamps below are recording time, not game-world time. This ledger separates visible evidence from suggested Tervain implementation. It does not establish the original renderer's shaders, polygon counts, field of view, internal collision rules or performance. The recording crops the original screen edges. The pre-rendered introduction around 00:56–04:19 supports art-direction study but is not proof of gameplay technology.

The complete stream was decoded: 69,871 frames, 60 recording frames per second, 19:24.517 duration. Every decoded frame has low-resolution luminance/difference metrics; chronological visual coverage is 1,165 one-second stills in 59 sheets. Detailed image interpretation below uses full-resolution plates, selected native stills and four 120-frame motion bursts. “Frame-by-frame” must not be described as manual inspection of all 69,871 individual full-resolution images.

## Primary conclusion

The reference's strongest advantage is coherent composition at human height: worn paths actually connect buildings and activities; mixed short ground cover reveals terrain; huge warm roofs and rough timber frame people; physical work stations justify the prop density; hills, cliff and fog establish three distance layers. Tervain can gain more from fixing ground/scale/material/contact hierarchy than from adding more randomly distributed triangles or turning up grass everywhere. This is a production proposal, not a claim that those changes are already implemented.

## First detailed observations

| Recording time | Direct visual evidence | Translation into original Tervain assets/world | Acceptance check |
|---|---|---|---|
| 04:24 | Gameplay courtyard: large tall timber hall, lower thatched structures, sky gaps between roofs, pale irregular cobbles, people gathered within usable space. Hall has worn vertical planks and stone steps; fire sits at a construction edge. | Build Rillford around an authored courtyard and a tall civic/Templar-affiliated hall. Preserve a clear crossing corridor; change building heights and roof spans deliberately rather than putting same-size huts on a uniform scatter. | Walk through courtyard at normal hero height: silhouette must read before inspecting textures; no vegetation crosses door or stair clearance. |
| 06:50 | Overhead ground beside a palisade has dark soil, green low plants, irregular tufts and light mineral flecks. Grass is excluded from some travelled margins and does not form one continuous tall carpet. | Paint a low ground-cover blend first. Use sparse grass clusters at edge zones and suppress near footfall routes, foundations, work spaces and roots. Add moss/damp soil as spatially meaningful masks. | Ground remains believable with 3D grass temporarily hidden. Show hero's feet clearly on routes. |
| 11:05 | Worn dirt junction branches through mixed green cover; signs at decision points; a tilted large rock creates one side of the road's composition. | Route masks should drive material, plant clearance and prop placement together. Place signs where route decisions actually occur. Break symmetry with a landmark boulder on one side and lower planted space on the other. | Follow route without opening map; verify exact sign destination/direction and no post occludes lettering. |
| 12:16 | Mixed woodland slope: narrow tree crowns, irregular trunks, pale sky holes, a foreground rough boulder, scattered purple plants and background trees fading into haze. Lower trunks remain legible. | Use biome-specific groups rather than trees at one constant spacing. Keep under-canopy views and a partly open lower storey. Place lushness in clumps, varied crown heights and overlapping but readable layers. | Capture eye-level approach, side and overhead views; validate connected foliage and no distortions; protected custom 10k pine remains unchanged. |

![Gameplay courtyard at 04:24](plates/reference-0264.jpg)

![Ground-cover hierarchy at 06:50](plates/reference-0410.jpg)

![Road junction at 11:05](plates/reference-0665.jpg)

![Woodland slope at 12:16](plates/reference-0736.jpg)

## Evidence and reproduction limits

Use the pictures to reproduce design relationships with original work, not to extract Gothic meshes, textures, logos or animation files into Tervain. This document is local study material. No game edits, version promotion, releases, Actions dispatches, push, PR creation/update or merge are part of this audit. All proposed remote publication remains subject to the coordinating assistant's current Actions budget preflight and the existing CI/hosting block; unknown monthly usage remains unknown.

## Detailed environment, construction and human-scale ledger

### 1. Landscape is a sequence of readable spaces

At 12:30 (`plates/reference-0750.jpg`) the foreground hero is backed by a wooded slope to the right, an open green descending meadow and sandy shore to the left, and a broad hazy headland behind the water. These are different shapes with different visual jobs. Tall trees are not plastered onto the entire coast. At 12:33 (`second-half-native/12-33.jpg`) two small shore buildings and a fence stair establish a human path down the landform. The sandy bay occupies its own low platform. Vegetation thins at the transition to exposed sand and the sea becomes a single quiet dark mass.

**Tervain translation:** author a continuous route from settlement ridge to coast, with a lower fishing/work shelter, believable descending footpath or stair, a grass shoulder, eroded rock lip and sandy low ground. Compose the bay from the route at hero height before making the map larger. Its original geography can preserve Rillford, the coastal beacon and local Templar obligations; it does not need the reference's settlement names or exact silhouette. In a wide shot the coast should be recognizable by shape even in a neutral gray-material mode.

**Failure to avoid:** huge high-detail trees placed between the player and every landmark; a uniformly high grass carpet down to the water; perfectly concentric circular shore bands; a house looking isolated because neither path nor work space connects to it. The reference's very dense lavender haze is visible art direction, but copying its exact color is unnecessary. Choose a muted blue-gray horizon that fits Tervain's sky and daylight, then validate in motion. Do not solve an empty background by making fog opaque at near distances.

![Connected slope, fishing structures, sand and dark water at 12:33](second-half-native/12-33.jpg)

### 2. Ground is the main lushness layer

At 11:16, the ground is almost completely occupied by small mottled leaf/low-plant marks with scattered rounded stones and thin fallen twigs. These marks read at a much smaller scale than the hero. The image does not prove whether they are in one diffuse texture, multiple blends, decals or geometry, but much of the ground stays visually rich without tall silhouettes. At 06:50 the same principle combines worn soil, mottled low green cover and discrete tufts close to a palisade.

**Tervain translation:** make a small original terrain family: compacted dirt, short trampled meadow, leafy woodland soil, exposed mineral earth and coastal sand. Give each enough low-frequency color variation to read from a distance and middle-scale texture to hold near the hero. Allow the route's dirt to feather and fray into nearby cover. Keep minimum believable surface coverage with 3D grass disabled. Additional plants should enrich an already coherent surface rather than obscure texture deficiencies.

**Authoring rule:** footsteps and cart traffic justify dirt; runoff and shade justify damp/mossy soil; mineral exposure follows rock and steep banks; sand belongs on the shore. Noise is a breakup tool inside those causes, not their substitute. The exact texture scale must be reviewed against an actual 1.8m character; the video cannot provide a meter calibration for each pebble.

**Acceptance:** a 60-second walking sweep toward, across and away from the junction, with a slow orbit at ground level. Check the dirt corridor remains continuous, grass does not reappear through road centers, and terrain detail does not scintillate as the hero moves. Compare foliage-on and foliage-off images. Record the same position, time-of-day and camera each time.

![Low ground-cover and pebble hierarchy at 11:16](second-half-native/11-16.jpg)

### 3. Grass height varies by purpose

At 11:05 the path is nearly bare while each side is composed of different blocks of upright grass, broader plants and low cover. At 15:53 the beacon path is much narrower and surrounded by taller meadow, but its central travel strip still remains visible. At 16:06 the dirt opens into a wider rubbed patch at the building entrance. At 16:31 foreground tall grass frames the conversation and hazy cliffs, while shorter vegetation remains around the actual route.

**Tervain translation:** derive density and height from route, doorway, courtyard, work-area, slope and root masks. Use a compact grass/low-herb set with a few broader silhouettes, not hundreds of identical long blades distributed at one global height. Use taller clumps on untravelled shoulders, low cover within a settlement and shrub/fern clusters in moist wooded pockets. Place some dry seed stalks as accents. Anchor every cluster to the same terrain/contact rules as rocks.

**Acceptance:** no blades crossing toes on a maintained route; named residents visible from torso to face; no grass rooted in cobblestone slabs, bare steps, furnace working surfaces or building interiors. Do not make every plant collide; reserve physical contacts for meaningful obstacles so an ordinary meadow remains traversable.

### 4. Readable roads are created by negative space

At 11:05 three directions can be understood from the dirt alone. The tilted boulder and signs reinforce the decision point. At 11:24 the wooden arrow plank and its screen-space object label identify a route. The visible name “Montera” floats above the prop; this image does not establish painted text on the wood.

**Tervain translation:** keep the physical Tervain sign readable in-world, with correct arrow and town destination, and keep its support behind the readable face. A subtle object label can support interaction, but it should not be required to comprehend the landmark. Make the dirt widths and edge plants match how often a route is used. Town-to-town routes are broader; a beacon keeper's approach can be narrower; a work courtyard is more rubbed and irregular. Place visible route change landmarks ahead of the player, not behind foliage.

**Acceptance:** a player who has never seen the map should be able to reach the first town by following its sign and worn ground; compare both approach directions. The test is not satisfied by a readable sign only in a free-camera screenshot.

![Physical sign, broad rock and natural grassland edge at 11:24](second-half-native/11-24.jpg)

### 5. Rocks have larger form and smaller surface detail

At 11:24 the central rock is a broad low outcrop; a second boulder sits farther uphill; small stones cover the foreground at a different scale. At 12:18 the main boulder has a rough mottled surface and uneven top that works as a foreground mass. Its material reads gray-brown and mossy rather than like polished metal. The exact normal-map implementation and friction cannot be established from the video.

**Tervain translation:** use a few original hero rock shapes with broad ledges, irregular broken profiles and a family of companion stones. Avoid uniformly smooth spherical rocks and specular glints over every face. Use world-consistent material color, roughness and moderate relief, and place mottled moss in retained moisture and shaded recesses. Let broad terrain shelves meet outcrops at plausible boundaries.

**Contact task:** make the collision shape agree with the visible walkable top, preserving intentionally unwalkable steep sides. Low rocks should be stepable or jumpable with ordinary movement; tall steep outcrops should remain true obstacles. A ray-hit to one triangle alone is not a good walkability decision. Validate the character capsule, slope/step limits and landing support on the same authored shapes. Do not promise friction, a climbing system or collision correctness solely from screenshot similarity.

### 6. Trees retain an understandable branch skeleton

At 11:48, the broadleaf tree visibly splits into large trunk limbs, smaller crooked branches and leaf groups with sky visible between them. The leaves have readable ovoid shapes and muted shades; many planes reveal lighter and darker sides. At 12:18 a narrower mixed stand repeats the same hierarchy at a distance, with differently sized crowns and open lower trunks.

**Tervain translation:** do not build lushness by turning each tree into one solid green blob. Keep a continuous trunk-to-limb-to-foliage relationship. Place leaf clusters along meaningful branch tips and secondary limbs. Accept some silhouette holes and some bare limbs; these are what reveal the tree's volume. Use clumped placement, varying crown width, height and lean. Use the original custom 10k pine where it belongs, with new authored trees below their approved 20k ceiling, and preserve full source proportions instead of squeezing all trees into one template bounding box.

**Rendering task:** use well-guttered alpha cards and stable alpha/mip filtering if original foliage cards are adopted; validate the underside, silhouette, noon/day shadow, distance transitions and tree rotation. This is a proposed implementation, not a finding that the original video uses one specific card system. Static trunk/attached foliage can remain the approved baseline. A later leaf-only breeze must leave trunk and rooted contacts still; no wormlike whole-tree sway.

![Visible broadleaf skeleton and sky gaps at 11:48](second-half-native/11-48.jpg)

### 7. Density has local intent

At 12:18 the foreground combines fern, small flowers, one main boulder and taller trees. At 12:33 meadow and stone clusters remain separated enough that the fishing structures and sandy beach are not lost. At 15:53 deer are visible in the meadow to the right of a clear path, next to a dead limb, rather than standing in the middle of an obstruction-filled route.

**Tervain translation:** author small biome/purpose recipes: open grazed coast, woodland shoulder, shaded fern pocket, work-yard hardstand, herb patch, exposed ridge. Density should be a field with exclusions and cluster centers, not one constant random count. Keep repeated plants different in rotation/size but not in arbitrary extreme stretch. Put wildlife where it adds life to an understandable scene. Its route, turning and avoidance should match terrain contacts and not clip through the beacon or road sign.

### 8. Architecture exaggerates proportions, not finish quality

At 04:24 the hall is tall and blocky; roofs are huge warm masses over dark walls. At 13:56 (`plates/reference-0836.jpg`) hut roof pitches are steep, roof surfaces are divided into broad overlapping shingles, and rafter ends project beyond the eaves. At 14:25 the great timber hall has rough plank variation, heavy doorway jambs, a dark interior and an irregular stone stair. At 16:16 the lighthouse keeper's house combines a steep triangular gable, stone upper wall, darker plank lower body and a simple projecting timber canopy.

**Tervain translation:** choose a small regional construction vocabulary and make its members relate: oversized steep roof pitches, deep eaves, stout uprights and braces, visibly older planks, a rough stone footing and practical access. Give civic buildings greater height/roof span and ordinary buildings lower masses. The point is deliberate form and life, not modern clean realism. Keep the accepted original architectural assets or remake them with a consistent kit; do not extract reference assets.

**Full geometry requirement:** front, rear, underside/eaves, interior-visible doorway, gable side, stair ends and foundation must be authored. A beautiful front face on a hollow disconnected box is not sufficient. Ensure canopy loads have posts or wall supports, braces actually meet their beams, roofs meet walls and foundation depth covers local terrain variation. Vary boards and shingles enough to feel weathered while retaining structural logic.

**Acceptance:** full orbit with close views on all façades; ordinary traversal around rear and up entrance stairs; camera approaching and leaving the doorway; underside shot at roof edge. Check no open backfaces, sky gaps through supposedly solid wall, floating foundation, spikes at terrace boundaries or materials stretched to a completely different scale. Building footprints and colliders must match the rendered volume.

![Exaggerated roof silhouette and practical courtyard proportions at 13:56](plates/reference-0836.jpg)

![Tall hall doorway, braces and rough stone threshold at 14:25](second-half-native/14-25.jpg)

### 9. Settlement ground changes height in small increments

At 15:31 the courtyard is not a flat disc. Broad irregular shallow terraces connect two areas and wrap around a tree, while crates and a rope coil occupy an edge. Stone footings follow those levels. The route remains bare enough for movement. At 15:23 the forge is a slightly raised paved working space with a retaining edge, a furnace at the back and clear access at the front.

**Tervain translation:** add authored human-scale terraces and worn steps inside and around the settlement. Use them to distinguish civic entrance, forge hardstand and ordinary walking ground. Do not simply apply high-frequency noise to a previously flat map. Every level change must have an accessible route and colliders that agree with it. Tree bases should meet terrain; roots can widen into the soil but must not create unintended ankle-high collision fences.

**Acceptance:** normal walk/run/jump from courtyard to each door, forge and upper terrace, with a low side camera showing boots and step edges. Check grounded status and floor contacts; do not tune the controller to ignore all stairs merely to hide a bad mesh. Preserve the existing road/save/world contacts until replacements have evidence.

![Human-scale terraces and grounded tree base at 15:31](second-half-native/15-31.jpg)

### 10. Props describe work and social use

At 10:06 the cluster consists of log stacks, a sawhorse-supported log, chopping/wood tools and a bucket against a palisade. The items form one wood-processing station. At 15:23 the forge contains an anvil, a furnace, a grindstone, work-space paving and crates. At 13:56 a treatment/work table has a body, a small bowl and surrounding residents. The recording's combat leaves bodies in those spaces; this is an observed situation, not a proposed target for Tervain gore or encounter design.

**Tervain translation:** make compact original stations tied to NPC roles: woodworker, fisher, forge keeper, trader, herbalist and hall quartermaster. Place a main working object, necessary tools and supplies, and one staging/storage cluster. Give NPCs the correct reach, body orientation, work animation, tool grip and walk-in/walk-out space. One small complete station adds more credibility than a dozen unrelated barrels along every wall.

**Acceptance:** from a still picture, a reviewer can state what work happens there; in motion, the hands meet the tool/work surface without obvious drift; all support legs rest on the correct floor. Consumable items and clutter should be intentionally placed according to ownership and interaction rules, not made pickup-able solely because they are visible.

![A coherent wood-processing station, despite the battle, at 10:06](second-half-native/10-06.jpg)

![Forge station, furnace, anvil and raised paving at 15:23](second-half-native/15-23.jpg)

### 11. Lore is located where institutions would place it

At 04:24 the reference hall has two slim vertical red banners; most smaller huts do not. A shield-shaped sign sits by one hut in the 14:54 inventory plate. The art's institutions are not pasted onto all available surfaces.

**Tervain translation:** follow the approved Hegemony emblem and Templar relationship. Place one deliberate banner at a hall, gate post or other institutionally justified location; use original woven/stitched material and a real attachment to the building/pole. Ordinary traders show silk, sacks, spice vessels, tools and goods. A native banner must sit within a credible cloth mesh with seams, pole/loops and gravity; a random rigid emblem disk attached to the castle or repeated on every prop remains the wrong direction. Gentle approved cloth motion should use anchored edge constraints and limited leaf/cloth movement, not displacement of entire structures.

### 12. Characters are strongly shaped and materially restrained

At 18:14 the hero close-up has a broad brow, long clear nose plane, wide cheek/jaw volume, strong beard shape and a stout neck. Eyebrows/beard/hair structure are substantially texture-defined rather than sculpted strand by strand. At 13:56 the apron-clad speaker has broad upper arms and thick torso volume; the white apron, reddish short sleeves and dark belt establish the role with a few major material blocks. At 16:16 the lighthouse speaker's coat is a large brown volume, with ordinary skin/hair and a held pickaxe. Costumes have thick shoulders, large cuff breaks, belts and overlapping cloth/leather layers. The reference is exaggerated and rough, not miniature photoreal anatomy.

**Tervain translation:** preserve the approved Wanderer and cleaned Meshed NPC faces while improving screen-scale silhouette: coherent shoulder/chest width, layered clothing thickness, readable hair/jaw and properly attached hands. Use role/faction color restraint and a small material hierarchy. Spend geometry on actual silhouette, bending joints and visible clothing layers, and texture resolution on face/hands/important garment regions. Do not use high normal strength to substitute for those shapes or add tiny wrinkles that make the face noisy. Keep all complete NPCs under 50k triangles including equipment; the approved hero exception remains separate.

**Acceptance:** show front, side, rear and three-quarter at conversation distance, with a neutral/lighting-free albedo check as well as daylight/overcast/night game light. Validate chin, brow, ear, armpit, palm, waist, crotch and skirt hem rather than judging only the front final screenshot. Include idle, walking, turning, sitting, working and a tool hold. The current 0.0.12 surface repair is a useful baseline; do not undo it or claim new evidence verifies every future pose.

![Broad facial planes and large clothing layers at 18:14](second-half-native/18-14.jpg)

### 13. Conversation is staged inside the world

At 14:25 the player and resident are framed next to the hall and its access. At 16:16 the two characters face one another beneath the keeper house and tower. The resident holds a pickaxe near its shaft, while the hero's hands gesture. At 16:31 a second speaker angle retains meadow and distant cliffs. The actors are not isolated in a featureless portrait booth. However the pickaxe head can cross the resident's face in some angles, which is a weakness, not a feature to copy.

**Tervain translation:** build a camera rule that finds a readable two-shot or speaker view using actual actor locations and local obstacles; keep world context and an unobstructed face. Use eye-line/head turn, varied gestures and stable support. Preserve the player's prior dialogue-window direction until a new UX is deliberately approved; this reference supports scene staging without automatically authorizing a new permanent dialog window. Tools should remain plausible held props, but camera compositions should avoid putting their shafts across eyes or mouths.

**Acceptance:** talk near hall wall, meadow edge, forge canopy and a slope. Test left/right speaker order and different heights, with tools and equipment equipped. Neither actor intersects the other; camera never clips through a wall; UI remains readable without requiring exact Gothic colors or copying cropped pixel positions.

![Conversation as part of a constructed and inhabited place at 16:16](second-half-native/16-16.jpg)

### 14. Items and UI show objects instead of generic dashboard symbols

At 10:38 the inventory's weapon category contains small pictorial sword, bow, arrow stack and axe icons in a consistent grid. A mana plant tooltip has a small plant picture, one effect and value, with the world visible behind it. At 14:54 bottles, meat, herbs and a special object occupy a compact grid; many cells are empty. Thin muted metal borders support the content rather than filling every slot with decorative icons.

**Tervain translation:** preserve the originally empty hotbar/skill panel for a new character. Populate inventory from genuinely collected/equipped items and provide pictorial original icons that correspond to the 3D world pickups. Category and tooltip hierarchy can use warm parchment/brass/charcoal that fits Tervain. Keep persistent 3D world context in inventory where it does not create performance or readability problems; exact pausing behavior cannot be concluded from these screenshots.

**Acceptance:** hover, drag to hotbar, equip, split a stack if supported, pick up in world, save/load, close and reopen. Empty slots remain empty; the item picture and description correspond to the model. The recording crops the screen; do not take its shown margins as verified original HUD layout.

![Object icons, tooltip hierarchy and continuing world context at 10:38](second-half-native/10-38.jpg)

## Consecutive-frame study of four targeted bursts

Each burst is 120 consecutive decoded recording frames at 60 fps, spanning roughly two seconds. Thumbnails were visually inspected in order in four 30-frame sheets per burst. Picture similarity is not an engine performance metric: repeated or subtly different frames can result from capture cadence, video compression, interpolation, actual motion or engine timing. These strips have no world-unit speed calibration and do not establish internal collision or foot-IK technology.

| Burst | Recording interval | Consecutive-frame observation | Tervain action and specific limit |
|---|---|---|---|
| Combat | 05:23.000–05:24.983 | Frames 001–030 establish a facing opponent in a broad-legged stance within the cobbled clear corridor. In 031–060 the opponent raises/prepares a weapon and moves toward the hero; 061–090 show a large sweep/turn with bent body and visible arm arc; 091–120 lower the weapon/body into recovery. Surrounding structures stay consistent; side combat continues. | Use distinct anticipation, strike, follow-through and recovery with facing/position decisions tied to resolved physical movement. Weapon contact/hit time needs actual engine diagnostics, not these pixels. Do not reproduce the reference's crowded intersections simply because the action has weight. |
| “Walk” folder / roadside hold | 11:03.000–11:04.983 | The hero holds broadly the same roadside position and the junction/rock/sign composition remains almost fixed throughout 120 frames; subtle body/vegetation/image changes are present. This is not a good visible foot-stride sample. | Use it to study stable composition and path hierarchy, not to assert walk speed, cadence, foot locking, engine FPS or run animation quality. Acquire a separate in-engine Tervain constant-speed stride strip for speed/animation calibration. |
| Stair/platform | 17:57.000–17:58.983 | 001–030 begin close to timber boards/rail; 031–060 progressively reveal upper platform and sky; 061–090 open a horizon behind the platform; 091–120 leave the character against a wide timber deck and tower stair. Camera is rising/progressing in a cramped constructed space; much foot contact is cropped. | Validate a connected rendered floor and physics floor, camera shortening/occlusion handling and stable stair progression. It does not prove perfect foot contacts/IK or a specific continuous-ramp collider. Test Tervain boot contact with an uncropped low side view. |
| Camera/body stress | 18:36.000–18:37.983 | Close timber wall, rail and the player's body occupy most of the frame. The body is pressed against the wall with limited view space and camera proximity; the frame moves down/around the rail. Later 18:40 full-resolution plate shows camera/body/understructure intersection explicitly. | Treat as a negative acceptance case. Sweep camera volume against architecture, prevent ray-only thin-rail failures, shorten smoothly where possible, use a safe near limit and controlled actor fade only when necessary. Do not reproduce an inside-torso view, broken underside or camera trapped behind stair beams. |

![Combat preparation and approach — first 30 consecutive frames](burst-sheet-combat-1.jpg)

![Combat sweep and recovery — consecutive frames 61–90](burst-sheet-combat-3.jpg)

![Roadside hold — this is not speed calibration](burst-sheet-walk-1.jpg)

![Stair/platform reveal — consecutive frames 61–90](burst-sheet-stairs-3.jpg)

![Wall/rail camera stress — consecutive frames 31–60](burst-sheet-camera-clip-2.jpg)

![Negative reference: camera/body intersection at 18:40](second-half-native/18-40.jpg)

## Original Tervain production sequence derived from the ledger

1. **Build one controlled representative route.** Pick a hall courtyard → worn junction → meadow shoulder → wooded overlook → beacon approach. Keep this manageable instead of expanding every biome simultaneously. Use fixed native capture positions and a recorded normal walk through them. Let this route prove the style before spreading it.
2. **Repair the ground and plant hierarchy.** Low textured cover, meaningful wear/soil masks, variable grass heights, route/footprint exclusions and stable mip/alpha behavior come before simply increasing vegetation counts. The tree triangle budget is a ceiling; expensive overdraw can still make an under-budget tree unsuitable.
3. **Author architectural masses and construction.** Tall/low roof hierarchy, coherent original wood/stone family, completed all-sided geometry, deep thresholds, practical stairs and connected terrain foundations. Build one complete hall, ordinary hut and forge before variations.
4. **Make activities believable.** Grounded work stations; correct tools and grips; resident poses oriented to their work; clear entry, turning and interaction spaces; small deliberate lore marking. Keep irrelevant objects out of the center of routes.
5. **Refine actor motion and contact.** Preserve final 0.0.12 repaired geometry. Validate idle/walk/run/turn/stop/work/sit/attack with physical movement, real capsule support and cloth/limb clearance. Use actual authored clip phase/contact data if available; the road-hold burst cannot set a new speed.
6. **Resolve camera and distance presentation.** Match readable scene relationships with the complete intended desktop viewport, safe collision behavior and distance layers. Test draw-distance transitions in motion from both approach directions. Add distant silhouette geometry that remains stable, then tune fog; do not infer Gothic's exact FOV or LOD pipeline from cropped video.
7. **Add restrained atmosphere after the base is correct.** Quiet wildlife, a few justified fires, gentle limited cloth motion and a restrained audio/visual life rhythm. Dramatic portal/pre-rendered intro lighting is not the default town lighting target.
8. **Prove the result with a consistent acceptance set.** Same route, time-of-day, camera, quality and installed build; native game frames and a traversal video; local type/tests/build and asset/pose budgets; actual shader errors/contact diagnostics; representative desktop frame-time/memory measurements. No numeric engine-FPS assertion should use the source recording's 60fps container rate as evidence.

## Where the video itself falls short

The visual hierarchy and inhabited composition are useful, but the recorded example is not perfect. At very close range, roof/wood surfaces show coarse stretched-looking detail; silhouette edges remain visibly polygonal; some held-tool and conversation angles obscure the face; battle clutter overlaps bodies and props; extreme camera movement at the tower produces awkward inside-body/under-roof views. Tervain should retain the exaggerated large forms while improving those weaknesses. “More Gothic-like” is an art-direction target, not permission to keep these bugs or copy protected game assets.
