# Contributing to Tervain

The repository begins as a connected development outline. Contributions should make the next production decision or playable milestone more concrete.

## Read before working

1. [Vision](docs/vision.md) for the intended experience.
2. [Decision register](docs/decisions.md) for the distinction between accepted direction and working proposals.
3. [Vertical slice](docs/production/vertical-slice.md) for the first bounded delivery.
4. The relevant design document and its linked dependencies.

## Proposing a change

Explain the player problem, the proposed behavior, the smallest useful implementation, and how we can evaluate it. For a narrative change, identify affected faction motives, quest evidence, and later consequences. For an asset change, identify its source, intended use, and verification state.

Use stable identifiers for quest facts and content once implementation begins. Display names may change without silently breaking saves. Working names in this seed are not an instruction to freeze every proper noun.

## Reviews and validation

- Keep a change focused enough to review as a coherent experience or decision.
- Include the relevant build, scenario, screenshot, or measurement when one exists.
- Preserve explicit costs and alternate outcomes in quests; avoid making a hidden perfect branch invalidate every other choice.
- Check controller navigation, text readability, and save behavior alongside the main interaction when they are affected.
- Test on the packaged target when packaging or runtime behavior changes; browser success alone is not desktop proof.
- For documentation-only changes, verify links, consistency, and clean diffs without pretending to run a game.

## Shared work and assets

Keep reusable art sources and provenance discoverable in Warpkeep-Assets when appropriate; keep Tervain's selected runtime inventory and transformations in this repository. Record exact upstream revisions rather than assuming a floating branch stays compatible. Avoid copying generated client bindings, private world exports, accounts, or deployment machinery from Warpkeep into a local RPG.

The project licensing strategy is an open decision. Contributions should identify their authorship and existing terms; this document does not relicense anyone's work.
