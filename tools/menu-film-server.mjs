#!/usr/bin/env node
/** Local-only, streaming recorder receiver; no credentials, browser automation, or external services. */
import { mkdir, open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Recordings are intentionally outside the source repository and never part of its production bundle.
const outputDir = resolve(process.env.TERVAIN_MENU_FILM_OUTPUT || resolve(root, '../tervain-menu-film-output'));
const port = Number(process.env.TERVAIN_MENU_FILM_PORT || 5180);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local recorder port.');
const origin = `http://127.0.0.1:${port}`;
const MAX_CHUNK = 24 * 1024 * 1024;
const MAX_TOTAL = 1024 * 1024 * 1024;
let active = null;
let lastResult = null;

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}

async function body(req, limit) {
  const pieces = [];
  let length = 0;
  for await (const piece of req) {
    length += piece.length;
    if (length > limit) throw new Error('Recording request exceeds the local receiver limit.');
    pieces.push(piece);
  }
  return Buffer.concat(pieces, length);
}

const server = await createServer({
  root,
  server: { host: '127.0.0.1', port, strictPort: true },
  plugins: [{
    name: 'tervain-local-menu-film',
    configureServer(vite) {
      vite.middlewares.use('/__menu_film', async (req, res) => {
        try {
          if (req.method === 'GET' && req.url === '/status') {
            return json(res, 200, { recording: !!active, bytes: active?.bytes ?? 0, lastResult });
          }
          if (req.method !== 'POST' || req.headers.origin !== origin) {
            return json(res, 403, { error: 'Only this local recorder page may write a film.' });
          }
          if (req.url === '/start') {
            if (active) return json(res, 409, { error: 'A recording is already active.' });
            const options = JSON.parse((await body(req, 2048)).toString('utf8'));
            if (options.kind !== 'test' && options.kind !== 'full') throw new Error('Unknown recording kind.');
            const id = randomUUID();
            const filename = `${options.kind === 'test' ? 'test-motion' : 'menu-motion'}-${id}.webm`;
            await mkdir(outputDir, { recursive: true });
            const path = resolve(outputDir, filename);
            const handle = await open(path, 'wx');
            active = { id, path, handle, bytes: 0, chunks: 0, busy: false };
            return json(res, 200, { id, path });
          }
          const id = req.headers['x-menu-film-id'];
          if (!active || id !== active.id) return json(res, 409, { error: 'No matching active recording.' });
          if (active.busy) return json(res, 409, { error: 'Chunks must be uploaded serially.' });
          if (req.url === '/chunk') {
            const session = active;
            session.busy = true;
            try {
              const piece = await body(req, MAX_CHUNK);
              if (session.bytes + piece.length > MAX_TOTAL) throw new Error('Recording exceeds the 1 GiB receiver limit.');
              let offset = 0;
              while (offset < piece.length) {
                const result = await session.handle.write(piece, offset, piece.length - offset, null);
                if (!result.bytesWritten) throw new Error('The local receiver could not write a recording chunk.');
                offset += result.bytesWritten;
              }
              session.bytes += piece.length;
              session.chunks++;
              return json(res, 200, { bytes: session.bytes, chunks: session.chunks });
            } finally {
              session.busy = false;
            }
          }
          if (req.url === '/end' || req.url === '/abort') {
            const session = active;
            await session.handle.sync();
            await session.handle.close();
            lastResult = { id: session.id, path: session.path, bytes: session.bytes, chunks: session.chunks, complete: req.url === '/end' };
            active = null;
            return json(res, 200, lastResult);
          }
          return json(res, 404, { error: 'Unknown recording endpoint.' });
        } catch (error) {
          return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  }],
});

await server.listen();
console.log(`Local menu recorder: ${origin}/tools/menu-film.html`);
console.log(`Video chunks stream directly to ${outputDir}`);
const shutdown = async () => {
  if (active) {
    await active.handle.close();
    active = null;
  }
  await server.close();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
