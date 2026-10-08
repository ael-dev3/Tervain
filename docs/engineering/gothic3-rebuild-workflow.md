# Gothic 3 rebuild: step-by-step workflow

## Goal and current scope

Rebuild Gothic 3 as a TypeScript game on the separate `/gothic3/` browser route.
Completion means starting a new game, progressing through the campaign, saving
and reloading, and reaching an ending through ordinary play. Engine startup,
world/NPC activation and campaign integration remain unfinished. A hosted build
or a model viewer establishes only the behavior actually demonstrated.

Read the [rebuild overview](gothic3-rebuild-overview.md) for architecture and the
[checkpoint history](gothic3-rebuilding-process.md) for dated implementation evidence.

## 1. Inventory the installed game

The local reference installation is
`C:\Program Files (x86)\Steam\steamapps\common\Gothic 3`.
Record archive names, patch precedence and the original resource paths before
extracting anything. Hash the exact inputs used by a checkpoint. Treat the
installation as a read-only reference; format decoding and archive unpacking
need their own evidence before making claims about encryption.

## 2. Recover assets and their relationships

Use the readers and exporters in [`tools/gothic3/`](../../tools/gothic3/).
Prepare meshes, textures, skinned humans, animations, terrain, world placement
and gameplay records. Preserve original paths and conversion metadata so each
browser asset can be traced back to its installed resource.

Keep evidence under [`assets/gothic3/`](../../assets/gothic3/) and browser resources
under [`public/gothic3/`](../../public/gothic3/). Inspect geometry and materials,
including texture alpha, normals, scale, skeletons and animation. Compare a
rendered asset with the original game's appearance before accepting fidelity.

## 3. Recover engine behavior

For a missing behavior, follow its original caller, callee and dependencies.
Compare decompiled C with disassembly and original DLL bytes. Record the module
hash, function addresses, imports, globals, allocation sizes, callbacks and
cleanup order. Decompiled listings are research evidence; each browser behavior
still requires implementation.

Generate reproducible evidence packages with the appropriate preparation script.
Regenerate into a separate directory and compare the generated files and
instruction module with the proposed checkpoint.

## 4. Implement connected TypeScript state

Runtime code lives in [`src/gothic3/`](../../src/gothic3/). Selected original x86
instructions execute through the TypeScript interpreter against owned memory,
thread stacks and implemented platform imports. Implement dependencies while
preserving pointer identity, known and unknown bytes, exception frames, locks,
callback ordering and object lifetime.

At an unsupported operation, report its original address and retain the state
already applied. Continue from that boundary when the dependency is implemented.
Record the distinction between captured evidence, locally implemented behavior
and a reviewed revision that has actually been deployed.

## 5. Join the runtime to gameplay

Complete startup, activate world entities and connect player movement,
collision, rendering, animation and interaction. Integrate NPC routines, combat,
inventory, dialogue, quest conditions and faction progression. Save and restore
the connected state, including consequences that affect later quests and endings.
Each stage must consume the actual state produced by its dependencies.

## 6. Validate a coherent checkpoint

From the repository root:

```sh
npm ci
npm run dev
```

Open the development server's `/gothic3/` route. For runtime changes, run focused
checks first, then the appropriate repository checks:

```sh
npm run typecheck
npm test
npm run build
```

Inspect the diff and source regeneration comparison. Record the revision,
commands, results and next unsupported boundary in the checkpoint history.
For integrated gameplay, include browser observations and save/reload evidence.
Campaign completion requires a playthrough to an ending.

## 7. Review and host the checkpoint

Inspect repository-wide Actions runs, attempts and workflow triggers before
remote changes. Reuse applicable evidence and avoid duplicate runs. The current
[Pages workflow](../../.github/workflows/pages.yml) validates pull requests;
a reviewed merge to `main` builds and deploys the site. A successful deployment
and a successful gameplay check are separate receipts.

The hosted route is [Gothic 3 reconstruction](https://ael-dev3.github.io/Tervain/gothic3/).
Record its deployed revision and supported behavior. Continue through remaining
startup, world and campaign dependencies until the completion criteria above
are demonstrated.
