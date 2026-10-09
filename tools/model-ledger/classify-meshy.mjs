#!/usr/bin/env node
/**
 * Applies the resolved Meshy classification (A72) to the distributed model ledger (public/model-licenses.json): every
 * Meshy source, the generated resident rigs, the motion library, the furniture and each shipped file derived from them
 * follow Meshy's paid-plan Customer Output terms (Meshy Pro). Records outside Meshy output keep their own status.
 *
 *   node tools/model-ledger/classify-meshy.mjs        idempotent; the record scripts write the same values
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyMeshy, writeLedger } from './meshy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ledgerFile = path.join(ROOT, 'public/model-licenses.json');
const ledger = classifyMeshy(JSON.parse(fs.readFileSync(ledgerFile, 'utf8')));

ledger.summary.licenseClassification = 'Every Meshy source, the generated resident rigs, the resident motion library and the furniture are Meshy Pro (paid) Customer Output under Meshy’s terms of use (updated 19 September 2026, section 3.2), confirmed by the project owner on 9 October 2026; the free-plan CC BY 4.0 and Community CC0 branches do not apply to them. The animated hero’s Mixamo-named skeleton/animation content and the Warpkeep archive remain separately unresolved. Absence of an embedded CC label does not establish absence of CC rights.';
ledger.credit = 'Original-game imported models created with Meshy (https://www.meshy.ai/) under a Meshy Pro paid plan; owner-supplied sources adapted for Tervain. Any source creator credit beyond that remains unrecorded where not listed. The historical Warpkeep archive retains its separate source records and notices.';
ledger.licenseFreedomExceptions.principle = 'An actual per-source CC license takes precedence over general repository media wording for the rights it grants. No project notice limits recipients’ existing CC rights. No current Meshy source is classified CC: paid-plan output is not a CC grant, and this ledger does not relabel it CC. Pending status elsewhere is an evidence gap, not a restriction added to an existing license.';
ledger.licenseFreedomExceptions.unresolvedOrSpecial = 'Owner-specific permission and unresolved records (the animated hero’s Mixamo-named content, the Warpkeep archive) are not relabeled CC or privately owned by this ledger.';
ledger.resolutionRequired = [
  'Establish the separate source rights of the Mixamo-named skeleton and animation content in the animated hero source.',
  'Preserve actual image-input and animation rights separately; a model-service plan does not clear third-party inputs.',
  'Establish per-set provenance for the archived Warpkeep models before any new runtime use or broader redistribution.',
];
writeLedger(ledgerFile, ledger);
const sources = Object.values(ledger.sources).filter((source) => source.generationService === 'Meshy').length;
const files = ledger.assets.filter((asset) => asset.license.evidenceStatus === 'meshy-paid-plan-output').length;
console.log(`ledger: ${sources} Meshy sources and ${files} files classified as Meshy Pro paid-plan output`);
