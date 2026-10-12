import fs from 'node:fs';
import path from 'node:path';

/** Preserve missing measurements as missing; a Retina-sized profile is not an Apple GPU measurement. */
export function writeLatestPerf(report, target = 'docs/perf/LATEST.md', artifactBase = '') {
  const value = x => x === null || x === undefined ? 'not measured' : x;
  const rows = [];
  const details = [];
  for (const r of report.results) {
    const s = r.stats;
    rows.push(`| ${r.name} | ${s ? r.failures.length ? 'FAIL' : 'PASS' : 'not run'} | ${value(s?.median)} | ${value(s?.p95)} | ${value(s?.p99)} | ${value(s?.max)} | ${s ? (s.slowShare * 100).toFixed(2) + '%' : 'not measured'} | ${value(s?.idlePercent)} | ${value(s?.uploadBytes)} |`);
    details.push(`### ${r.name}`, '', `Glitches: hidden with camera clear ${value(s?.hidden)}; broken pose ${value(s?.badPose)}; screen jumps ${value(s?.jumps)}.`, '');
    for (const spike of s?.slowFrames ?? []) details.push(`- ${spike.ms.toFixed(2)} ms at ${spike.time.toFixed(2)} ms, phase ${spike.phase}`);
    if (!s?.slowFrames) details.push('Spike context: not measured in this report.');
    else if (!s.slowFrames.length) details.push('No frames over 25 ms.');
    details.push('', r.clip && artifactBase ? `Clip: ${artifactBase.replace(/\/$/, '')}/${path.basename(r.dir)}/clip.mp4` : 'Clip: not published (retain the local gate artifact and publish its URL).', '');
  }
  const md = [`# Latest GPU play gate`, '', `Run: ${report.tag}. Build: ${report.stale?.live?.version ?? 'unknown'} · ${report.stale?.live?.revision ?? 'unknown'}. Result: ${report.pass ? 'PASS' : 'FAIL'}.`, '',
    'The Mac profile is a Retina-sized viewport on the gate machine; it does not establish Apple GPU performance. Idle % and upload bytes are not collected by the current gate and remain explicitly unmeasured.', '',
    '| Profile | Result | p50 ms | p95 ms | p99 ms | Max ms | >25 ms | Idle % | Upload bytes |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |', ...rows, '', ...details,
    'Source: the current local tools/play-gate.mjs run. Publish its JSON, samples and clips with the PR/live review. Refreshes are evidence files; they do not authorize a merge or commit to main.', ''];
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, md.join('\n'));
}
