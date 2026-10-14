# Grass cargo-motion allocation reuse

Every grass interaction update requests all nine loose-cargo motions. The former `motions()` call constructed a new output array and one plain motion record per prop, even for sleeping cargo. Grass now owns a reusable output buffer. Calls without a buffer still return independent snapshots, including the audio caller.

## Native before/after comparison

`tools/repro-prop-motion-buffer.mjs` loads the baseline physics implementation from published revision 9ab40b3 and the candidate into two native Rapier worlds. Across 600 updates it compares all 5,400 motion records exactly, using variable timestep cadence, impulses, rotation, held-state changes, sleeping, restore and reset.

| Plain output objects for the grass caller | Baseline | Candidate |
| --- | ---: | ---: |
| Arrays across 600 updates | 600 | 1 |
| Motion records across 600 updates | 5,400 | 9 |
| Changed motion values | 0 | 0 |

Retained default snapshots remain unchanged. Reusing an oversized output truncates it to the prop count; sleeping bodies clear previously active velocity values. [Native receipt](proofs/grass-prop-motion-buffer/native.json).

These counts cover plain output arrays and motion records only. Native physics return wrappers, other grass mover records, total heap allocations and hardware frame times are not measured.

```sh
node tools/repro-prop-motion-buffer.mjs outputs/prop-motion-buffer.json
node tools/repro-grass-prop-motion-buffer.mjs "$BUILD_URL" outputs/grass-prop-motion-buffer
npx vitest run tests/presentation/propMotionBuffer.test.ts
```

The software-rendered check exercises the built world's actual grass caller and compares its cargo motions with independent native snapshots. Its screenshot is a correctness capture, not a Mac performance gate.

Built-world software proof: 120 grass updates compare 1,080 records exactly, using one array and nine records. Default snapshots remain unchanged after grab/throw. [Receipt](proofs/grass-prop-motion-buffer/software.json) / [scene](proofs/grass-prop-motion-buffer/scene.png). The production build/type-check and three focused cargo tests pass. Hardware play-gate and live deployment remain pending.
