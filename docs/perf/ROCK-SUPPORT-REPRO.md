# Compiled rock-support repro

Serve the baseline and patched production artifacts:

```sh
node tools/repro-rock-support.mjs --url <baseline-build-url> --expect before --out before.json
node tools/repro-rock-support.mjs --url <patched-build-url> --expect after --baseline before.json --out after.json
```

The script invokes the served terrain's actual support-class constructor. A 200-triangle immutable fixture counts coordinate reads after registration, requiring the same support height and 1800 reads before versus nine after. It then queries a 20×20 grid across an actual delivered 5220-triangle rock and records hit count, summed support heights and a SHA-256 digest of all 400 results. The patched run must match the baseline source results exactly.

These are compiled-build query results and work counts, not GPU frame-time measurements. Registration is outside the read counter; the PR's documented initialization/memory tradeoff still applies. No rendering or collision geometry changes.
