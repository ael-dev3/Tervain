# Build version and promotion gate

Status: **owner-established hold on the `0.0.x` line; proposed quality evidence for promotion.**

The current package version is `0.0.7`, which reworks the menu's hermitage (A32; implemented and locally reviewed in a pull request, publication pending, as recorded in the [0.0.7 notes](releases/0.0.7.md)). The owner asked for 0.0.7, so there is no separate 0.0.6 build. The playable game is the `0.0.5` revision, integrated and locally validated, with source published in the repository and public Pages hosting unavailable (404), as recorded in the [0.0.5 handoff](releases/0.0.5.md). Keep subsequent development builds in `0.0.x`. Do not promote to `0.1.0` until the game has crossed its quality threshold and the owner approves that promotion. Vite rejects versions outside `0.0.x` and rejects a mismatched lockfile, so dev, test, and production builds cannot silently drift to `0.1`.

`package.json` is the version source. The running title screen, debug/benchmark reports, and save build stamp use the same injected package version. Do not maintain separate hand-edited runtime version strings. Save schema compatibility remains controlled by `SAVE_FORMAT_VERSION`; the stable content identifier is separate, and changing the visible build number does not itself invalidate an existing save.

The browser app is the only current game build target. `npm run dev`, `npm run build`, and `npm run preview` use the same version; the Pages workflow builds the guarded `dist/` artifact, but public deployment currently returns 404. There is no desktop package or separate release artifact to version yet.

## Proposed evidence for 0.1.0

These criteria are proposals until the owner accepts or revises them. Passing automated checks alone is insufficient.

- Complete the coherent 30–45 minute slice with its [vertical-slice acceptance scenarios](vertical-slice.md) passing. Core interactions must be present in the build being judged.
- Resolve critical and high-priority defects that break progress, controls, or save/reload. Record the remaining known limitations and verify them against a release candidate.
- Review art, animation, audio, interface, and readability together in the playable game; the owner accepts the result as meeting the intended quality bar.
- Run and record an independent playtest, then resolve the major comprehension and usability findings.
- Package the game for the selected desktop target and record compatibility and performance on a named reference machine with its settings and procedure.

The current browser prototype does not yet meet this proposed gate: it still contains prototype geometry and performance has not been measured on a reference machine. Keep it on `0.0.x` until the evidence exists and the owner approves promotion.
