# The Weathered Wanderer: main character

A45, the owner's 4 October 2026 request, supplies **Meshy_AI_The_Weathered_Wandere_All_Animations.glb** for the playable Wanderer and asks that movement fit its new animations within **0.0.10**. The current derivative uses this source's Mixamo skeleton, original PBR textures and six animation clips, with UV/skin-preserving triangle reduction below the earlier 100k budget. It supersedes the October 2 runtime rig while keeping the same protagonist, unarmed arrival, inventory equipment and controller-owned movement/collision. NPCs and the menu warden retain their separate pipeline.

See [current asset provenance](main-hero-animations-assets.json) for hashes, geometry, preparation and specific project-use authority. The [animation integration handoff](main-hero-animations-0.0.10.md) explains stride measurements, authored clip selection, derived idle/action poses and verification. The source is owner supplied; no general open-content license or independently reviewed Meshy/animation rights are asserted. No extracted Gothic or Warcraft content is included in this hero.

## Runtime delivery

The current file is `public/models/hero/weathered-wanderer-animated-hero.glb`. Its URL resolves from `import.meta.env.BASE_URL`, retaining the `/Tervain/` Pages subpath. All mesh, skin, animation and JPEG data are embedded; it needs no external image, skeleton or animation fetch. The loader still validates the complete GLB header, shares concurrent requests, times out stalled downloads and releases failures for Retry.

The Blender reduction affects the base mesh. Direct GLB repacking preserves original animation times/quaternion curves and the exact embedded JPEG bytes. A uniform metre-scale normalization fits the prior hero height of 1.899 m; it scales positions, translations and inverse-bind translations consistently. It is not a repaint or a new ImageGen texture pass. Asset preparation alone does not validate game movement or rendering.

## Historical October 2 selection

A37 originally selected the 49,500-triangle, 30-joint Wanderer with five custom clips for `0.0.8`; it shipped in `0.0.9`. Its [machine-readable record](main-hero-assets.json), [integration record](../production/main-hero-integration.md) and `tools/import-main-hero.mjs --check` remain attached to that historical model, which is retained alongside the new file for audit. The old import's lossless WebP comparisons and 0.430108 m/s authored inspection walk do not describe the new JPEG/Mixamo source. Current runtime loading uses only the new animation derivative.
