# Animal assets — historical local candidate

This is the standalone animal-preparation record before the [0.0.13 hunting integration](0.0.13.md). The actual upstream [0.0.11 release](0.0.11.md) has its own history and evidence.

This release candidate adds supplied animal models, skeletal motion and locally packaged animal calls to the existing exploration prototype. Runtime geometry must remain at or below 50,000 triangles for each complete animal model. The original hero, source pine woodland, movable supplies, water, menu and save schema remain in place.

See [animal behavior and validation](../../engineering/animals-0.0.11.md), [model provenance](../../engineering/animal-assets.json) and [sound provenance](../../engineering/animal-sounds.json).

Local candidate validation passed:

- `npm run typecheck`.
- `npm test -- --reporter=dot`: 95 files and 973 tests passed.
- `npm run build`, with the packaged hashes matching all 18 prepared model files and all 18 generated sound files.
- Independent native skinning/motion checks at 33 samples across all 78 clips, including actual Three.js decoding and animation comparisons.
- Offline sound integrity/PCM validation and Low browser checks for textures, native motion, pause/resume, paw support, call playback/muting, scene rebuilding and saved player position. Antler, saddle and stout-cat belly regressions cover defects found during visual review.

The candidate includes 18 of the 19 distinct supplied variants. `Meshy_AI_BOAR_1005174818_texture.glb` is still unavailable; its identity is reserved without a substitute. The complete release awaits that source model. The served baseline at this local validation stage was 0.0.10; this record claims no publication of the animal candidate.

Release acceptance requires the complete 19-model candidate's final-source check, test and build results; a successful Pages deployment; and verification of the served version, source revision and animal assets. The local checks above do not establish High rendering or performance on a physical PC GPU.
