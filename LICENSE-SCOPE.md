# Source-code license scope

The complete license text is the unmodified [PolyForm Noncommercial License 1.0.0](LICENSE), also available from the [official PolyForm page](https://polyformproject.org/licenses/noncommercial/1.0.0). This document explains which material the Tervain project offers under that text; it does not amend the license.

## What the license covers

The license is offered only for independently owned original software code written specifically for Tervain, where its relevant copyright holder owns the code or is authorized to offer it under these terms. It is not a license for this entire repository, the game as a whole, every file under `src/`, or every file delivered by the website.

In practical file terms, the included software-code paths are `src/**`, `tests/**`, and `tools/**`, plus root application/build code such as `index.html` and `vite.config.ts`, subject to the rights-holder condition above and the explicit exclusions below. A file with its own license, header, or provenance record stays under those separate terms. Non-code files beside covered code are not included.

The grant covers software code only. It does not grant rights in documentation, design or narrative text, art, audio, music, images, fonts, 3D models, video, data, branding, names, emblems, or trademarks.

No contributor copyright assignment is recorded or created here. A contribution remains subject to its author's rights and any terms already attached to it. A contribution is covered by this license only where its rights holder has authorized that offer. A pull request or repository notice does not itself transfer rights.

## Material expressly outside this license

### Gothic 3 references, study, and reconstruction

All Gothic 3-specific code, research, extracted or converted game material, and reconstructed content remain outside this license, including:

- `gothic3/index.html` and `gothic3-local/index.html`;
- `src/gothic3/**`, the reconstruction whose modules and data summaries cite installed-game evidence;
- `src/gothic3local/**`, the original local-install viewer code;
- `tools/gothic3LocalData.ts` and `tests/gothic3local/**`;
- `assets/gothic3/**` and `public/gothic3/**`, including native-source excerpts, extracted/converted assets, evidence, manifests, and reconstructions;
- `tools/gothic3/**`, whose offline preparation scripts retain their separate GPL-3.0-only terms.

The `/gothic3-local/` viewer reads the visitor's own installation in the browser and hosts no game files; its original viewer code is nevertheless excluded from this license. Gothic 3 visual references, measurements, and research records remain references and are not licensed by this code grant.

These exclusions leave all files and their current records in place. This license provides no new permission to copy, redistribute, publish, or commercially release Gothic 3 material. Any existing project-specific hosting authority or other permission remains limited to what its source record actually says; it does not become a general grant.

### Existing software licenses and third-party material

The following existing terms and notices remain unchanged and are not replaced by the root license:

- Warpkeep-derived Apache-2.0 adaptations in `src/presentation/environment.ts`, `src/presentation/vegetation.ts`, `src/presentation/ground/grass.ts`, `src/presentation/ground/patchMaterial.ts`, and `src/presentation/ground/tileStream.ts`, with their source headers and attribution in [NOTICE](NOTICE).
- Three.js and its unmodified Reflector addon under MIT, and `@dimforge/rapier3d-compat` under Apache-2.0, with their existing notices in `public/third-party-notices.txt`.
- GPL-3.0-only terms and full license retained for the offline Gothic 3 tools under `tools/gothic3/`.

No other third-party work, dependency, archived asset, or externally governed material is relicensed by this notice. Existing file headers, manifests, per-asset provenance and notices continue to govern.

### Original media and identity

Tervain's original art, music, models, story and setting text, visual identity, marks, and other non-code content are separately governed and are not included in this software license. Owner-supplied or externally produced content keeps the permission and provenance stated in its existing record. This notice does not resolve any open authorship or service-term questions recorded for Suno, Meshy, or Mixamo-related material.

## Commercial permissions

PolyForm Noncommercial 1.0.0 does not grant commercial permission for code it covers. Separate commercial permission may be requested at [ael.dev@proton.me](mailto:ael.dev@proton.me). Any permission would require separate authorization from the relevant rights holder; no rate, royalty, guarantee, or other commercial term is set by this notice.

The application package remains marked private in `package.json`. It has no package-wide license metadata because the root license is deliberately narrower than the package and repository contents.
