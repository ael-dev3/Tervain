# Animals — historical local asset candidate

This record preserves asset-preparation evidence before the [0.0.13 hunting integration](hunting-0.0.13.md). Its local candidate version label does not identify a published upstream release.

This candidate integrates supplied Meshy animal variants into Tervain's existing coast, woodland and settlements. Each runtime animal is limited to 50,000 triangles across its complete rendered mesh. Geometry reduction operates on the static source before skinning; the original source files remain unchanged. Runtime derivatives and exact source/runtime hashes are recorded in [the model manifest](animal-assets.json).

The native GLBs contain original quadruped skeletons, normalized smooth skin weights and authored looping motion. These animations are generated for this integration, not motion capture supplied by Meshy. The seated cat retains its original seated silhouette with head, breathing and call motion. Models use metre units, a ground-level origin and forward +Z. Surface textures remain derived from their individual source assets.

One authored animal placement represents each available variant. Domestic animals inhabit settlement areas; wildlife uses woodland and clearings. Their movement remains bounded near those placements and avoids blocked, wet and steep ground. These placements and behavior are implementation choices, not new established lore. The sparse arrival, existing quests, inventory, player control and save schema remain intact. The saddle-bearing deer is an animated animal; this candidate adds no riding control.

Animals load as the player approaches, with two concurrent model downloads. Low/Medium/High retain at most 6/8/10 models and animate at most 4/6/8 at once. Each resident uses its own skeleton and AnimationMixer; eviction releases its geometry, materials, textures and skeleton resources. Pause/title/hidden states hold animal activity and calls. The existing gulls and smoke remain separate.

## Calls

Animal calls are generated offline through ElevenLabs and packaged as same-origin files. The client contains no provider credential and makes no runtime requests to ElevenLabs. Two short variations are shared within each of nine voice families, with attenuation, voice limits, cooldowns and the existing Effects/Master controls. Nearby semantic captions remain available when audio is muted or a device is unavailable.

Eleven v4 and v4 Turbo appeared in the authenticated speech-model list. A single `eleven_v4` request to the sound-generation endpoint was rejected with HTTP 422. The accepted sound-effect model was `eleven_text_to_sound_v2`. The exact model, generation prompts, hashes, duration and processing are recorded in [the sound manifest](animal-sounds.json). Calls are synthetic audio assets, not recordings of live animals.

## Validation and publication

The 18 available native models contain 625,788 triangles in total, ranging from 10,000 to 44,500 per model. Their complete delivery is 115,306,400 bytes (about 110 MiB), with source-derived 2k textures. The 18 sound files total 635,870 bytes. The production package's model and sound hashes match their manifests.

Independent checks sampled every skinned vertex at 33 times across all 78 native clips, including interpolated motion, bind accuracy and loop closure. Actual Three.js loading and skinning agreed with the independent decoder. Visual review corrected skin-weight seams and separated deer antlers from the mount's saddle attachment. Native floor penetration stayed within 4.01 mm; runtime support uses at most 32 actual paw-surface samples. Representative authored/graded-ground checks stayed within 7.3 mm of terrain penetration.

Browser checks loaded all 18 available variants with their native skins and source textures. Representative checks covered advancing native motion, exact pause/resume freezing, real packaged call playback, Effects mute, scene rebuilding and saved player position. Placement validity uses the same canonical collision layout across quality presets. Visual checks used Low in software-rendered Chromium; they do not establish High rendering or performance on a physical PC GPU.

Motion remains procedural and stylized, with some limb bending inherited from difficult source stances. Terrain support is approximate, without physical foot IK. Cosmetic animal positions and behavior restart from authored homes when a world is rebuilt and are not written into saves. The seated cat uses idle/call behavior rather than walking across the world.

The local preparation used the 0.0.11 candidate label while the served baseline was 0.0.10. Those historical stamps do not establish an animal deployment. The [local asset validation record](../production/releases/animal-assets-candidate.md) preserves those results; [the hunting release record](../production/releases/0.0.13.md) tracks the current candidate and served baseline.

The source model BOAR_1005174818 is still awaiting a usable delivery. Its distinct catalog identity remains reserved; it is not represented by a duplicate of another boar. This candidate is not yet complete for a release requiring all 19 variants.

The supplied models and generated audio retain their separately governed media provenance and are outside the repository's software-code license. No open-content license is inferred for them.
