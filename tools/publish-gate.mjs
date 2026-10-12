#!/usr/bin/env node
/**
 * Publish a play-gate run to the live GPU log (issue #320) so the frame data and the spikes' stills can be read without
 * running the gate again.
 *
 *   node tools/publish-gate.mjs --tag <tag> [--clips <recorded tag>] [--latest] [--out play-gate-runs] [--issue 320] [--dry]
 *
 * The run's spike stills and clips go to the `gate-media` branch (one folder per tag; the branch holds media only and
 * starts no workflow), then `<tag>-log.md` is posted as a comment with its MEDIA/ links pointing at them.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).join(' ').split(/\s*--/).filter(Boolean).map((a) => { const [k, ...v] = a.split(' '); return [k, v.join(' ') || true]; }));
if (!args.tag) { console.error('usage: publish-gate --tag <tag> [--out dir] [--issue n] [--dry]'); process.exit(2); }
const OUT = path.resolve(args.out ?? 'play-gate-runs'), TAG = args.tag, ISSUE = String(args.issue ?? 320), BRANCH = 'gate-media';
let log = fs.readFileSync(path.join(OUT, `${TAG}-log.md`), 'utf8');
// Timing runs record no video (the recording costs frames); --clips names a recorded run of the same build whose clips
// stand in for them.
if (args.clips) log = log.replace(/^Clip: none$/gm, '').replace(/^(#### (\w+) .*)$/gm, (line, _, profile) => `${line}\n\nClip (recorded run): MEDIA/${args.clips}-${profile}/clip.mp4`);
// Timing runs take no stills either; the recorded run's stills of its slow frames are listed after the timing data.
if (args.clips) {
  const recorded = path.join(OUT, `${args.clips}-log.md`);
  const stills = fs.existsSync(recorded) ? fs.readFileSync(recorded, 'utf8').split('\n').filter((l) => /^- .*MEDIA\/.*\.jpg$/.test(l)) : [];
  if (stills.length) log += `\n#### Stills of slow frames in the recorded run (${args.clips})\n\n${stills.join('\n')}\n`;
}
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const remote = git('.', 'remote', 'get-url', 'origin');
const repo = remote.replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');

// Gather the media the log names.
const files = [...log.matchAll(/MEDIA\/([^\s)]+)/g)].map((m) => m[1]).filter((f, i, a) => a.indexOf(f) === i);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-media-'));
try {
  git(work, 'init', '-q');
  git(work, 'remote', 'add', 'origin', remote);
  let have = true;
  try { git(work, 'fetch', '-q', '--depth', '1', 'origin', BRANCH); } catch { have = false; }
  if (have) git(work, 'checkout', '-q', '-b', BRANCH, 'FETCH_HEAD'); else git(work, 'checkout', '-q', '--orphan', BRANCH);
  for (const f of files) {
    const from = path.join(OUT, f), to = path.join(work, TAG, f);
    if (!fs.existsSync(from)) { console.warn(`missing ${f}`); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  // A timing run without a recorded run has no media; it is posted without a media commit.
  let sha = '';
  if (fs.existsSync(path.join(work, TAG))) {
    git(work, 'add', '--', TAG);
    git(work, '-c', 'user.name=play-gate', '-c', 'user.email=play-gate@users.noreply.github.com', 'commit', '-q', '-m', `Gate media for ${TAG}`);
    sha = git(work, 'rev-parse', 'HEAD');
    if (!args.dry) git(work, 'push', '-q', 'origin', `HEAD:refs/heads/${BRANCH}`);
  }
  // Links pinned to the commit, so a later run never changes what an old comment shows.
  const body = log.replace(/MEDIA\/([^\s)]+)/g, (_, f) => `https://raw.githubusercontent.com/${repo}/${sha}/${TAG}/${f}`)
    .replace(/(https:\/\/raw\S+\.jpg)/g, (u) => `[still](${u})`).replace(/(https:\/\/raw\S+\.mp4)/g, (u) => `[clip](${u})`);
  const bodyFile = path.join(work, 'body.md');
  fs.writeFileSync(bodyFile, body);
  // --latest: also write the run to docs/perf/LATEST.md, the copy read from a clone (it is committed through a PR).
  if (args.latest) {
    const file = path.resolve('docs/perf/LATEST.md'), old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const intro = old.includes('\n## Run ') ? old.slice(0, old.indexOf('\n## Run ') + 1) : '# Latest GPU play-gate data\n\n';
    fs.writeFileSync(file, intro + body.replace(/^### /, '## Run '));
  }
  if (args.dry) console.log(body);
  else console.log(execFileSync('gh', ['issue', 'comment', ISSUE, '--repo', repo, '--body-file', bodyFile]).toString().trim());
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
