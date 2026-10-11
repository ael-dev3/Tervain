# Gothic 3 browser campaign completion

## Objective

A proper TypeScript reconstruction hosted at `/gothic3/` must let a player start a new game, play the original campaign through an original ending, and save and reload that progress. Native startup work, extracted model viewers, component checks and a successful deployment are evidence for their own scope. Completion requires a played campaign on the deployed revision.

## Current evidence and remaining work

This review uses main through `7e7884999313c061d1d5ce3164ca239d53f02cf3` and the local native reconstruction checkpoints. It does not claim that later local changes are deployed.

| Area | Evidence in the current implementation | What still needs proof |
| --- | --- | --- |
| Startup | Captured native routines and explicit pending boundaries; local MainCache reconstruction is advancing | Remaining native startup and game startup callbacks operate together in the running game |
| World and actors | The browser presents the recovered Ardea scene and source character resources | Source world content, actor activation and interactions needed throughout the campaign are available and functional |
| Visuals and motion | Original resources and native motion sampling have browser integration | Materials, transparency, rigs, animation, attachments and placement agree with the original resources throughout gameplay |
| Quests and dialogue | A source-audited startup transition starts `Xardas_FindXardas`; selected Ardea operations and rewards are connected | Campaign dialogue, conditions, commands and consequences advance through the original ending trigger |
| Combat and NPC behavior | Supported portions have source and component evidence | Player and NPC combat, defeat, death, loot and behavior required by campaign encounters work together |
| Saves | Retained quest/session state has a save schema and restoration code | A campaign save restores the live world, actors, inventory, progression and quest consequences needed to continue and finish |
| Hosting | `/gothic3/` is an existing separate route | The verified campaign revision is deployed and its browser resources load successfully |

The current UI explicitly identifies original NPC activation as incomplete and most startup operations and campaign progression as unimplemented. See [the browser entry](../../src/gothic3/main.ts), [quest runtime](../../src/gothic3/quest-runtime.ts), [quest transitions](../../src/gothic3/quest-state.ts), and [session runtime](../../src/gothic3/session-runtime.ts).

## Evidence required before calling the goal complete

1. Record the deployed build revision and the original resource/evidence hashes used by that build.
2. Start a fresh game through the ordinary browser controls. Verify the original initialized Hero, world, actors and campaign state, including required startup callbacks.
3. Play a continuous original campaign path using gameplay and dialogue. Record the actual quest conditions, commands and world consequences; do not substitute a manually forced terminal quest state or an invented ending screen.
4. Verify the world traversal, NPC behavior, combat, inventory, progression and interactions needed by that campaign path. Unimplemented prerequisites remain completion gaps even when individual components pass checks.
5. Save during the campaign, reload in a fresh browser session, and continue from the restored state. Retain the save artifacts and evidence that actor, inventory and quest consequences survived restoration.
6. Reach the original ending through its source-backed trigger and verify the associated final game state and presentation on the deployed build.
7. Retain a campaign verification record linking the build revision, browser observations, saves and original ending evidence. A local suite or CI pass cannot replace that record.

For the extraction and reconstruction workflow, see [How we rebuild Gothic 3](gothic3-reconstruction-method.md). Continue connecting unsupported dependencies from their actual evidence; keep the full campaign objective intact while recording each checkpoint honestly.
