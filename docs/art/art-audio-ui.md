# Art, animation, audio, and interface direction

**Status:** the visual direction below is **superseded in part by the owner's directions of 29–30 September 2026** (decisions A12–A14, A17, A19): the game looks like old-school Gothic 3, not like a bright stylized low-poly world, and the first area is modelled on Ardea. Read the [Direction updates](#direction-update-29-september-2026) first; where they conflict with later paragraphs, they win. The owner has established a serious, polished, original high-fantasy Steam game with a Templar-inspired order and useful sharing with Warpkeep. Keep calm camera motion and accessibility; use the material UI direction below instead of the superseded glass proposal. See [vision](../vision.md), [decisions](../decisions.md), and [shared asset requirements](../engineering/shared-assets.md).

## Direction update, 29 September 2026

The owner asked for old-school Gothic 3: **not cartoonish, rugged, rough around the edges, not perfect, not smooth, human**, with the first area as close to Ardea as possible (a lighthouse, a beach, a great deal of empty terrain, some trees, forests in the distance). Measurements and the design rules taken from the local game are in the [Gothic 3 look reference](gothic3-reference.md); nothing is copied from it.

What this changes in practice:

- **Palette and light.** Dark, dirty, desaturated albedo; low warm sun, cool shade, heavy haze (exponential fog), filmic tone mapping and one grade pass (split toning, S-curve, vignette, grain). Grass is dry olive, timber is grey-black, plaster is stained lime. The bright limestone, lime plaster and green grass of the earlier palette are retired.
- **Composition.** Wide, empty ground with sparse features. Forests stand on the higher ground and in the distance; the heath carries a few lone wind-bent pines, dead trees and scrub. Landmarks are large and low or tall and thin: the lighthouse shaft is 17 m.
- **Shapes.** Nothing is square. Posts lean, boards sit at different depths, roofs are built course by course and sag, stones are uneven, doors and shutters hang wrong.
- **Vegetation.** Trees are skeletons of curved tapering tubes with leaf or needle cards hung on them (each card is a twig of individual leaves), at three levels of detail. Foliage is olive and dusty, not green; some leaves are dying.
- **People.** Worn and human: sculpted faces with brow, nose and jaw, tapered limbs with bending knees and elbows, layered wool and leather in earth colours with dirty hems.
- **The player's first minute.** The wagon has stopped on a grey beach; the sea is on one side, the jetty and lighthouse are ahead, and the road to Rillford leaves inland over open heath.

The "three regional identities" table and the paragraphs that follow are otherwise still the plan for Alder Basin, Rimeward Heights and Saltward Expanse, but their colours are now read as *materials seen in Gothic 3 light*: dark, worn and muted.

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

Faction identity crosses geography through restrained common signs. Templars might share a fastening method, waterkeeping tool, and small woven mark; local stone and climate still change their buildings. Hearth League shops differ from Marcher estates through scale, maintenance, and public access. The Hegemony emblem and rooftop Warplet castle are not assumed to be the correct Tervain visual identity. Any reuse must support this game's story and pass the asset review.

## Connected vegetation and terrain

A lush tree begins with a plausible trunk, branch hierarchy, and crown volume. Trunk taper, branch junctions, secondary supports, and leaf clusters must work from the side and below, not only from one presentation angle. Concealed attachment geometry may be economical, but leaves cannot visibly float away from the structure. Curved boughs must meet the trunk without implausible gaps or thin intersecting spikes.

Build several canopy masses with controlled empty spaces, then add the leaf treatment. Use closed clustered meshes and economical cutout surfaces where appropriate, comparing overdraw and shading in the benchmark. Leaf density should come from arrangement and coverage, not endlessly stacking transparent cards. Match branch motion and cluster motion at their attachment points. A breeze flexes tips more than the trunk; separate disconnected pieces must not swing through one another.

Each biome study needs at least three recognizable forms before color variants: a dominant mature tree, a smaller or younger form, and an environmental response such as a wind-bent, water-edge, or damaged specimen. In the slice, prioritize two Alder canopy families plus a clearly different orchard tree. Age changes taper, crown balance, exposed roots, and bark scale. It is not only a random size multiplier.

Terrain should establish catchments, drainage, erosion, and routes. Bellwether's late-thaw damage leaves sediment, displaced debris, cracked supports, and water marks. The spring, quarry seep, sluice, mill channel, and ford must visually agree with [The Dry Bell](../design/quests-and-consequences.md). Scatter vegetation according to moisture, slope, shade, and disturbance. Keep roads, interaction points, and combat space legible. Reeds and grass should frame useful evidence rather than hide every clue.

## Materials, light, and people

Use broad readable material values with selective close-view detail. Stone, cloth, wood, leather, metal, and foliage should respond differently to light. Authored color variation and restrained roughness detail support stylization; busy photographic noise does not automatically create quality. Share atlases where it reduces material switches without making every building look identical. Validate texture seams, texel density, edge padding, and normal orientation under moving daylight.

Default daytime lighting should reveal faces, paths, and material forms. Use a clear directional sun, gentle sky fill, restrained atmospheric haze, and deliberate contact shadows. Forest shade may be cool but should not turn every conversation into a silhouette. Night lighting must preserve navigation and enemy anticipation; expose adjustment in the player settings. Bright fire is localized, with bounded flicker and no rapid full-screen exposure pumping.

Characters need believable proportions, readable expressions, practical costume layers, and distinct posture. Age, body build, hair, complexion, mending, tools, and regional clothing provide variety without replacing every person's identity with a faction uniform. The slice's 12 named residents share a practical rig and modular base where suitable; the four quest principals need recognizable silhouettes and faces. A single creature family receives complete movement and idle treatment before the bestiary expands.

## Animation and camera

Movement must agree with intention and ground contact. Walk direction matches facing except during an explicitly authored strafe or retreat. Turn anticipation, deceleration, foot placement, slope transitions, and door approaches deserve review at ordinary gameplay speed. Choose in-place or root-motion ownership explicitly and test it against collision; combining competing motion sources creates sliding and shaking.

Work loops have contact and purpose: a hammer reaches a surface, a bucket reaches water, and a worker carries an object to a destination. Idle variety includes breathing, weight shifts, observation, rest, and small social gestures with asynchronous timing. Do not make everyone rock continuously. Animals pause, look, and resume; birds need believable launch and landing transitions if they occupy reachable perches.

Combat animations clearly expose preparation, impact, recovery, and interruption. Weapons, hands, shields, and bodies remain connected through the full motion. Verify hit timing against the visible weapon path. The spring rite is restrained and physical: practiced hand movement, water response, and a readable completion cue, rather than a large unexplained explosion of light.

Use a stable third-person camera as the proposed baseline. Collision resolution should ease around obstacles without rapid zoom oscillation. Manual control takes priority over idle presentation. Screen shake, motion blur, head bob, and flashes need independent controls or minimal defaults. Menu cameras may make a very slow authored move, but must settle for reading and respect reduced-motion preferences.

## Menu and interface

The proposed title menu looks into a small real 3D place associated with Tervain: a sanctuary approach, quiet courtyard, or spring overlook. Gentle water, moving leaves, a working resident, and distant birds establish life. It should use ordinary game assets and a bounded population. Audio and camera motion must not delay reaching Continue, New Game, Load, Settings, or Exit.

**Owner direction, 30 September 2026:** remove the cartoonish glass/card/pill interface. Use a coherent family of paper and ink for records and maps; dark timber and leather for inventory and restrained menu framing; stone and iron for structural accents; and soot-dark, quiet backing only where over-world text needs contrast. Do not use default blur, frosted glass, broad rounded cards, or enchanted-looking selection glow. Keep the live world visible around the title menu, preserve the calm camera and access settings, and make the high-contrast option fully opaque with strong outlines. Small text must remain readable over the actual scene.

**Title and pause reference, 30 September 2026 (A19):** the owner selected hanging weathered red cloth with simple centered menu text, a large carved wordmark, and an ornamented weathered frame. Author Tervain's own textile, frame, and lettering; no reference-game asset is copied. Keep the real world visible around the cloth and preserve native text/button interaction, clear focus, text scaling, and calm motion. Settings, controls, confirmations, and record panels keep paper and ink rather than inheriting the decorative cloth treatment. This is a presentation follow-up within `0.0.4`, not a version promotion.

Typography, iconography, and a future Tervain emblem need an original coherent family. Fantasy character can live in headings and framing; body text must remain easy to read. Avoid imitation of a reference game's exact lettering. A journal distinguishes observations, testimony, and conclusions without requiring color recognition. Interaction prompts show the current input device and use consistent verbs.

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
