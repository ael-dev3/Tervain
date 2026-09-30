# Art, animation, audio, and interface direction

**Status:** the visual direction below is **superseded in part by the owner's directions of 29–30 September 2026** (decisions A12–A14, A17, A19–A23): the game takes Gothic 3's rugged fantasy exaggeration as its reference, and the playable first area is modelled on Ardea. Read the [Direction updates](#direction-update-29-september-2026), [exaggeration clarification](#fantasy-exaggeration-clarification-30-september-2026), [water update](#water-presentation-update-30-september-2026), and [menu direction](#menu-and-interface) first; where they conflict with later paragraphs, they win. The owner has established a serious, polished, original high-fantasy Steam game with Hegemony-affiliated Templars and useful sharing with Warpkeep. Keep calm camera motion and accessible controls. See [vision](../vision.md), [decisions](../decisions.md), and [shared asset requirements](../engineering/shared-assets.md).

## Direction update, 29 September 2026

The owner asked for old-school Gothic 3: **not cartoonish, rugged, rough around the edges, not perfect, not smooth, human**, with the first area as close to Ardea as possible (a lighthouse, a beach, a great deal of empty terrain, some trees, forests in the distance). Measurements and the design rules taken from the local game are in the [Gothic 3 look reference](gothic3-reference.md); nothing is copied from it.

What this changes in practice:

- **Palette and light.** Weathered earthy bases, low warm sun, cool shade, haze, and deliberate painted color/value groups. Rich reds, ochres, golds, and warm/cool accents support the fantasy expression established in A20. The reference's low mean albedo values inform surface weathering; they do not require a uniformly desaturated or plain finished image.
- **Composition.** Wide, empty ground with sparse features. Forests stand on the higher ground and in the distance; the heath carries a few lone wind-bent pines, dead trees and scrub. Landmarks are large and low or tall and thin: the lighthouse shaft is 17 m.
- **Shapes.** Nothing is square. Posts lean, boards sit at different depths, roofs are built course by course and sag, stones are uneven, doors and shutters hang wrong.
- **Vegetation.** Trees are skeletons of curved tapering tubes with leaf or needle cards hung on them (each card is a twig of individual leaves), at three levels of detail. Foliage is olive and dusty, not green; some leaves are dying.
- **People.** Worn and human: sculpted faces with brow, nose and jaw, tapered limbs with bending knees and elbows, layered wool and leather in earth colours with dirty hems.
- **The player's first minute.** The wagon has stopped on a grey beach; the sea is on one side, the jetty and lighthouse are ahead, and the road to Rillford leaves inland over open heath.

The "three regional identities" table and the paragraphs that follow are otherwise still the plan for Alder Basin, Rimeward Heights and Saltward Expanse. Their colors should read as weathered materials grouped through deliberate fantasy painting and lighting, with expressive warm/cool relationships.

## Fantasy exaggeration clarification, 30 September 2026

The owner clarified that Gothic 3 does not pursue clinical realism and asked for a similarly **exaggerated** style (A20). A12's “not cartoonish” establishes a serious rugged fantasy tone; it does not prescribe photoreal proportions, constant desaturation, small restrained ornament, or a plain interface.

Use heavy expressive silhouettes, oversized carved and forged ornament, broad painted planes of light and shade, earthy reds and golds, and strong warm/cool relationships. Weathering should be selective and substantial: larger chips, worn raised edges, deep folds, and irregular joins that support the dominant shape. Preserve connected geometry and purposeful materials. The title and pause menu are the immediate revision scope; this direction does not claim that every world asset has already been reworked.

Control labels, settings, records, and other core body text retain scalable, accessible lettering and clear focus. Artwork can be theatrical while the player can still read and operate the interface. Keep calm motion, original assets, and the `0.0.4` hold. This visual clarification adds no faction lore, ritual meaning, or game systems.

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

Faction identity crosses geography through purposeful common signs. The Templars are part of the Hegemony (A21), and the owner selected its exact September 27 emblem for the menu (A22). Use that approved emblem integrated into fabric rather than inventing a new seal. Local stone, climate, tools, and clothing still distinguish places. Hearth League shops differ from Marcher estates through scale, maintenance, and public access. The rooftop Warplet castle is not selected for this menu; other shared assets still need their own suitability and rights review.

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

Combat animations clearly expose preparation, impact, recovery, and interruption. Weapons, hands, shields, and bodies remain connected through the full motion. Verify hit timing against the visible weapon path. The spring rite is restrained and physical: practiced hand movement, water response, and a readable completion cue, rather than a large unexplained explosion of light.

Use a stable third-person camera as the proposed baseline. Collision resolution should ease around obstacles without rapid zoom oscillation. Manual control takes priority over idle presentation. Screen shake, motion blur, head bob, and flashes need independent controls or minimal defaults. Menu cameras may make a very slow authored move, but must settle for reading and respect reduced-motion preferences.

## Menu and interface

**Current owner direction, 30 September 2026 (A21–A22):** build a complete original native 3D desert-market menu: sand and layered earthen/sandstone forms, palms, market stalls, spice goods, silk and shade fabric, and gentle cloth wind. Compose an inhabited place with depth and connected geometry rather than a static lone banner over the beach. Gothic 3 supplies the rugged, exaggerated fantasy reference; its assets are not copied. Use the exact approved gold-and-violet Hegemony emblem as part of a cloth surface, never a random substitute seal, floating plaque, or unrelated symbol.

The title, pause, and nested pause forms use a separate menu courtyard scene. Opening that scene stops gameplay-world updates; reading settings must not advance NPC patrols or the simulation. Menu ambience is separate from the beach's sea/water mix. This menu revision leaves the playable Grey Strand coast and the gameplay tree/leaf-animation pause unchanged. Gentle menu-specific wind is authorized, must respect reduced motion, and must avoid shaking trunks or the camera. Loading the emblem must honor the application's base URL and degrade without blocking native controls. Audio and camera motion must not delay reaching Continue, New Game, Load, Settings, or Exit.

The scene is implemented and locally reviewed in unmerged PR #2; publication remains pending. Its fixed camera, connected cloth/frond geometry, approved emblem printing, responsive native controls, and reduced-motion freeze are documented with the exact checks and limits in the [menu handoff](../production/releases/0.0.4.md#native-3d-desert-market-menu-follow-up). This is not a physical-controller or target-hardware performance claim.

**Owner direction, 30 September 2026:** remove the cartoonish glass/card/pill interface. Use a coherent family of paper and ink for records and maps; dark timber and leather for inventory and restrained menu framing; stone and iron for structural accents; and soot-dark, quiet backing only where over-world text needs contrast. Do not use default blur, frosted glass, broad rounded cards, or enchanted-looking selection glow. Keep the live world visible around the title menu, preserve the calm camera and access settings, and make the high-contrast option fully opaque with strong outlines. Small text must remain readable over the actual scene.

**Historical title and pause reference (A19):** weathered red cloth, centered choices, carved Tervain lettering, and an ornamental frame informed the first pass. A22 supersedes its static lone-banner composition. Original carved typography and frame work may remain where they support the native 3D market, while settings, controls, confirmations, and record panels retain legible paper and ink. This remains a presentation follow-up within `0.0.4`, not a version promotion.

**Exaggerated treatment (A20, retained under A22):** expressive carved lettering, substantial frame relief, large textile folds, earthy crimson, warm gold, and cool shade support the market's theatrical silhouette. Ornament belongs in the large forms; choice labels and body text keep hierarchy and focus. The prior invented decorative seal is superseded by the approved Hegemony identity. Earlier static-menu QA does not validate the new 3D scene; see the [current menu handoff](../production/releases/0.0.4.md#native-3d-desert-market-menu-follow-up) for its status.

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
