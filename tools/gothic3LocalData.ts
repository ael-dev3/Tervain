import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Development only: serve a local Gothic 3 `Data` folder to the `/gothic3-local/` page, so the page can be exercised
 * (and checked in a headless browser) without the folder picker. Set G3_DATA to the folder, e.g.
 *
 *   G3_DATA="C:/Program Files (x86)/Steam/steamapps/common/Gothic 3/Data" npm run dev
 *
 * `GET /__g3data/` lists the archives with their sizes; `GET /__g3data/<file>` serves a file with byte ranges. Only the
 * archive files directly in that folder are served, only by `vite` in serve mode, and only to this machine; nothing is
 * copied, and the production build contains no part of this.
 */
export function gothic3LocalData(): Plugin {
  const dir = process.env.G3_DATA;
  return {
    name: 'gothic3-local-data',
    apply: 'serve',
    configureServer(server) {
      if (!dir) return;
      const archives = (): { name: string; size: number }[] =>
        fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && /\.(pak|p\d\d)$/i.test(entry.name))
          .map((entry) => ({ name: entry.name, size: fs.statSync(path.join(dir, entry.name)).size }));
      server.middlewares.use('/__g3data', (req, res) => {
        const remote = req.socket.remoteAddress ?? '';
        if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(remote)) {
          res.statusCode = 403;
          res.end();
          return;
        }
        let url: string;
        try {
          url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
        } catch {
          res.statusCode = 400;
          res.end();
          return;
        }
        if (url === '/' || url === '') {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ archives: archives() }));
          return;
        }
        const name = url.replace(/^\/+/, '');
        const known = archives().find((a) => a.name === name);
        if (!known) {
          res.statusCode = 404;
          res.end();
          return;
        }
        const file = path.join(dir, known.name);
        const m = /^bytes=(\d+)-(\d+)?$/.exec(req.headers.range ?? '');
        const start = m ? Number(m[1]) : 0;
        const end = m && m[2] !== undefined ? Math.min(Number(m[2]), known.size - 1) : known.size - 1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= known.size) {
          res.statusCode = 416;
          res.setHeader('content-range', `bytes */${known.size}`);
          res.end();
          return;
        }
        res.statusCode = m ? 206 : 200;
        res.setHeader('accept-ranges', 'bytes');
        res.setHeader('content-length', String(end - start + 1));
        if (m) res.setHeader('content-range', `bytes ${start}-${end}/${known.size}`);
        const stream = fs.createReadStream(file, { start, end });
        const stop = (): void => { stream.destroy(); };
        res.once('close', stop);
        stream.once('close', () => { res.off('close', stop); });
        stream.once('error', () => {
          if (res.destroyed || res.writableEnded) return;
          if (res.headersSent) {
            res.destroy();
          } else {
            res.statusCode = 500;
            res.removeHeader('content-length');
            res.removeHeader('content-range');
            res.end();
          }
        });
        stream.pipe(res);
      });
    },
  };
}
