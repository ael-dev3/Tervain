# Idle quarry dust uploads

The world wrote all 90 quarry dust positions and marked the position buffer dirty every update, even after all particles had expired. That uploaded 1,080 unchanged bytes on each subsequent render.

The change remembers whether the previous update drew any live particles. Initial positions and the final expired particles are cleared once; after that, idle updates leave the buffer alone. Emission still resumes position writes normally. The points remain visible for shader warmup, and particle simulation and draw count are unchanged.

## Native compiled-build proof

```sh
node tools/repro-idle-quarry-dust.mjs --url "$BEFORE_URL" --expect fresh --out before-proof
node tools/repro-idle-quarry-dust.mjs --url "$AFTER_URL" --expect reused --baseline before-proof/report.json --out after-proof
```

The probe starts the actual build in Chrome software WebGL. It calls the compiled world update and renders the actual dust object in isolation, counting `bufferData`/`bufferSubData` source bytes. Emission is controlled: warmup, 60 idle updates, one moving particle through expiry, 30 further idle updates, then a second particle through restart/expiry. Every position and lifetime is captured after each update.

| Counter | Before | After |
| --- | ---: | ---: |
| Idle updates | 90 | 90 |
| Idle position-version changes | 90 | 0 |
| Idle buffer upload bytes | 97,200 | 0 |
| Non-idle upload bytes, including warmup | 27,000 | 17,280 |
| Position/lifetime snapshot hash | `280ffa3e5265b722ce835a064999bbeff43cc574b225f7f087b9588cd06bde46` | identical |

Receipts: [before](quarry-dust-proof/before.json), [after](quarry-dust-proof/after.json). The before build was compiled from the grass-history candidate subsequently committed as `913b7e23b`; its dust code was unchanged from `0b45a36a0`. The after build is `62af8c8d1`. Optional `--driver` selects a CDP launcher; both runs used the isolated launcher from #397.

Production build/type check and 111 existing world-loading, world-audio and foliage tests passed. This controlled probe uses Low for software-renderer startup. It measures one buffer's idle waste, not the complete game's uploads, hardware frame time or garbage collection. It does not attribute any recorded hitch to the dust system. The existing 90-point draw remains unchanged.
