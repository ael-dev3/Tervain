# Numerical NPC audit image extensions

The numerical NPC audit intentionally replaces image decoding with neutral textures, while preserving actual GLB geometry, skinning, material bindings and pose code. Its generic GLTF texture plugin was bypassed by the built-in WebP handler. In Node, the audit stopped in `GLTFParser.loadImageSource` with `ReferenceError: self is not defined`, before checking a single posed model.

The audit's `beforeRoot` hook now installs its existing neutral-image handler on the parser and image-extension plugins before scene/material dependencies start loading. This affects only this numerical audit, not the game loader, GLB assets or rendered textures. Its existing limits on visual/paint acceptance remain explicit.

## Reproduction

Run the same command before and after this change:

```sh
node tools/audit-meshy-npc-runtime.mjs --only maintenance-worker --output audit.json
```

Before: exits 1 through the WebP handler's browser-only image decoder, with no completed audit. After: exits 0, one actual asset, 1,095,562 posed vertex reads, 26 full-geometry poses and 1,620 transition frames.

The complete-pack command also passed:

```sh
node tools/audit-meshy-npc-runtime.mjs --output audit.json
```

After: 17 assets, 18,344,872 posed vertex reads, 26 geometry poses and 1,620 transition frames per asset; source binary, cached template and private-resource checks all passed. [Receipt](npc-audit-webp-proof/after.json).

WebP is the reproduced extension path. The same numerical override covers other image-extension handlers, but this proof does not exercise an AVIF or BasisU fixture. Neutral pixels do not establish correct paint, shaders, face appearance or hardware performance. Runtime and asset files are unchanged.
