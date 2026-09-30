# Working in Tervain

Tervain is in pre-production. Start with README.md, docs/vision.md, and docs/decisions.md.

## Maintain the intended game

- Preserve the owner-established direction: original serious single-player Steam high fantasy; a Templar-inspired order that is part of the Hegemony (A21); diverse local factions away from Warpkeep's future main conflict; little warping; no initial keep-management focus. Affiliation is confirmed; detailed hierarchy, faith, and history remain proposals.
- Treat Hyperion and Gothic 3 as creative references. Write original characters, doctrine, plots, dialogue, geography, and visual expression.
- Art direction (owner, 29–30 September 2026): the look is old-school Gothic 3 (rugged, rough, imperfect, human, never cartoonish) and the first area is an Ardea-like coast. A20 clarifies this as theatrical fantasy exaggeration: heavy expressive forms, oversized ornament, painted color/value groups, and rich earthy contrast. Do not interpret rugged/noncartoonish as photorealism or uniform restraint; keep core text accessible. See docs/art/gothic3-reference.md and docs/art/art-audio-ui.md. Local Gothic 3 files are for measurement and inspiration only: never copy, extract, convert, or ship anything from them.
- The version stays 0.0.x until the owner approves 0.1.
- Arrival direction (A26), current build `0.0.5`: a sparse beach opening with an amnesiac protagonist, then a continuous dense woodland trail before the first inland settlement. Hegemony-affiliated Templar traces use original high-fantasy environmental storytelling; their history and the cause of amnesia remain proposals. Study Boring Forest for composition and rendering ideas without importing its code/assets. No dialogue windows in this exploration pass: NPC observation is nonblocking and must not mark a person met, change trust, or choose a quest branch. Keep gameplay tree/leaf sway paused, and preserve the established menu and water.
- Menu direction (A22, clarified by A24): original native 3D desert market with sand, palms, spices, silk, and gentle cloth wind. Use exactly one purposeful Hegemony banner bearing the approved September 27 emblem, attached to a building or visibly grounded post. The remaining silk, awnings, and merchant goods are unmarked trade material; do not repeat faction emblems as decoration. Menu-specific wind is authorized; gameplay tree/leaf sway remains paused under A16. The separate menu does not replace A26's playable coast-and-forest arrival. See docs/art/art-audio-ui.md and docs/engineering/asset-inventory.md.
- Menu title direction (A25): remove the entire outer menu border. Keep the name **Tervain** and use original monumental fantasy lettering that fits the shared Warpkeep/Hegemony/Templar identity: gold faces, dark dimensional bevels, tapered serifs, and a blade-like I within the word. Typography must not add a separate crest or second faction emblem. Hyperion remains inspiration, not imported lettering, insignia, or canon. Preserve A24's one-banner market composition and accessible controls.
- The working labels Templars, Hegemony, Core, and Ousters describe this project's discussion. Do not import the books' canon as this game's history.
- Label newly invented lore, system choices, numerical targets, and estimates as proposals until a decision is recorded. Do not turn prototype assumptions into owner decisions.
- Keep systems and story consistent across the setting, faction, quest, and slice documents. Update affected links and the decision register when a choice changes.

## Work honestly and usefully

- Report implemented behavior, proposed design, measured results, and unverified goals separately.
- Do not present installed tools, a chosen engine, published assets, Steam compatibility, or performance as verified without evidence.
- Preserve unrelated work. This repository has no authority over Warpkeep deployments, live accounts, releases, or economies.
- Prefer a working vertical slice to broad framework or content expansion. Infrastructure should serve the next demonstrated player experience.
- Read and record source/license information before copying sibling code or assets. Use docs/engineering/shared-assets.md for the inventory convention.
- Document why a technical choice helps the player and how its tradeoff was evaluated.

## Checks appropriate to the change

For documentation, check relative links, consistency, spelling of identifiers, and `git diff --check`. For implementation, run the repository commands: `npm run typecheck`, `npm test` (scenario tests over quest logic, persistence and world layout), and `npm run build`. Exercise the running game for visual, input, and interaction changes; the tests do not cover rendering or feel.

Do not add a nominal test suite simply to test the wording of these documents. Do not claim a runtime passes because Markdown checks passed, and do not quote a frame-rate or capacity result without the build, device, settings and procedure behind it. Keep `src/game` and `src/content` free of renderer code so quest behavior stays testable without a browser.
