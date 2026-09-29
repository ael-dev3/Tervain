# Decisions, assumptions, and open questions

Foundation date: 29 September 2026.

**Accepted** means explicitly established by the owner in the project conversation. **Proposed** means a concrete recommendation to test or refine. **Open** means no choice has been made. **Deferred** means deliberately outside the first implementation scope. No entry below claims an implemented capability.

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
| A10 | Share suitable assets and technology with Warpkeep. | Deliberate reuse and separate product/runtime responsibilities. |
| A11 | Seed the Tervain repository with a detailed outline. | This foundation is authorized documentation work, not authorization to release a game or alter Warpkeep production. |

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
| P09 | Bellwether Vale / Rillford / “The Dry Bell” is the first complete slice. | Narrative and traversal prototype before polished environment production. |
| P10 | Slice target: 30–45 minute first pass; one main quest plus two supporting encounters; at most 12 named residents. | Playtest comprehension, pacing, performance, and authoring effort. |
| P11 | Lush stylized low-poly 3D, practical materials, calm motion, and readable close-view details. | Art benchmark using original or appropriately sourced assets. Carries forward compatible Warpkeep art preferences. |
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
