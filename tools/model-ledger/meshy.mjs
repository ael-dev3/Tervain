/**
 * The Meshy classification every Meshy-derived entry in the distributed model ledger (public/model-licenses.json)
 * carries (A72): all Meshy output in the project was generated under a paid Meshy Pro plan, so it follows Meshy's
 * paid-plan Customer Output terms rather than the free-plan CC BY 4.0 or Community CC0 branches.
 *
 * The record scripts (tools/meshy-rig/record.mjs, tools/meshy-furniture/record.mjs, tools/hero/record.mjs) use these
 * values for the entries they write; tools/model-ledger/classify-meshy.mjs applies them to the whole ledger.
 */
import fs from 'node:fs';

export const MESHY_TERMS_URL = 'https://www.meshy.ai/terms-of-use';
export const MESHY_TERMS_UPDATED = '2026-09-19';
export const MESHY_PLAN = 'Meshy Pro (paid)';
export const MESHY_CONFIRMATION = 'Confirmed by the project owner, 9 October 2026: generated under Meshy Pro.';
export const MESHY_PAID_STATUS = 'meshy-paid-plan-output';

/** The license record of a Meshy source. */
export const meshyProLicense = () => ({
  spdx: null,
  version: null,
  evidenceStatus: MESHY_PAID_STATUS,
  plan: MESHY_PLAN,
  confirmation: MESHY_CONFIRMATION,
  confirmedAt: '2026-10-09',
  terms: `Meshy terms of use (${MESHY_TERMS_URL}), updated ${MESHY_TERMS_UPDATED}, section 3.2: paid-plan Customer Output. See serviceRules.`,
  notApplicable: 'Free-plan CC BY 4.0 output (section 3.2) and Community CC0 output (section 3.3) are not the branch of this source.',
});

/** The license record of a shipped file derived from a Meshy source. */
export const meshyProAssetLicense = () => ({ spdx: null, version: null, evidenceStatus: MESHY_PAID_STATUS, plan: MESHY_PLAN });

export const MESHY_RIGHTS_BOUNDARY = 'Meshy Pro paid-plan Customer Output (Meshy terms section 3.2). This records the applicable terms branch; it is not a commercial-clearance certificate and does not clear third-party input, trademark, publicity or separately recorded rights.';

/** What the animated hero's source carries beyond Meshy output, recorded apart from the plan confirmation. */
export const WANDERER_SEPARATE_RIGHTS = [{
  component: 'Mixamo-named skeleton and animation content in the supplied animated source',
  evidenceStatus: 'pending-source-rights',
  note: 'Not covered by the Meshy plan confirmation. Its separate source rights are not independently established.',
}];

export const meshyServiceRules = () => ({
  source: MESHY_TERMS_URL,
  termsUpdated: MESHY_TERMS_UPDATED,
  sections: ['2.9', '3.1', '3.2', '3.3', '7.2'],
  appliedBranch: 'paid-plan Customer Output',
  plan: MESHY_PLAN,
  confirmation: MESHY_CONFIRMATION,
  confirmedAt: '2026-10-09',
  coverage: 'Every Meshy source and branch in this ledger: the supplied Meshy models (residents, animals, trees, rock pile, ancient guardian and the wanderer sources), the 17 generated resident rigs, the resident motion library and the 17 furniture pieces.',
  paidOutput: 'Section 3.2 (Ownership of User Content; Rights Granted to Meshy): customers on a paid Meshy plan may keep their User Content private; as between Meshy and those customers, and to the extent possible under applicable law, they own their Customer Output. Customers grant Meshy a non-exclusive, royalty-free, worldwide license to use User Content as necessary to provide the Service and as otherwise permitted under the terms.',
  serviceAssets: 'Section 3.1 (Meshy’s Intellectual Property): Meshy owns the Service; Service Assets are licensed only to the extent incorporated into and necessary to use the Customer Output.',
  training: 'Section 2.9: Meshy may use non-Enterprise customers’ inputs and outputs to train, validate, test or improve its Services.',
  disclaimers: 'Section 7.2 (Disclaimers): Customer Output is provided as is and may be inaccurate; Meshy does not guarantee that it is unique or unlike existing 3D models, and it may not qualify for intellectual-property protection.',
  freeOutput: 'Free-plan output (section 3.2: owned by Meshy and made available under CC BY 4.0 with Meshy credit) is not the generation branch of these assets and no longer applies to them.',
  communityOutput: 'Customer Output posted on the Meshy Community page is CC0 1.0, and other Community content BY-NC 4.0 (section 3.3). No Community posting is recorded for these assets, so this branch does not apply to them.',
  boundary: 'This records the applicable terms branch for Meshy output only. It does not certify commercial clearance, clear third-party input, trademark, publicity or separately recorded animation rights, or extend any right beyond what the terms state.',
});

/** Applies the paid-plan classification to every Meshy source, rig and derived file in the ledger. */
export function classifyMeshy(ledger) {
  ledger.serviceRules = meshyServiceRules();
  const meshy = new Set();
  for (const [id, source] of Object.entries(ledger.sources)) {
    if (source.generationService !== 'Meshy') continue;
    meshy.add(id);
    source.license = meshyProLicense();
    source.rightsBoundary = MESHY_RIGHTS_BOUNDARY;
    if (id === 'wanderer-animated') source.separateRights = WANDERER_SEPARATE_RIGHTS;
  }
  for (const asset of ledger.assets) if (meshy.has(asset.sourceId)) asset.license = meshyProAssetLicense();
  return ledger;
}

/** Writes JSON as the ledger and manifests are kept: two-space indents, and characters beyond ASCII escaped. */
export const writeJson = (file, value) => fs.writeFileSync(file,
  `${JSON.stringify(value, null, 2).replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`);
export const writeLedger = writeJson;
