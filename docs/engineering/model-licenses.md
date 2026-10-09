# 3D model licenses and provenance

Reviewed 6 October 2026 against the actual original-game GLBs and historical Warpkeep archive. The [built-site credits page](../../public/model-licenses.html) and [machine-readable ledger](../../public/model-licenses.json) preserve model credits, source hashes, changes and license classifications, including the records that remain unresolved. They do not create a new content license or certify all models as CC-compliant.

## Inventory and evidence

| Set | Files | Bytes | Recorded source and scope |
| --- | ---: | ---: | --- |
| Original-game public model catalog | 107 | 157,046,884 | 54 owner-supplied Meshy source files; source-derived Tervain preparation. Includes two earlier heroes retained for audit and tree variants not necessarily placed, the residents' motion library generated with the Meshy API (A65), 17 furniture models from Meshy's text to 3D (A66), and the sealed wanderer the game plays (A69). |
| Historical Warpkeep archive | 209 | 23,676,804 | 76 catalog assets, copied byte for byte from Warpkeep `786c0b2be6f2d2e7eb2de02ef3b6826c8907fc32`; archive-only. |

All 316 actual file hashes match their existing engineering or archive records; the furniture's record is its [manifest](../../public/models/furniture/manifest.json), the motion library's is its clip list ([clips.json](../../public/models/npcs/motion/clips.json)), and the residents' rig files beside the models are listed with their hashes in the resident manifest ([resident rigs and motion](resident-rigs-0.0.13.md)). The ledger's `generatedRigs` list names each of the 17 rig files with its Meshy automatic-rigging task id and date, under the `resident-rigs` source, classified as Meshy Pro paid-plan output like the motion library. None of these GLBs declares a CC license in embedded metadata or uses an external image/buffer URI. Thirty-one archived Warpkeep GLBs retain Ael/Warpkeep copyright text. An absent CC label is not evidence that CC rights are absent; an embedded copyright or generator label is not independent ownership proof.

The 19 supplied animals each retain their source filename/hash, original surface textures, complete-model triangle count, rig/clip record and prepared output hash in the [animal transformation record](meshy-animal-assets.json). Their original sources remain unchanged. Quadruped rigging, in-place gait preparation and source-derived contact repairs are credited modifications.

The public ledger records file hashes, source filenames/hashes, source-record links, preparation changes, catalog/runtime scope and retained copyright metadata. It omits machine-specific paths, private prompts and account details.

## Meshy source classification: paid-plan output (Meshy Pro)

Confirmed by the project owner, 9 October 2026: every Meshy-generated asset in the project was generated under **Meshy Pro**, a paid plan. That covers the supplied Meshy models (residents, animals, trees, the rock pile, the ancient guardian and the wanderer sources), the 17 generated resident rigs, the resident motion library and the 17 furniture pieces: all 73 Meshy sources in the ledger and the 107 public model files derived from them (A72). Each Meshy source records `evidenceStatus: "meshy-paid-plan-output"`, the plan, the confirmation and its date, and the governing terms; the ledger's `serviceRules` holds the terms text.

The [current Meshy terms](https://www.meshy.ai/terms-of-use), updated 19 September 2026, govern that output as follows:

- **Section 3.2** (Ownership of User Content; Rights Granted to Meshy): customers on a paid Meshy plan may keep their User Content private, and, as between Meshy and those customers and to the extent possible under applicable law, they own their Customer Output. Customers grant Meshy a non-exclusive, royalty-free, worldwide license to use User Content as necessary to provide the Service and as otherwise permitted under the terms.
- **Section 3.1** (Meshy's Intellectual Property): Meshy owns the Service; its Service Assets are licensed only to the extent incorporated into and necessary to use the Customer Output.
- **Section 2.9**: Meshy may use non-Enterprise customers' inputs and outputs to train, validate, test or improve its Services.
- **Section 7.2** (Disclaimers): Customer Output is provided as is and may be inaccurate; Meshy does not guarantee that it is unique or unlike existing 3D models, and it may not qualify for intellectual-property protection.

The other branches no longer apply to these assets. Free-plan output (section 3.2), which Meshy owns and makes available under **CC BY 4.0** with Meshy credit, is not their generation branch. Community output (section 3.3), where Customer Output posted on the Meshy Community page is **CC0** and other Community content **BY-NC 4.0**, does not apply either: no Community posting is recorded for them.

This classification records the applicable terms branch. It is not a commercial-clearance certificate and grants nothing beyond what the terms state. It does not clear third-party inputs, trademark or publicity rights, and it does not cover what is not Meshy output:

- The animated hero source contains **Mixamo-named skeleton and animation content**. Its separate source rights are not independently established; the ledger keeps them under `separateRights` with `evidenceStatus: "pending-source-rights"` on the `wanderer-animated` source.
- The historical Warpkeep archive keeps **LicenseRef-Warpkeep-Provenance-Required** (below).
- Material refinement with other tools, original Tervain additions and code-generated geometry keep their own records.

Credit appears in the distributed static page: **Original-game imported models created with Meshy; supplied by Ael and adapted for Tervain.** Source creator credit beyond the generating account is not recorded where the source records do not list it. Source images, animations and service assets can have distinct terms; a model-service plan does not clear them by itself.

The record scripts write this classification for the entries they produce (`tools/meshy-rig/record.mjs`, `tools/meshy-furniture/record.mjs`, `tools/hero/record.mjs`), from shared values in `tools/model-ledger/meshy.mjs`; `node tools/model-ledger/classify-meshy.mjs` applies it to the whole ledger and is idempotent.

## Existing CC freedoms remain intact

No current Meshy source is classified CC: paid-plan output is not a Creative Commons grant, and the ledger does not relabel it CC. These rules remain for any source that is confirmed under a CC license.

If a specific source is confirmed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode.en), preserve supplied creator/copyright/license/disclaimer notices and a practicable source URI; identify modifications and link the license. Retain earlier modification notices. Do not add recipient restrictions or imply endorsement. If a source is confirmed [CC0](https://creativecommons.org/publicdomain/zero/1.0/), this ledger imposes no attribution or noncommercial condition on its CC0-covered rights.

An actual per-source CC license takes precedence over general repository media wording for the rights it grants. Pending evidence elsewhere is not an additional restriction on existing CC rights. The project's [source-code license scope](../../LICENSE-SCOPE.md) remains separate from model content. CC does not automatically clear trademark, privacy/publicity or third-party input rights.

## Warpkeep archive and other boundaries

The [archive manifest](../../assets/warpkeep/manifest.json) records **LicenseRef-Warpkeep-Provenance-Required**, owner-specific project-use authority and an immutable source revision. The [asset inventory](asset-inventory.md) and [NOTICE](../../NOTICE) retain Warpkeep credit. Per-set license and source provenance remain in Warpkeep-Assets; verify the actual set before a new runtime use or broader redistribution. Do not apply the root software license or a blanket CC label to the archive.

Native terrain, buildings, props, grass, foliage additions and menu geometry also originate from Tervain code. Existing software ports retain their separate software notices. This GLB ledger does not assign a new media license to generated output or the approved Hegemony artwork.

The separate Gothic 3 study/reconstruction routes are **outside the original Tervain asset library**. Their proprietary derivatives are not classified CC, and this ledger records no general rights-holder redistribution or commercial-release clearance. Preserve their [separate notice](../../assets/gothic3/NOTICE.md) and the existing license-scope exclusions rather than listing them as original Tervain models.

The [Ael / Lyrics workflow credit](menu-grove-score.md#studied-workflow-and-attribution) is a recorded **CC BY 4.0 software/workflow reference**, not an imported 3D asset. Its source, author and license links remain in that record.

## Verification and maintenance

The ledger's `auditedModelRevision` identifies the model snapshot; later documentation or credit changes do not validate different binaries. Recompute every listed file's bytes/SHA-256 against its existing source record when a model changes, add new source and modification records, and retain actual license notices. Reconcile the static credits page and JSON counts together. Published model delivery from an immutable build commit does not change the source license.

Before claiming that every model's rights are resolved, establish the animated hero's Mixamo-named content and the Warpkeep per-set provenance, confirm required creator/source/license/change notices, and verify the distributed credits. Source provenance, permission evidence and a compliance claim are separate findings.
