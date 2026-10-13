# Isolate concurrent software-browser checks

The CDP driver selected a random debug port from 500 possibilities and immediately polled it. If another browser already used that port, the driver could connect to that browser's page and navigate/control it instead of its own launch. Concurrent checks could interfere and return misleading failures or evidence.

Chrome now selects an OS-assigned port. The driver reads `DevToolsActivePort` only inside its own unique temporary profile, then polls that endpoint. Partial/malformed files are retried; no unrelated port is probed. Startup remains bounded and the existing process-tree cleanup is preserved. Rendering flags and game code do not change.

## Native before/after

The reusable repro forces the old random selector to choose the same initially free port for two owned launches. Each page receives a distinct fixture marker and requests software WebGL.

- [Before](cdp-isolation-proof/before.json): both handles read fixture two. Creating the second page overwrote fixture one; isolation failed.
- [After](cdp-isolation-proof/after.json): the first handle still reads fixture one and the second reads fixture two. Both have WebGL; isolation passes under the same forced selector.

This is a deterministic native reproduction of the port-collision bug, not a claim that it caused every prior startup failure. No actual browser endpoint IDs, session links or profile paths are recorded.

## Reproduce

```sh
node tools/repro-cdp-page-isolation.mjs --out cdp-page-isolation-proof
```

To reproduce the old behavior with the same script:

```sh
git show 0b45a36a0:tools/cdp.mjs > cdp-before.mjs
node tools/repro-cdp-page-isolation.mjs --driver ./cdp-before.mjs --expect collision --out cdp-before-proof
rm cdp-before.mjs
```

The script fails unless the expected isolation/collision result and WebGL availability are observed. Eight unit tests pass for owned-port parsing and protocol requests, including partial files, Windows newlines, invalid ranges, request failures and disconnect cleanup. Native headless before/after checks pass. This is infrastructure evidence, not hardware frame-time or visual-quality evidence.
