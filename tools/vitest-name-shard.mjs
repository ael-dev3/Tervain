#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const [, , fileArg, shardArg] = process.argv;
if (!fileArg || !/^\d+\/\d+$/.test(shardArg ?? '')) {
  console.error('usage: node tools/vitest-name-shard.mjs <test-file> <index>/<total>');
  process.exit(2);
}

const [indexText, totalText] = shardArg.split('/');
const index = Number(indexText);
const total = Number(totalText);
if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total) {
  console.error(`invalid shard: ${shardArg}`);
  process.exit(2);
}

const file = fileArg.replaceAll('\\', '/');
const listed = spawnSync('npx', ['vitest', 'list', file], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1', CI: process.env.CI ?? '1' },
});
if (listed.status !== 0) {
  process.stderr.write(listed.stderr);
  process.stderr.write(listed.stdout);
  process.exit(listed.status ?? 1);
}

const names = [];
for (const line of listed.stdout.split(/\r?\n/)) {
  const marker = ' > ';
  const at = line.indexOf(marker);
  if (at < 0) continue;
  const listedFile = line.slice(0, at).replaceAll('\\', '/');
  if (path.normalize(listedFile) !== path.normalize(file)) continue;
  const name = line.slice(at + marker.length).trim();
  if (name) names.push(name);
}
if (names.length === 0) {
  console.error(`no tests listed for ${file}`);
  process.exit(1);
}

const selected = names.filter((_, zeroBased) => zeroBased % total === index - 1);
if (selected.length === 0) {
  console.error(`shard ${shardArg} selected no tests from ${names.length}`);
  process.exit(1);
}
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
process.stdout.write(`^(?:${selected.map(escapeRegExp).join('|')})$`);
