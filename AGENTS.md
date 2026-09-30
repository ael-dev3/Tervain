# Working in Tervain

Tervain is in pre-production. Start with README.md, docs/vision.md, and docs/decisions.md.

## Maintain the intended game

- Preserve the owner-established direction: original serious single-player Steam high fantasy; a Templar-inspired order that is part of the Hegemony (A21); diverse local factions away from Warpkeep's future main conflict; little warping; no initial keep-management focus. Affiliation is confirmed; detailed hierarchy, faith, and history remain proposals.
- Treat Hyperion and Gothic 3 as creative references. Write original characters, doctrine, plots, dialogue, geography, and visual expression.
- Art direction (owner, 29–30 September 2026): the look is old-school Gothic 3 (rugged, rough, imperfect, human, never cartoonish) and the first area is an Ardea-like coast. A20 clarifies this as theatrical fantasy exaggeration: heavy expressive forms, oversized ornament, painted color/value groups, and rich earthy contrast. Do not interpret rugged/noncartoonish as photorealism or uniform restraint; keep core text accessible. See docs/art/gothic3-reference.md and docs/art/art-audio-ui.md. Local Gothic 3 files are for measurement and inspiration only: never copy, extract, convert, or ship anything from them.
- The version stays 0.0.x until the owner approves 0.1.
- Menu direction (A22): original native 3D desert market with sand, palms, spices, silk, and gentle cloth wind; use the exact approved September 27 Hegemony emblem on integrated fabric, not invented seals or a static lone banner over the beach. Menu-specific wind is authorized; gameplay tree/leaf sway remains paused under A16. The playable Grey Strand coast is unchanged. See docs/art/art-audio-ui.md and docs/engineering/asset-inventory.md.
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
