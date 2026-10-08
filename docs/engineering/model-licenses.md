# 3D model licenses and provenance

Reviewed 6 October 2026 against the actual original-game GLBs and historical Warpkeep archive. The [built-site credits page](../../public/model-licenses.html) and [machine-readable ledger](../../public/model-licenses.json) preserve model credits, source hashes, changes and unresolved license classifications. They do not create a new content license or certify all models as CC-compliant.

## Inventory and evidence

| Set | Files | Bytes | Recorded source and scope |
| --- | ---: | ---: | --- |
| Original-game public model catalog | 106 | 564,545,496 | 54 owner-supplied Meshy source files; source-derived Tervain preparation. Includes an earlier hero retained for audit and tree variants not necessarily placed, the residents' motion library generated with the Meshy API (A65), and 17 furniture models from Meshy's text to 3D (A66). |
| Historical Warpkeep archive | 209 | 23,676,804 | 76 catalog assets, copied byte for byte from Warpkeep `786c0b2be6f2d2e7eb2de02ef3b6826c8907fc32`; archive-only. |

All 315 actual file hashes match their existing engineering or archive records; the furniture's record is its [manifest](../../public/models/furniture/manifest.json), the motion library's is its clip list ([clips.json](../../public/models/npcs/motion/clips.json)), and the residents' rig files beside the models are listed with their hashes in the resident manifest ([resident rigs and motion](resident-rigs-0.0.13.md)). None of these GLBs declares a CC license in embedded metadata or uses an external image/buffer URI. Thirty-one archived Warpkeep GLBs retain Ael/Warpkeep copyright text. An absent CC label is not evidence that CC rights are absent; an embedded copyright or generator label is not independent ownership proof.

The 19 supplied animals each retain their source filename/hash, original surface textures, complete-model triangle count, rig/clip record and prepared output hash in the [animal transformation record](meshy-animal-assets.json). Their original sources remain unchanged. Quadruped rigging, in-place gait preparation and source-derived contact repairs are credited modifications.

The public ledger records file hashes, source filenames/hashes, source-record links, preparation changes, catalog/runtime scope and retained copyright metadata. It omits machine-specific paths, private prompts and account details.

## Meshy source classification remains pending

The [current Meshy terms](https://www.meshy.ai/terms-of-use), updated 19 September 2026, distinguish these branches in sections 3.2 and 3.3:

- Free Customer Output uses **CC BY 4.0**, with Meshy attribution.
- Paid output follows separate paid-output terms; the exported filename alone does not establish the relevant grant or private ownership.
- Community 3D Customer Output uses **CC0** under the current terms. Other Community content, including uploaded images, uses **BY-NC 4.0**.

The original-game records currently establish owner-supplied sources and specific Tervain integration authority. They do not establish generation-time Free/Paid status, Community publication/download history, the original source listing or its credited creator. The classification is therefore explicitly **pending**, rather than fabricated as CC BY, CC0 or exclusively owned. The animated hero also retains Mixamo-named content whose separate source-rights record must be preserved.

Credit now appears in the distributed static page: **Original-game imported models created with Meshy; supplied by Ael and adapted for Tervain.** Once each source branch is evidenced, record its exact license/version, original source/creator notices and applicable permissions against that source hash. Source images, animations and service assets can have distinct terms; a model-service label does not clear them by itself.

## Existing CC freedoms remain intact

If a specific source is confirmed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode.en), preserve supplied creator/copyright/license/disclaimer notices and a practicable source URI; identify modifications and link the license. Retain earlier modification notices. Do not add recipient restrictions or imply endorsement. If a source is confirmed [CC0](https://creativecommons.org/publicdomain/zero/1.0/), this ledger imposes no attribution or noncommercial condition on its CC0-covered rights.

An actual per-source CC license takes precedence over general repository media wording for the rights it grants. Pending evidence is not an additional restriction on existing CC rights. The project's [source-code license scope](../../LICENSE-SCOPE.md) remains separate from model content. CC does not automatically clear trademark, privacy/publicity or third-party input rights.

## Warpkeep archive and other boundaries

The [archive manifest](../../assets/warpkeep/manifest.json) records **LicenseRef-Warpkeep-Provenance-Required**, owner-specific project-use authority and an immutable source revision. The [asset inventory](asset-inventory.md) and [NOTICE](../../NOTICE) retain Warpkeep credit. Per-set license and source provenance remain in Warpkeep-Assets; verify the actual set before a new runtime use or broader redistribution. Do not apply the root software license or a blanket CC label to the archive.

Native terrain, buildings, props, grass, foliage additions and menu geometry also originate from Tervain code. Existing software ports retain their separate software notices. This GLB ledger does not assign a new media license to generated output or the approved Hegemony artwork.

The separate Gothic 3 study/reconstruction routes are **outside the original Tervain asset library**. Their proprietary derivatives are not classified CC, and this ledger records no general rights-holder redistribution or commercial-release clearance. Preserve their [separate notice](../../assets/gothic3/NOTICE.md) and the existing license-scope exclusions rather than listing them as original Tervain models.

The [Ael / Lyrics workflow credit](menu-grove-score.md#studied-workflow-and-attribution) is a recorded **CC BY 4.0 software/workflow reference**, not an imported 3D asset. Its source, author and license links remain in that record.

## Verification and maintenance

The ledger's `auditedModelRevision` identifies the model snapshot; later documentation or credit changes do not validate different binaries. Recompute every listed file's bytes/SHA-256 against its existing source record when a model changes, add new source and modification records, and retain actual license notices. Reconcile the static credits page and JSON counts together. Published model delivery from an immutable build commit does not change the source license.

Before claiming complete CC compliance, resolve all pending source branches, confirm required creator/source/license/change notices, and verify the distributed credits. Source provenance, permission evidence and a compliance claim are separate findings.
