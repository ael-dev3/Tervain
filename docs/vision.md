# Vision and product boundaries

Status: accepted owner direction plus clearly identified design proposals. Foundation dated 29 September 2026. See the [decision register](decisions.md).

## Player promise

Enter a beautiful, difficult land that already has people, work, beliefs, and disputes. Learn how to live there. Become capable enough that your decisions matter to its inhabitants. Earn trust through what you do, and watch that trust change the places you revisit.

Tervain should provide the pleasure of discovering a road around a dangerous ruin, finding a trainer who respects a completed task, entering a settlement after dark, and realizing that yesterday's decision changed someone's working day. Its scale should come from connected places and competing interests as much as from map area.

Proposed pitch: **A wanderer arrives in a region held together by an ancient agreement between settlements and an order devoted to living land. After disasters give powerful houses a reason to impose emergency rule, towns resist, the order divides, and the player must decide which duties remain worth keeping—and who can be trusted to enforce them.**

This pitch is a starting point. The title Tervain is selected; the protagonist, inciting incident, formal order name, and campaign ending are not yet fixed.

## What the owner has established

Tervain is a parallel development project sharing useful assets and technology with Warpkeep. It is intended for Steam, single-player, serious in tone, with deeper original lore and a high level of polish. The desired experiential reference is Gothic 3. Hyperion supplies inspiration for narrative structure and layered faction relationships.

The Templar-inspired order is the local center of gravity and **is part of the Hegemony** (owner clarification A21). Its local story remains away from Warpkeep's future main Hegemony–Core–Ousters conflict while participating in a diverse web of regional relationships. This distance from the war does not make the order separate from the Hegemony. The initial game has little warping and no keep-management focus. Science-fiction presentation should be minimal in this part of the shared setting. Detailed institutional hierarchy and doctrine remain proposals.

The owner's intention is original work. References inform the questions we ask and the experience we seek; they do not establish imported characters, doctrine, terminology bundles, histories, scenes, or quests.

For `0.0.5`, the owner selected a sparse amnesiac beach arrival followed by a dense woodland journey before the first inland settlement, with no dialogue windows ([A27](decisions.md)). Boring Forest supplies a visual and rendering reference for that journey. The Hegemony-affiliated Templars appear through original environmental traces; their detailed woodland history, the protagonist's past, and the cause of amnesia remain proposals. This is an exploration revision, not evidence that the complete Dry Bell negotiation interface or a Steam package exists. See the [current prototype scope](engineering/prototype.md#forest-arrival-pass-30-september-2026).

## Design pillars

### 1. A land worth learning

Terrain supports memory and judgment. A mountain silhouette helps orientation. A ruined aqueduct suggests a route. A village exists where water, food, and travel make it plausible. Forest paths have visible signs of use and dangers with understandable habitats.

The player gradually replaces uncertainty with competence. Maps and journals should support that learning without turning every discovery into a mandatory waypoint. Accessibility options can increase guidance without reducing the sophistication of the underlying places.

Evidence in the slice: an unfamiliar player can describe the village, spring, quarry, and ford in relation to one another after one visit; both the safe road and riskier shortcut are legible.

### 2. Factions with practical reasons to exist

A faction has a material base, a service, an obligation, and a blind spot. Templars maintain springs and sanctuaries but can become rigid. Town alliances defend local livelihoods but can export costs downstream. Landholders maintain infrastructure but seek hereditary control. Independent northern and southern cultures retain their own political priorities.

Characters can support one policy and reject another. Relationships are specific, historical, and regional. A distant war may shape rumor or trade without absorbing every local plot.

Evidence in the slice: the player can explain what each party needs, what it offers, and why a reasonable resident might disagree with it.

### 3. Capability earned in the world

The proposed progression model emphasizes training, equipment, observation, contacts, and increasingly confident combat. A teacher has a home and a reason to teach. A better route may matter as much as a larger damage number. The first hour should contain a visible change in what the player can do.

No faction membership or chosen-one identity is required merely to participate in the opening problem. The final protagonist design remains open.

### 4. Consequences people can recognize

Decisions affect concrete things: working hours, an accessible path, a price, a water channel, a guard's attitude, a household's move, a later request. Favor and resentment travel through witnesses and institutions rather than universal telepathy.

Choices are allowed to be difficult without concealing their basic stakes. A negotiated compromise can be satisfying while still imposing work, scarcity, or political debt. A failed negotiation should create another playable condition.

Evidence in the slice: the resolution changes at least three perceivable details and persists after quitting and loading.

### 5. Rugged, coherent, responsive 3D

**Direction of 29 September 2026:** the look is old-school Gothic 3 (rugged, rough, human, not cartoonish) and the first area is an Ardea-like coast; see [art direction](art/art-audio-ui.md#direction-update-29-september-2026) and decisions A12–A14. The paragraphs below were written earlier and are read with that change.

Use the existing vegetation and terrain work as a starting advantage. Build connected branches, convincing canopy masses, varied ground cover, working settlements, moving animals, and restrained ambient animation. Detail should reinforce habitat, composition, and interaction.

The approach is materially readable 3D with rugged, weathered surfaces and richer desktop composition and close-view treatment. A20 establishes theatrical fantasy exaggeration: expressive silhouettes, oversized ornament, broad painted value/color groups, and rich earthy contrast. Dense foliage is valuable only if camera movement, combat readability, and frame pacing remain comfortable. Lighting reveals forms; camera motion communicates control.

### 6. A complete single-player experience

The proposed runtime works from local installed content, with saves and a pause flow. Optional platform services enhance it. The player should be able to leave, return, and understand their situation. Controller support, readable text, reliable loading, and recovery from an interrupted save are part of polish.

This baseline is a proposal supporting the accepted single-player Steam goal, not a declaration that desktop packaging or Steam Deck compatibility already exists.

## Tone and world identity

Aim for sincerity, moral complexity, wonder, and grounded humor. People cook, boast, grieve, pray, cheat, keep promises, and misunderstand one another. Serious tone does not require relentless misery or identical solemn voices.

High fantasy appears in sacred landscapes, strange creatures, a believable relationship between ritual and place, and architecture shaped by culture. The supernatural should retain its emotional and practical meaning. The local campaign should resolve through its characters and conflicts rather than requiring a late explanation about distant machines.

The order's original faith must have ordinary adherents and worthwhile practices, as well as institutional failures. Nature can be dangerous; preservation can demand a human cost. Neither faith nor technological development should function as a universal moral label.

The menu is a native 3D scene that should feel as if it belongs in Gothic 3, in the Hyperion-inspired shared world with heavy Templar influence (A26): a Templar warden's dusk vigil on a headland, rough and human, with one weathered Hegemony standard bearing the approved emblem (A24). The earlier desert market (A22) is superseded for the menu; neither scene is authorization to build a new gameplay region. Typography and scene geometry remain original; score and protagonist presentation still need separate selection for this game's tone.

## Product relationship to Warpkeep

| Dimension | Warpkeep direction | Tervain direction |
| --- | --- | --- |
| Main experience | Persistent social strategy, personal keep, shared world. | Single-player exploration, encounters, character growth, and local choices. |
| Long-term conflict | Owner-envisioned Hegemony–Core–Ousters conflict. | Hegemony-affiliated Templars in a region of local faction disputes away from that main war. |
| Platform priority | Mobile-friendly online experience. | Steam desktop release; exact supported operating systems to decide. |
| State ownership | Live services and shared authoritative state. | Proposed local saves and a self-contained simulation. |
| Shared value | Original assets, terrain/rendering techniques, tooling. | Improvements returned as reusable art/tooling when genuinely common. |
| Distinct work | Online identity, keep economy, social systems. | Combat, traversal, quest states, dialogue, desktop packaging, and local NPC behavior. |

This table describes the intended relationship, not a report that the future war or all listed systems are already implemented in Warpkeep. The fictional time relationship and any eventual direct crossover remain open.

## Scope discipline

Build one place with a complete loop before promising a world. The proposed first slice has one village, one connected valley, one main quest, two supporting encounters, a compact set of residents, one melee kit, and one utility rite. The [slice brief](production/vertical-slice.md) controls those limits.

Later candidates include more faction membership depth, northern and desert regions, additional weapons, richer crafting, and regional narrative callbacks. None are necessary to evaluate the first slice. Multiplayer, settlement management, procedural endless campaigns, unrestricted destruction, and seamless continent-scale simulation are outside the initial plan.

The project's ambition is a coherent RPG people want to finish. Quality is assessed through play, consistency, and measurable performance. Document length, polygon count, procedural complexity, and resemblance to a reference are not substitutes.

## Current forest asset choice

A38 replaces the ordinary dark conifer families with the owner-supplied Solitary Pine: a lush textured needle-card model with matched distance representations and paused gameplay wind. Uniform scaling keeps the authored tree proportions; trunk collision footprints match the imported wood without squeezing or bending the geometry. A39 supplies larger coherent stands and broad natural clearings; the approximate 75/20/5 regional stem target remains distinct from rendered canopy coverage or a universal Gothic 3 measurement. A40 includes these changes in the owner-approved `0.0.9` release. This leaves the agreed serious single-player direction and quality/version gate intact. See the [asset contract](engineering/solitary-pine.md), [stand record](art/forest-stands-2026-10-03.md) and [release evidence](production/releases/0.0.9.md).
