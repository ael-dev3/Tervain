# Tervain documentation

Status: foundation outline, 29 September 2026, plus records of the browser prototype: historical [0.0.5 forest and menu](production/releases/0.0.5.md), public [0.0.7 menu grove](production/releases/0.0.7.md), and the combined local 0.0.8 candidate with [desktop world polish](production/releases/0.0.8-world-polish.md) and [Claude PR #10's people rework](production/releases/0.0.8.md). The owner authorized merging and live publication; combined automated checks pass, while the merged source checkpoint, native review and verified deployment remain pending. Tervain is for PC; mobile/touch work is outside the current scope. The [0.0.4 notes](production/releases/0.0.4.md) preserve earlier construction, menu, and water evidence. Design documents propose; the [prototype notes](engineering/prototype.md) and dated release notes distinguish implemented behavior, component evidence, and final combined checks.

## Reading paths

| Reader / task | Read in order |
| --- | --- |
| Understand the game | [Vision](vision.md) → [setting](world/setting.md) → [factions](world/factions.md) → [slice](production/vertical-slice.md). |
| Design a quest | [Gameplay](design/gameplay.md) → [factions](world/factions.md) → [quests and consequences](design/quests-and-consequences.md) → [narrative](world/narrative.md). |
| Start implementation | [Decisions](decisions.md) → [architecture](engineering/architecture.md) → [prototype](engineering/prototype.md) → [shared assets](engineering/shared-assets.md) → [slice](production/vertical-slice.md). |
| Play or test the build | [Prototype](engineering/prototype.md) → [0.0.8 world-polish handoff](production/releases/0.0.8-world-polish.md) and [people component](production/releases/0.0.8.md) → [public 0.0.7 record](production/releases/0.0.7.md) → [future slice acceptance](production/vertical-slice.md). |
| Work on item controls and world pickups | [0.0.8 inventory/hotbar/map/pickups](production/releases/0.0.8-world-polish.md#inventory-hotbar-map-and-world-pickups) → [controls and save recovery](engineering/prototype.md) → [A35 scope](decisions.md). |
| Make environment or character art | [Art/audio/UI](art/art-audio-ui.md) → [setting](world/setting.md) → [shared assets](engineering/shared-assets.md). |
| Work on the people or the unarmed start | [0.0.8 notes](production/releases/0.0.8.md) → [people notes](production/releases/0.0.5-people.md) → [Gothic 3 people study](art/gothic3-reference.md#people) and [Gothic 1 Remake study](art/gothic3-reference.md#gothic-1-remake-people-at-rest) → [people updates](art/art-audio-ui.md#people-update-1-october-2026-008). |
| Repaint a person (Codex, an image model, by hand) | [Retexture guide](art/people-retexture.md) → [people sheets inventory](engineering/asset-inventory.md#replacement-people-sheets-008) → [0.0.8 notes](production/releases/0.0.8.md). |
| Plan the project | [Vision](vision.md) → [roadmap](production/roadmap.md) → [decisions](decisions.md). |
| Check a source or assumption | [Reference ledger](references.md) → the dated upstream record named there. |
| Work on the menu grove (door, hollow, spirits) | [Grove record](engineering/menu-grove-score.md) → [score analysis guide](../tools/README-menu-score-analysis.md) → [0.0.7 notes](production/releases/0.0.7.md). |
| Check menu music provenance | [The Sovereign's Oath source record](engineering/menu-score.md) → [audio inventory](engineering/menu-audio-assets.json) → [0.0.5 handoff](production/releases/0.0.5.md). |

## Document authority

The [decision register](decisions.md) records owner-established direction. Domain documents expand it with proposed implementation and lore. In a conflict, preserve the explicit user decision, identify the inconsistency, and update the affected documents together. A long description or precise number does not make a proposal approved or implemented.

## Shared vocabulary

- **Tervain:** selected game title; proposed local setting name. Its precise geographic scale is open.
- **Templars:** working label for our original ecological religious order; final formal name and identity are open.
- **Accord of the Wells:** proposed original founding settlement around shared water, sanctuary, and land obligations.
- **Bellwether Vale / Rillford:** proposed first-playable valley and village.
- **The Dry Bell:** proposed first complete quest.
- **Deepwood:** working label and internal habitat footprint for the `0.0.5` arrival forest; its history is not approved canon.
- **Inland waystation:** the former beach camp moved beyond the forest walk, before Rillford; it is not a new regional town or quest chain.
- **Slice:** the bounded experience in the [slice brief](production/vertical-slice.md), not the whole eventual game.
- **Target:** an intended result to test. **Measured:** a result with a build, device, settings, and procedure attached.

All of the proper nouns below the selected title are working design material. Their inclusion is permission to iterate on a coherent proposal, not a claim that naming, localization, or commercial clearance is complete.
