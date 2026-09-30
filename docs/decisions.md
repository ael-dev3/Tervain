# Decisions, assumptions, and open questions

Foundation date: 29 September 2026.

**Accepted** means explicitly established by the owner in the project conversation. **Proposed** means a concrete recommendation to test or refine. **Open** means no choice has been made. **Deferred** means deliberately outside the first implementation scope. No entry in the decision tables claims an implemented capability; the change log at the end links to the prototype notes, which say what is implemented.

## Accepted direction

| ID | Decision | Source / implication |
| --- | --- | --- |
| A01 | The game is named **Tervain**. | Owner selected the name and the repository. |
| A02 | Aim for a serious, polished single-player Steam game. | Parallel project brief; fuller lore and consistent presentation. |
| A03 | High fantasy, with Gothic 3 as a strong experiential reference. | Explore regional cultures, factions, dangerous travel, and character growth. |
| A04 | Hyperion is a principal narrative-structure inspiration; the created work is original. | Adapt broad complexity and relationships, not the novels' canon or expression. |
| A05 | An original Templar-inspired order anchors this game's world. | “Templars” remains a working label; detailed faith and history are proposed. |
| A06 | The order and local story sit away from Warpkeep's future main conflict. | The owner describes that future conflict as Hegemony, Core, and Ousters. These are broader project working identities, not imported book history. |
| A07 | Local faction interactions should be diverse. | Independent regional interests and internal disagreements are central. |
| A08 | No keep-management focus; little warping initially. | Travel and personal participation carry the early experience. |
| A09 | Minimize science-fiction presentation here. | The local world should sustain a high-fantasy reading. |
| A10 | Share suitable assets and technology with Warpkeep. | Deliberate reuse and separate product/runtime responsibilities. Shared **technology** (Three.js, the rooted wind model, a generated image-based sky light, streamed grass tiles) is used, with attribution. Warpkeep's runtime **models** are imported and archived under `assets/warpkeep/` but are not used or published in 0.0.x: their chunky, bright look conflicts with A12. See [shared assets](engineering/shared-assets.md). |
| A11 | Seed the Tervain repository with a detailed outline. | This foundation is authorized documentation work, not authorization to release a game or alter Warpkeep production. |
| A12 | The game must look like old-school Gothic 3: not cartoonish; rugged, rough around the edges, not perfect, not smooth, human. | Owner direction of 29 Sep 2026. Supersedes P11's lush stylized low-poly and bright lighting. See [Gothic 3 look reference](art/gothic3-reference.md) and the [art direction](art/art-audio-ui.md). |
| A13 | The initial area is modelled as closely as possible on Ardea from Gothic 3: a coast with a lighthouse, a beach, a great deal of empty terrain, some trees, and forests in the distance. | Owner direction of 29 Sep 2026. Implemented as the Grey Strand and Lantern Point, with the player arriving by wagon on the beach and walking inland over the heath to the overlook and Rillford. The Bellwether Vale slice (P09) follows it. |
| A14 | Local Gothic 3 files are for inspiration and measurement only. | Nothing from Gothic 3 is extracted into the repository, shipped, or used as an asset; the reference note records observations. |
| A15 | The version stays 0.0.x until the owner approves a move to 0.1. | Owner direction. The current build is 0.0.4. |
| A16 | Pause tree and leaf sway animation for the current patch. | Owner direction; ground-cover wind is a separate effect. Revisit tree motion after visual review. |
| A17 | Replace the cartoonish glass/card/pill UI with a material interface using paper and ink, timber and leather, restrained stone and iron, and soot-dark readable overlays. | Owner direction of 30 Sep 2026, recorded in the rugged implementation brief. Keep the calm camera, text scaling, remapping, high contrast, reduced effects, and all existing screen/input semantics. |
| A18 | Keep the Grey Strand horizon open; remove the distant alpine wall from the beach start. | Owner direction to remove mountains from the beach map. Local hills and the lighthouse headland remain part of the playable coast. |

## Proposed development baseline

| ID | Proposal | Evaluate / revise when |
| --- | --- | --- |
| P01 | Third-person camera and action combat. | Movement and close-combat prototype; compare camera readability and animation cost. |
| P02 | Offline local play; optional Steam services. | Desktop bootstrap and save prototype. |
| P03 | Windows first; keyboard/mouse and controller from the slice. | Runtime/platform decision before implementation expands. Steam Deck/Linux support remains a separate measured target. |
| P04 | TypeScript + Three.js as the first runtime candidate; desktop shell evaluated early. | Packaged benchmark; no dependency/version lock is created by this seed. |
| P05 | An outsider protagonist who can earn trust across factions. | Narrative prototype; origin, customization, and voice remain open. |
| P06 | Tervain is also the name of the local setting. | Decide whether it denotes a region, island, continent, or country before final map production. |
| P07 | Accord of the Wells, Alder Basin, Rimeward Heights, and Saltward Expanse form a working original setting. | World/narrative review. All invented lore and dates remain proposals. |
| P08 | Six working powers: Templars, Hearth League, Marcher Houses, Rimeward Clans, Salt Concord, Ash Witnesses. | Test whether each has a distinct function and manageable content needs. |
| P09 | Bellwether Vale / Rillford / “The Dry Bell” is the first complete slice, entered from the Grey Strand (see A13). | Narrative and traversal prototype before polished environment production. |
| P10 | Slice target: 30–45 minute first pass; one main quest plus two supporting encounters; at most 12 named residents. | Playtest comprehension, pacing, performance, and authoring effort. |
| P11 | ~~Lush stylized low-poly 3D, practical materials, calm motion, and readable close-view details.~~ **Superseded by A12.** Calm motion, practical materials and readable close-view detail remain; lush, stylized, bright and low-poly do not. | Art benchmark using original or appropriately sourced assets. |
| P12 | Local witnessed reputation; consequences expressed in routines, routes, supplies, and dialogue. | Quest state and persistence proof. |
| P13 | Compact authored playable spaces with procedural tools for controlled dressing. | Traversal and encounter iteration. |
| P14 | One melee kit, one utility rite, one creature family, and one hostile humanoid archetype in the slice. | Combat feel and production effort evaluation. |
| P15 | A Marcher coalition's emergency rule versus League charter resistance supplies the central campaign conflict; Templars divide, while north and desert retain independent agendas. | Narrative review and slice playtesting; military escalation and later regions are not additional slice requirements. |

## Decisions required before major investment

| ID | Question | Recommendation / evidence needed |
| --- | --- | --- |
| O01 | Who is the protagonist, and how much can the player customize them? | Start with one readable proxy body; compare authored identity with limited customization before a full character pipeline. |
| O02 | What is the Templars' final formal name and doctrine? | Preserve their original three-sided duty to people, living places, and witnessed agreements; test whether the name sets the intended expectations. |
| O03 | How explicitly does the shared fictional universe appear? | Use optional history/trade references first; pin the timeline and cross-project canon responsibility before writing direct crossover events. |
| O04 | Which engine and desktop runtime should ship? | Evaluate actual movement, world authoring, NPC navigation, combat, saving, asset loading, and profiling cost. Use the engineering decision gate. |
| O05 | What team, budget, and development capacity exist? | No staffing, funding, release date, or full-game duration is assumed. Estimate from completed slice work. |
| O06 | What release platform set is sustainable? | Windows baseline proposal; decide Linux/macOS and Deck after package and input tests on actual hardware. |
| O07 | What age/content target and voice strategy apply? | Establish before expensive cinematics, recording, or marketing. Text-first dialogue is the slice proposal. |
| O08 | How large is the first commercial campaign? | Decide after the slice. Do not equate the three-region world concept with three funded production regions. |
| O09 | What is the business/release model? | Premium single-player purchase is a proposed fit; price, demo, Early Access, and release sequence are open. |
| O10 | Which shared assets are suitable and usable in Tervain? | Asset-by-asset source, terms, scale, rig, readability, and package verification; see shared-assets.md. |
| O11 | What project license and contributor terms should apply? | No license is selected in the initial seed. Separate source code, original art, external assets, and brand identity. |
| O12 | How much mortality and irreversible consequence should NPCs support? | Slice should handle relevant actors becoming unavailable; test impact on authoring load and player clarity before expanding. |

## Deferred scope

- Multiplayer/co-op, PvP, shared economy, accounts/FIDs, social authentication, or live MMO synchronization.
- Keep construction, passive real-time production, territory-management dashboards, and a broad teleport network.
- A full reproduction of Warpkeep's Greater Realm atlas or deployment architecture.
- An infinite procedural world, a complete ecosystem simulation, mounts, companions, unrestricted climbing, and unrestricted world destruction.
- Extensive voice acting, cinematic branching, public mod tools, and a continent's worth of content before the slice is accepted as a viable direction.

These are scope boundaries for the foundation, not permanent bans. A later owner request can change them.

## Change log

| Date | Change | Status |
| --- | --- | --- |
| 2026-09-29 | Selected Tervain; seeded original game outline and a proposed first playable. | A01–A11 recorded; P01–P15 proposed; O01–O12 unresolved. |
| 2026-09-29 | Built a browser prototype of the first slice in TypeScript 7 with Three.js and Vite; documented in [prototype notes](engineering/prototype.md). | Evidence for P04, P09, P10 and P12 only. No decision changed: no engine or desktop runtime is selected, nothing is measured on a reference device, and the prototype uses no shared asset (O10). O12 is unchanged: residents cannot be killed in play, only made absent through a debug or harness state. |
| 2026-09-29 | Owner direction: Gothic 3 look, an Ardea-like coastal start, local files for inspiration only, version stays 0.0.x. Rebuilt the presentation: new coast and headland, textured terrain, sea, trees with leaf cards, weathered buildings, worn people, a grade pass. | A12–A15 recorded; P11 superseded; A10 clarified. See [prototype notes](engineering/prototype.md). Version 0.0.2. No gameplay decision changed; O10 is unchanged (no shared model is used). |
| 2026-09-30 | Enforced the `0.0.x` version hold in Vite and paused procedural tree/leaf sway for the current patch. | A15–A16; runtime title, debug panel and save build stamp share `package.json` version. Ground-cover wind and other scene animations remain separate. |
| 2026-09-30 | Advanced the rugged brief into 0.0.4: opened the beach horizon by removing distant mountain geometry and lowering the playable boundary to a wooded heath rise; lifted shadow detail and softened the post grade; authored face identities and task-specific NPC motion; fixed sleeping ambient people blocking movement; made map guidance static; refined settings alignment and replaced development copy on the title screen. Kept all tree sway paused and removed the synthesized story bell and other synthetic event tones. | A17–A18 and rugged brief WP01/WP03/WP04/WP06/WP09. Event captions remain; filtered procedural wind/water ambience is still a placeholder. The full acceptance matrix and reference-device performance run are outstanding. |
