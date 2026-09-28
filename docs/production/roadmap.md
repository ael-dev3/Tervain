# Roadmap, production gates, and risks

Status: proposed sequence. No calendar release date, staffing level, funding, or full-game duration has been agreed.

## Milestones

| Stage | Deliverable | Exit evidence | Scope guard |
| --- | --- | --- | --- |
| M0 — Foundation | Connected vision, lore proposals, design, architecture, asset plan, and slice brief. | Documents agree, links work, accepted/proposed choices are explicit. | Documentation readiness does not imply game readiness. |
| M1 — Feasibility | Small packaged movement/camera/terrain test plus combat, dialogue, state change, and save proof. | Engine comparison, reference-machine logs, input/window behavior, known authoring costs. | No second region, full combat catalog, or large framework. |
| M2 — Narrative graybox | Whole Dry Bell loop using simple geometry and provisional dialogue. | All outcomes and recovery paths playable; new players understand stakes. | Keep the 1 main + 2 support and resident caps. |
| M3 — Art and life pass | Consistent native 3D environment, characters, animation, audio and UI on the graybox. | Eye-level asset review, recognizable routines, navigation/visibility, measured density. | Upgrade a working quest; do not reset the world to chase unrelated art. |
| M4 — Complete slice | Coherent 30–45 minute experience with local consequences, save/reload, and desktop polish. | [Slice acceptance scenarios](vertical-slice.md) pass with recorded limitations; independent playtest notes. | Decide viability before scaling content. |
| M5 — Production plan | Selected engine, realistic campaign scope, asset inventory, staffing/cost plan, prioritized region and quest list. | Estimate based on actual slice throughput and rework; budgeted contingency. | Northern/desert concept art is not approval to build both regions. |
| M6 — Campaign production | Complete authored core campaign, local faction arcs, services and encounters. | Regular playable integrations, quest coverage, world continuity, content completeness. | Add systems only when their playable value exceeds production cost. |
| M7 — Release preparation | Performance, accessibility, compatibility, localization, save stability, store materials and supported platform packages. | Tested release candidate, accurate feature claims, rights/credit inventory, support/recovery plan. | Platform certification/verification and marketing dates require actual evidence. |

The sequence can overlap where useful: art prototypes can run during M1, and narrative can iterate during M3. Dependencies still matter. A visually finished character should not dictate an untested controller or scope the team cannot support.

## First implementation work packages

1. Record target test machine and selected candidate toolchain; produce a packaged blank scene with input and clean quit.
2. Build one character proxy, follow camera, terrain collision, slopes and step tests.
3. Assemble an eye-level forest/river benchmark from verified original assets or labeled proxies.
4. Prototype one readable melee exchange and one utility interaction.
5. Implement one conversation that applies a persistent fact; save, reload, and show its consequence.
6. Compare content-authoring and debugging cost with an alternative engine if the candidate exposes substantial gaps.
7. Select stack and create the playable Bellwether graybox.

Each work package should have a clear artifact and a small reviewable change. Do not turn this list into a promise that all seven can be completed in a particular week without capacity information.

## Expansion logic

The full world outline contains three broad regional identities. Build the Alder Basin core first if the slice supports that direction. Add a northern or southern visit only when it offers a new political perspective, traversal challenge, material culture, and quest structure that justify its asset cost.

Prefer a smaller region with several consequential relationships over a large region filled with repeated collection requests. Reuse architecture and creatures with cultural/ecological logic. Preserve moments of rest: travel, trade, ordinary conversation, and useful discovery need not all culminate in combat.

A modest complete campaign is a viable first release. Exact hours, counts of cities/factions, companion systems, and endgame activity remain open until throughput and player response are known.

## Risk register

| Risk | Early signal | Response |
| --- | --- | --- |
| Engine/tooling work consumes the game | Weeks of infrastructure without a better playable loop; simple content edits touch many modules. | Reassess stack, use existing engine facilities, reduce framework ambition. |
| Scope follows the reference game's size | New regions/classes arrive before one complete quest. | Return to slice cap and cost each content family. |
| Close-view assets expose mobile compromises | Flat crowns, visible leaf cards, tiny doors, slipping feet, unreadable faces. | Rework selected focal assets and conventions; retain low-cost distant variants. |
| Foliage looks lush but performs poorly | High alpha/shadow cost or traversal hitches despite low triangle counts. | Profile material/coverage/LOD/draw-call and loading behavior; change measured bottleneck. |
| Originality is only cosmetic | New names preserve another work's distinctive history or scenes. | Rebuild motives, institutions, mythology, and plot from this world's practical needs. |
| Factions feel like menu choices | NPCs repeat ideology but lack work, dependencies, or internal dissent. | Tie requests and services to concrete local pressures; playtest understanding. |
| Choices are opaque or secretly trivial | Players cannot identify costs, or one hidden branch fixes everything. | Surface relevant evidence and preserve real tradeoffs. |
| NPC simulation becomes brittle | Missing quest actors, navigation deadlocks, global aggro. | Bounded schedules, local knowledge, recovery states, authored fallback dialogue. |
| Saves invalidate progress | Duplicate rewards, divergent world props, corrupt writes, broken updates. | Treat persistent state and migration as core systems from M1. |
| Reuse is blocked by provenance or availability | A required pack is unpublished, unclear, or unsuitable. | Use original proxies, document the exact gap, select another candidate; keep the slice independent. |
| Shared code couples release schedules | Tervain changes require a Warpkeep deployment. | Narrow/version interfaces or keep the experimental code local. |
| Art/voice cost exceeds capacity | Every quest requires bespoke cinematic assets. | Text-first scenes, reusable animation vocabulary, selective authored moments. |
| Steam/desktop work is postponed | Game only works inside a development browser. | Package and test input/focus/saves at M1; retain platform adapter. |

## Evaluation records

For each milestone, retain the source revision, build identifier, date, known limitations, relevant device/settings, and a short conclusion about what was learned. Use captures and measurements when they answer a question. Keep reproducible scenario setup for consequential state changes.

Playtest questions should be specific: Where did you think the water went? Why did the foreman disagree? What changed after the decision? Which attack could you read? Where did you become lost? These reveal actionable problems more reliably than asking whether the game is “10/10.”

## Completion standard for this seed

M0 is complete when the outline is published to the repository, its links and internal assumptions are checked, and the first implementation objective is clear. M1–M7 remain proposed future work. The seed does not publish assets, create Steam store commitments, or change Warpkeep release state.
