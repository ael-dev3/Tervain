# Idle spray compiled-build repro

Serve the baseline production build and then the patched production build. Run the same script against each:

```sh
node tools/repro-idle-spray.mjs --url <baseline-build-url> --expect before --out before.json
node tools/repro-idle-spray.mjs --url <patched-build-url> --expect after --out after.json
```

The script constructs a fresh spray pool using the served application's compiled constructor. It initializes the hidden pool, advances 120 idle frames, emits droplets, lets every droplet expire and advances another 120 idle frames. Assertions require visible emission, final zero fades, unchanged 9600-byte dirty requests during emission, and the expected idle requests before/after. No parallel game updates touch the isolated pool.

Byte counts are attribute-version increments multiplied by attribute-array bytes: deterministic requested uploads, not measured driver transfers or GPU frame timing. Both builds retain identical active emission and clearing behavior. The report stamps the served artifact revision. This is a nonvisual upload optimization; screenshots cannot establish dirty-buffer behavior.

Compiled-build receipts: [before](idle-spray-proof/before.json) requests 1,152,000 bytes across each 120-frame idle interval; [after](idle-spray-proof/after.json) requests zero. Both request 9600 bytes for emission, show live droplets and clear all fades after expiry.
