# Art, animation, audio, and interface direction

**Status:** the visual direction below is **superseded in part by the owner's directions of 29–30 September 2026** (decisions A12–A14, A17, A19–A27): the game takes Gothic 3's rugged fantasy exaggeration as its reference, and the playable first area is modelled on Ardea. Read the [Direction updates](#direction-update-29-september-2026), [exaggeration clarification](#fantasy-exaggeration-clarification-30-september-2026), [people update](#people-update-30-september-2026), [water update](#water-presentation-update-30-september-2026), and [menu direction](#menu-and-interface) first; where they conflict with later paragraphs, they win. The owner has established a serious, polished, original high-fantasy Steam game with Hegemony-affiliated Templars and useful sharing with Warpkeep. Keep calm camera motion and accessible controls. See [vision](../vision.md), [decisions](../decisions.md), and [shared asset requirements](../engineering/shared-assets.md).

## Direction update, 29 September 2026

The owner asked for old-school Gothic 3: **not cartoonish, rugged, rough around the edges, not perfect, not smooth, human**, with the first area as close to Ardea as possible (a lighthouse, a beach, a great deal of empty terrain, some trees, forests in the distance). Measurements and the design rules taken from the local game are in the [Gothic 3 look reference](gothic3-reference.md); nothing is copied from it.

What this changes in practice:

- **Palette and light.** Weathered earthy bases, low warm sun, cool shade, haze, and deliberate painted color/value groups. Rich reds, ochres, golds, and warm/cool accents support the fantasy expression established in A20. The reference's low mean albedo values inform surface weathering; they do not require a uniformly desaturated or plain finished image.
- **Composition.** Wide, empty ground with sparse features. Forests stand on the higher ground and in the distance; the heath carries a few lone wind-bent pines, dead trees and scrub. Landmarks are large and low or tall and thin: the lighthouse shaft is 17 m.
- **Shapes.** Nothing is square. Posts lean, boards sit at different depths, roofs are built course by course and sag, stones are uneven, doors and shutters hang wrong.
- **Vegetation.** Trees are skeletons of curved tapering tubes with leaf or needle cards hung on them (each card is a twig of individual leaves), at three levels of detail. Foliage is olive and dusty, not green; some leaves are dying.
- **People.** Worn and human, built the way Gothic 3 builds its people (A27; see the [people update](#people-update-30-september-2026)): skinned bodies, sculpted and painted faces, hair and beards, big working hands, and layered wool, linen and leather in earth colours with dirty hems.
- **The player's first minute.** The wagon has stopped on a grey beach; the sea is on one side, the jetty and lighthouse are ahead, and the road to Rillford leaves inland over open heath.

The "three regional identities" table and the paragraphs that follow are otherwise still the plan for Alder Basin, Rimeward Heights and Saltward Expanse. Their colors should read as weathered materials grouped through deliberate fantasy painting and lighting, with expressive warm/cool relationships.

## Fantasy exaggeration clarification, 30 September 2026

The owner clarified that Gothic 3 does not pursue clinical realism and asked for a similarly **exaggerated** style (A20). A12's “not cartoonish” establishes a serious rugged fantasy tone; it does not prescribe photoreal proportions, constant desaturation, small restrained ornament, or a plain interface.

Use heavy expressive silhouettes, oversized carved and forged ornament, broad painted planes of light and shade, earthy reds and golds, and strong warm/cool relationships. Weathering should be selective and substantial: larger chips, worn raised edges, deep folds, and irregular joins that support the dominant shape. Preserve connected geometry and purposeful materials. The title and pause menu are the immediate revision scope; this direction does not claim that every world asset has already been reworked.

Control labels, settings, records, and other core body text retain scalable, accessible lettering and clear focus. Artwork can be theatrical while the player can still read and operate the interface. Keep calm motion, original assets, and the `0.0.4` hold. This visual clarification adds no faction lore, ritual meaning, or game systems.

## People update, 30 September 2026

The owner asked for the player and the NPCs to be a lot more like Gothic 3, from a study of its local NPC files, and for the main character to start without weapons or shields (A27). The [look reference](gothic3-reference.md#people) records what the actor files showed.

People are modular and skinned, as Gothic 3's are: one skeleton each, with the body and every garment weighted to it so joints and skirts bend without gaps, a separate denser head, and hair and beards as shells. Proportions follow the measured bodies (crotch at half height, shoulders at 0.83, a head of about an eighth), heads sit low on thick necks, and hands are large with separate fingers. Faces are sculpted (brow ridge, sockets, nose, lips, cheekbones, jaw) and painted in their own texture: brows, shadowed sockets, stubble and painted short beards, hair on the scalp for a soft hairline, age lines. Eyes sit behind heavy lids. Clothes are layers with turned edges, and the silhouette says who someone is: a trader's long coat and felt hat, a reeve's dress and shawl, a Templar sister's robe and scapular, a warden's quilted gambeson over mail, a quarryman's jerkin, a hood with a soft point. Wear, weave, leather grain, quilting and mail are tiling detail maps over vertex colour. Everything is generated in code; the costumes and the builds of residents whose pronouns are not documented are proposals (P17).

The wanderer arrives in a plain tunic with nothing in hand or at the hip (P16 proposes the first blade in the beach wreck). See the [people notes](../production/releases/0.0.5-people.md).

## Visual promise

Tervain should look inhabited, fertile, weathered, and worth exploring. Large forms establish the landscape before small decoration fills it. A player should read a sheltered village, a dangerous ridge, a cared-for shrine, and a working quarry from their shapes and surroundings. Human-scale detail explains those forms: repaired roof edges, stacked firewood, muddy approaches, worn steps, and drainage channels.

Use native 3D geometry for the world, characters, animals, architecture, and menu setting. Texture work supports those surfaces. Distant mountains should preserve parallax from a controlled camera; a painted landscape behind an empty foreground is not the proposed environment solution. Use atmospheric depth to simplify distant geometry while retaining a convincing horizon.

The Gothic reference informs attention to geography, everyday work, danger, and regional identity. Prior observations of WoW foliage inform canopy construction, economical silhouettes, and readable materials. Neither reference authorizes importing its models, textures, characters, animation, or distinctive architecture. Tervain's order needs its own clothing, symbols, spaces, and ritual implements.

## Three regional identities

The regions below are world-building targets. Only Bellwether Vale in Alder Basin belongs to the initial playable slice; the other two receive reference sheets and small reusable asset studies until production is approved.

| Region | Silhouette and composition | Palette and materials | Characteristic life |
| --- | --- | --- | --- |
| **Alder Basin** | Broad deciduous crowns, irregular woodland edges, low farm roofs, stout stone bridges, stepped river terraces; occasional tall sanctuary roofs as landmarks | Warm limestone, weathered oak, pale lime plaster, muted clay tile, moss, reed green, soft gold grass, blue-green water | Wetland reeds, riparian alder-like trees, orchard fruit trees, grazing animals, small river birds |
| **Rimeward Heights** | Narrow conifers, wind-bent ridge trees, sharp rock shelves, steep roofs, thick walls and sheltered courtyards; long valley views between compact settlements | Cool granite, iron staining, dark timber, slate, wool, tarnished copper, lichen gold; warmth concentrated around doors and hearths | Tough ground shrubs, alpine pasture, hardy livestock, cliff birds, sparse exposed ridge vegetation |
| **Saltward Expanse** | Wide canopies near wells, branching thorn trees, cliff-cut stairs, deep shade courts, cistern towers, low wind-resistant walls; vegetation follows water | Sandstone, earth render, woven shade cloth, glazed ceramic, pale mineral crust, restrained blue and rust accents; strong warm/cool light separation | Oasis groves, date-bearing palms as a candidate, salt-tolerant shrubs, caravan animals, water-seeking birds |

Regional distinction must survive a grayscale silhouette test. Recoloring one tree, house, or outfit three times is insufficient. Architecture responds to rain, heat, wind, materials, and labor. A northern roof sheds snow; a Saltward courtyard stores cool shade; an Alder mill needs an actual intake, wheel clearance, and discharge route. Avoid assembling unrelated fantasy ornaments without a structural or cultural purpose.

Faction identity crosses geography through purposeful common signs. The Templars are part of the Hegemony (A21), and the owner selected its exact September 27 emblem for the menu (A22). A24 limits that composition to one banner attached to a building or grounded post; surrounding merchant silk carries no faction mark. Use the approved emblem integrated into fabric rather than inventing a new seal. Local stone, climate, tools, and clothing still distinguish places. Hearth League shops differ from Marcher estates through scale, maintenance, and public access. The rooftop Warplet castle is not selected for this menu; other shared assets still need their own suitability and rights review.

## Connected vegetation and terrain

A lush tree begins with a plausible trunk, branch hierarchy, and crown volume. Trunk taper, branch junctions, secondary supports, and leaf clusters must work from the side and below, not only from one presentation angle. Concealed attachment geometry may be economical, but leaves cannot visibly float away from the structure. Curved boughs must meet the trunk without implausible gaps or thin intersecting spikes.

Build several canopy masses with controlled empty spaces, then add the leaf treatment. Use closed clustered meshes and economical cutout surfaces where appropriate, comparing overdraw and shading in the benchmark. Leaf density should come from arrangement and coverage, not endlessly stacking transparent cards. Match branch motion and cluster motion at their attachment points. A breeze flexes tips more than the trunk; separate disconnected pieces must not swing through one another.

Each biome study needs at least three recognizable forms before color variants: a dominant mature tree, a smaller or younger form, and an environmental response such as a wind-bent, water-edge, or damaged specimen. In the slice, prioritize two Alder canopy families plus a clearly different orchard tree. Age changes taper, crown balance, exposed roots, and bark scale. It is not only a random size multiplier.

Terrain should establish catchments, drainage, erosion, and routes. Bellwether's late-thaw damage leaves sediment, displaced debris, cracked supports, and water marks. The spring, quarry seep, sluice, mill channel, and ford must visually agree with [The Dry Bell](../design/quests-and-consequences.md). Scatter vegetation according to moisture, slope, shade, and disturbance. Keep roads, interaction points, and combat space legible. Reeds and grass should frame useful evidence rather than hide every clue.

## Water presentation update, 30 September 2026

The owner selected [Three.js Water Pro](https://www.threejswaterpro.com/) as a strong visual reference (A23): substantial overlapping waves, clear depth transitions, angle-dependent reflections, and connected surf. Tervain implements these qualities with original WebGL geometry and shaders; no vendor code/assets, purchase, FFT renderer, or new dependency is involved. Keep the sea grounded in the rugged coastal palette rather than making every watercourse an identical glossy blue surface.

The current implementation has four coastal wave bands with matching surface normals, Fresnel shading, depth-aware refraction, shallow caustic detail, and laced shore wash on a welded sea/horizon mesh. Managed channels retain their quest-driven width and level response; their banks, the spring pool, and the shallow ford must stay connected and readable. Coastal planar reflections use Three's existing Reflector addon at 384/512 pixels with 10/15 Hz refresh caps for medium/high quality. Low quality or reduced effects disables scene capture and releases its private targets. Reduced motion freezes cosmetic water clocks exactly while flow and other durable quest state can still update.

The water revision is implemented and locally reviewed, prepared for review in unmerged PR #2; publication remains pending. The [prototype follow-up](../engineering/prototype.md#water-presentation-follow-up-30-september-2026) describes the implementation, and the [water handoff](../production/releases/0.0.4.md#water-presentation-follow-up) records the exact checks and limits. No hardware frame-rate result or equivalence to the reference product is claimed. This is a `0.0.4` presentation revision and leaves gameplay tree/leaf sway paused.

## Materials, light, and people

Use broad painted material values and color groups with selective close-view detail. Stone, cloth, wood, leather, metal, and foliage should respond differently to light. Exaggerated relief, warm/cool color variation, and larger selective wear support the rugged fantasy style. Share atlases where it reduces material switches without making every building look identical. Validate texture seams, texel density, edge padding, and normal orientation under moving daylight.

Default daytime lighting should reveal faces, paths, and material forms. Use a clear directional sun, gentle sky fill, restrained atmospheric haze, and deliberate contact shadows. Forest shade may be cool but should not turn every conversation into a silhouette. Night lighting must preserve navigation and enemy anticipation; expose adjustment in the player settings. Bright fire is localized, with bounded flicker and no rapid full-screen exposure pumping.

Characters need expressive grounded proportions, readable expressions, practical costume layers, and distinct posture. Age, body build, hair, complexion, mending, tools, and regional clothing provide variety without replacing every person's identity with a faction uniform. The slice's 12 named residents share a practical rig and modular base where suitable; the four quest principals need recognizable silhouettes and faces. A single creature family receives complete movement and idle treatment before the bestiary expands.

## Animation and camera

Movement must agree with intention and ground contact. Walk direction matches facing except during an explicitly authored strafe or retreat. Turn anticipation, deceleration, foot placement, slope transitions, and door approaches deserve review at ordinary gameplay speed. Choose in-place or root-motion ownership explicitly and test it against collision; combining competing motion sources creates sliding and shaking.

Work loops have contact and purpose: a hammer reaches a surface, a bucket reaches water, and a worker carries an object to a destination. Idle variety includes breathing, weight shifts, observation, rest, and small social gestures with asynchronous timing. Do not make everyone rock continuously. Animals pause, look, and resume; birds need believable launch and landing transitions if they occupy reachable perches.

Combat animations clearly expose preparation, impact, recovery, and interruption. Weapons, hands, any shields, and bodies remain connected through the full motion; fists and blades each have their own guard and strikes. Verify hit timing against the visible weapon path. The spring rite is restrained and physical: practiced hand movement, water response, and a readable completion cue, rather than a large unexplained explosion of light.

Use a stable third-person camera as the proposed baseline. Collision resolution should ease around obstacles without rapid zoom oscillation. Manual control takes priority over idle presentation. Screen shake, motion blur, head bob, and flashes need independent controls or minimal defaults. Menu cameras may make a very slow authored move, but must settle for reading and respect reduced-motion preferences.

## Menu and interface

**Current owner direction, 30 September 2026 (A26):** make the title and pause menus a lot closer to Gothic 3: less cartoonish, less polished, more human and rougher, with realistic imperfection (dust, dirt, mud). The menu should feel as if it belongs in Gothic 3, in the Hyperion-inspired shared world with heavy Templar influence. The owner authorized a full rework.

The 0.0.5 answer is a **Templar vigil at dusk**. A warden sits across a campfire from the viewer, hood up, sword driven into the mud beside him. Behind him an ancient tree holds a hermit's door and lantern in its roots; pilgrims' rags and a few iron lanterns hang from its bare low boughs, and one great limb is dead. Standing stones stand on the rise, the single Hegemony standard (A24) hangs faded, mud-splashed and torn from a guyed pole with the low sun shining through it, and Lantern Point's lighthouse stands far off against the sunset. The ground is trodden mud with rainwater in the ruts; crows turn over the dead limb; sparks and smoke rise; mist lies below the brow. The palette follows Gothic 3's measured title backdrop: near-black teal above one amber horizon band (see the [look reference](gothic3-reference.md#the-title-menu)).

The interface keeps the reference's order, and the way its pieces hold together, without its proportions: a small spaced line of text, then the cast name standing directly on the panel of choices, the two centred together as one piece, and the build in small print. The name is cast in pitted, tarnished bronze with polished bevels, verdigris in the hollows and a sword for the I (A25's traits, made rough). The panel is dark oiled leather held in a solid cast-bronze frame (a rail with stepped corners, a recessed face with a boss at each corner, an inner bead and a verdigris lip), filled from its edge to the leather so no scene shows between frame and panel; the choices are tooled into the leather as cells laid edge to edge. The selected choice is marked by rubbed leather, a thin brass line and two small iron marks, not a glow. Forms are torn, browned parchment; a confirmation is oxblood leather in the same frame and opens in the panel's place, and the choices never show beneath a form. A film of dust, lint and old scratches lies over the title screen. Surfaces and lettering are generated in code; the menu font is a common old-style serif (Palatino class) roughened by a small displacement filter, because no licensed display face is bundled. High contrast and reduced effects remove the overlay and the roughening.

**Superseded menu composition (A21–A22, clarified by A24):** build a complete original native 3D desert-market menu: sand and layered earthen/sandstone forms, palms, market stalls, spice goods, silk and shade fabric, and gentle cloth wind. Use exactly one purposeful Hegemony banner with the approved gold-and-violet emblem printed into cloth, attached to a building or visibly grounded post. Keep the remaining awnings, drapes, and merchandise unmarked. Supports, brackets, fabric edges, and goods must form a connected, coherent market scene. Gothic 3 supplies the rugged, exaggerated fantasy reference; its assets are not copied.

The implementation gives the banner a braced timber crossbar, tied loops, and a stone footing. The action backdrop is warm merchant silk with woven borders; the left stall has textile rolls, folded cloth, and gently moving samples, while the right stall has spices and pottery. Goods rest on their counters or on the rendered sand and paving; the market's colors distinguish merchandise from the single faction sign.

**Title correction (A25, retained under A26):** remove the entire outer menu border. Keep the name **Tervain**, with original monumental fantasy lettering connected to the shared Warpkeep/Hegemony/Templar identity: warm gold faces, ink-dark dimensional bevels, tapered serifs, and a blade-like I integrated into the word. The typography carries that identity without adding another crest or faction emblem. Hyperion supplies broad creative inspiration; no reference lettering, insignia, or canon is copied. The single printed banner, unmarked trade fabrics, and gentle wind remain. This treatment is implemented and locally reviewed in unmerged PR #2; publication remains pending. The [wordmark handoff](../production/releases/0.0.4.md#borderless-templar-wordmark) records its own build and browser coverage separately from earlier framed-menu checks.

The title, pause, and nested pause forms use a separate menu courtyard scene. Opening that scene stops gameplay-world updates; reading settings must not advance NPC patrols or the simulation. Menu ambience is separate from the beach's sea/water mix. This menu revision leaves the playable Grey Strand coast and the gameplay tree/leaf-animation pause unchanged. Gentle menu-specific wind is authorized, must respect reduced motion, and must avoid shaking trunks or the camera. Loading the emblem must honor the application's base URL and degrade without blocking native controls. Audio and camera motion must not delay reaching Continue, New Game, Load, Settings, or Exit.

The corrected scene is implemented and locally reviewed in unmerged PR #2; publication remains pending. Its new desktop title/pause, narrow title, Continue/Settings/Back/Quit-to-title, Reduced Motion, and geometry checks are recorded in the [composition handoff](../production/releases/0.0.4.md#market-composition-correction). The [earlier menu handoff](../production/releases/0.0.4.md#native-3d-desert-market-menu-follow-up) preserves the first scene's fixed-camera, connected cloth/frond, native-control, and reduced-motion evidence separately. This is not a physical-controller or target-hardware performance claim.

**Owner direction, 30 September 2026:** remove the cartoonish glass/card/pill interface. Use a coherent family of paper and ink for records and maps; dark timber and leather for inventory and restrained menu framing; stone and iron for structural accents; and soot-dark, quiet backing only where over-world text needs contrast. Do not use default blur, frosted glass, broad rounded cards, or enchanted-looking selection glow. Keep the live world visible around the title menu, preserve the calm camera and access settings, and make the high-contrast option fully opaque with strong outlines. Small text must remain readable over the actual scene.

**Historical title and pause reference (A19):** weathered red cloth, centered choices, carved Tervain lettering, and an ornamental frame informed the first pass. A22 supersedes its static lone-banner composition; A25 removes the outer frame and reworks the lettering. Settings, controls, confirmations, and record panels retain legible paper and ink. This remains a presentation follow-up within `0.0.4`, not a version promotion.

**Exaggerated treatment (A20, retained under A22–A25):** expressive fantasy lettering, large textile folds, earthy crimson, warm gold, and cool shade support the market's theatrical silhouette. Ornament belongs in the large forms; choice labels and body text keep hierarchy and focus. The earlier outer-frame relief and invented decorative seal are superseded. Historical static-menu QA does not validate the new 3D scene or its later title treatment; the corresponding handoffs record each revision separately.

Typography and iconography need a coherent original family around the approved Hegemony identity; do not invent a replacement faction emblem. Fantasy character can live in headings and framing; body text must remain easy to read. Avoid imitation of a reference game's exact lettering. A journal distinguishes observations, testimony, and conclusions without requiring color recognition. Interaction prompts show the current input device and use consistent verbs.

Keyboard and controller must cover every screen and interaction. Support remapping with conflict feedback, visible focus, predictable back/cancel behavior, adjustable text size, subtitle speaker labels, sensitivity controls, and hold/toggle choices. Large text cannot clip dialogue choices or hide confirmation buttons. Test controller disconnection and switching input while a menu is open. Exact interface dimensions remain responsive layout decisions, not fixed concept-art coordinates.

## Sound and music

The audio palette is serious and place-specific: wind in different crowns, water at different speeds, stone work, cloth, leather, distant labor, bells, insects, and restrained wildlife. A scene needs quiet intervals. Layer sources with distance and occlusion so a quarry behind a ridge does not sound like a tool beside the player. The drought bell is an authored story cue; its meaning should be learned through the town's response.

The proposed score combines intimate strings, breath-driven woodwinds, sparse low percussion, and occasional human voice without assuming a specific historical culture. Alder music can emphasize interweaving lines; northern music can leave more space and sustained weight; Saltward music can use dry attacks and careful rhythmic movement. These are compositional starting points, not a requirement to stereotype regional cultures. Reserve dense arrangements for earned narrative or combat moments.

Provide independent master, music, effects, ambience, and dialogue levels, with useful captions for essential nonverbal cues. Avoid making information depend exclusively on stereo direction or a subtle pitch difference. The previously supplied `Mesure Avancée.m4a` is a candidate reference or licensed-use candidate only; its availability in earlier Warpkeep work does not establish Tervain distribution rights. Track its actual author, source, and permitted uses before inclusion, as required for every shared asset.

## Provisional production budgets and acceptance

These are starting limits for experiments, not measured performance claims or promises of hardware support. Count final triangulated runtime geometry, material passes, visible instances, texture memory, and shadow cost; a Blender object count is not a useful substitute.

The near-tree range below is an allowance for close-view experiments, not a minimum or an instruction to inflate the shared v3 trees. Retain a much lighter existing model when its shape, attachment, and materials already hold up at the intended distance. Add geometry only to fix an observed silhouette, junction, or deformation problem.

| Asset class | Proposed starting budget | Required review |
| --- | --- | --- |
| Mature near tree | 3,000–7,000 triangles; 1–2 primary materials | Full rotation, underside, branch attachment, canopy coverage, wind, shadows |
| Tree mid/far forms | Roughly 40–60% then 10–20% of near geometry; tune by silhouette | Camera transition stability and retained regional identity |
| Principal character | 10,000–20,000 triangles; shared rig; bounded material count | Face readability, hand/tool contact, deformation, clothing intersections |
| Small prop | Usually 100–1,500 triangles; justify exceptions | Silhouette at use distance; shared materials; collision simplicity |
| Slice texture baseline | 1K shared sets; 2K only where close-view evidence supports it | Memory, repetition, mip behavior, alpha edges |

Measure foliage overdraw from ground level, especially when several crowns overlap. Compare alpha cutout, opacity, and shadow settings using the actual renderer. Limit shadow-casting distance and expensive animated foliage separately from visible foliage. LOD transitions must avoid conspicuous popping, floating leaf clusters, or disappearing cover; a fade is useful only if its transparency cost is acceptable.

Use simple collision forms appropriate to play. Trunks block movement; most leaves do not. Navigation must preserve clearance through doors, around roots, and across the ford. Test the sluice interaction, narrow path, combat space, and all principal NPC routes with final-sized assets. The [vertical slice](../production/vertical-slice.md) accepts art through gameplay, camera movement, save/load consistency, and measured frame pacing in a packaged build. A beautiful still image alone does not pass.
