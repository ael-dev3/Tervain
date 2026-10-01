# Replacement people sheets

An image saved here as `<id>.png` (or `.jpg`, `.jpeg`, `.webp`) replaces the painted texture sheet of the person with that id. The ids are `player`, a resident's id such as `rillford_reeve`, `bandit_a`, `bandit_b`, `fisher`, `fireside` and `keeper`.

Export the sheet to repaint with `npm run people:sheets`, check the repainted image with `npm run people:check -- <file>`, and follow [docs/art/people-retexture.md](../../../docs/art/people-retexture.md). Record every file in the [asset inventory](../../../docs/engineering/asset-inventory.md#replacement-people-sheets-008) and get the owner's approval before committing it. The folder is empty on purpose: every person currently wears the sheet the game paints.
