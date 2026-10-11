# Fourth pass of bug scouts (A95, 0.0.13)

The fourth pass reread two areas:
- rendering, audio and loading;
- saving and loading, with every field of the game state given a non-default value and round-tripped.

The saved state itself came back exactly. The faults were in what the game rebuilds around it, and in rendering and
audio. Each was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## Rendering and loading

| Fault | Fix |
| --- | --- |
| **The shrine hall's painted panes showed one view in every direction.** The capture drew its six faces itself but never aimed them, and all six looked the same way. *(test)* | The capture aims its faces as the renderer expects before drawing them. |
| **The content cache lost the furniture, the animals and the later residents on every visit.** Its pruning ran as the world opened, before those were asked for, so they were deleted and downloaded again next time. | Pruning waits until what follows the world in has arrived. Checked in the served build: a second journey downloaded no models (the first downloaded 129 MiB), and all 139 cached entries stayed. |
| **The water's reflection stand-ins for the trees were never released**, so each graphics change or load kept the renderer's state for them. *(test)* | They are released with the world, without the vertex data they share with models that outlive it. |
| **After about four and a half hours, only the most recently struck tree shook.** The slot for a new strike was chosen by raw time stamps, which wrap with the shader clock. *(test)* | The slot struck longest ago is chosen by its age, read across the wrap. |

## Sound

| Fault | Fix |
| --- | --- |
| **A sound bank that failed to load was fetched and decoded again on every cue**: every footstep and every swing. *(test)* | It waits before trying again, longer after each failure, as the ambient beds already did. |
| **An inn song whose fallback also failed stood silent, and no other song followed.** | It counts as ended. |

## Loading a save

| Fault | Fix |
| --- | --- |
| **A save made beside a bandit post made that post the respawn point**, a death loop. *(test)* | A load follows the checkpoint rule: away from foes and their posts the loaded place serves, otherwise the strand. |
| **A new run or a load kept the last run's day or night**, so the hero said "dawn" or "night" on arrival. The once-only dawn line was then used up. *(test)* | Day and night are judged afresh. |
| **A load kept the archive's occupancy from before it**, which could show a false "sealed" message. *(test)* | Occupancy is read from where the load puts the player. |
| **A load kept the hero's exhaustion and the deer's spent wind.** *(test)* | A load starts rested. |

## Not changed

- **A partial outage of the baked surfaces can keep two copies of some bitmaps** until the next build. This is rare, and
  memory only.
- **Ground pixels fetched ahead for one quality** are held after a quality change until a build at that quality.
- **Loading a save at low health from a healthy session plays the "wounded" line at once.** This may well be intended.

## Found sound by the same reads

- **Saved state:** every field round-trips exactly.
- **Rebuilt on load:** doors, the shutter, the gate, the lever and the brace snap; props, animals and carcasses come
  back; residents and enemies are restored; the hero's weapon, the map and the hotbar redraw.
- **Cleared on load:** input, speech, captions, hit-stop, timers, arrows, channels and mounting.
- **Downloads:** in-flight sharing, retry and stall rules, cache-hit verification, and every model loader's recovery
  from failure.
- **Image pipeline:** the grade, the water pass, the sky capture, ripple and trample targets, shadows and interior light.
- **Audio:** bus routing, volumes, mute and hidden pages, the menu score, hunting audio, the sound world's voices and
  streams, and caption clearing.
- **Settings:** brightness and quality reach every path.
