# Ninth pass of bug scouts (A102, 0.0.13)

The ninth pass read:
- saving and loading;
- the quest's commands, hints and witnesses;
- the sound mix, and what is left behind when play stops or the world is rebuilt.

Each fault was confirmed against the code. All have a test that fails without the fix.

## Saves

| Fault | Fix |
| --- | --- |
| **A save's quest fields were loaded whatever their type.** A numeric `entry` loaded, then crashed the journal. A text `committedAtClock` turned the apply-delay sum into text and passed the check at once. | Each field keeps its own type, or its starting value. |
| **Trust was loaded unbounded**: a saved 99 passed every trust check and was written back. | It is held within the game's -5 to 5. |
| **Evidence counted by presence, of anything.** `{ worker_testimony: 5 }` counted as testimony, and `{ cut_creature: false }` as a defeat. | Only whole evidence records of known evidence are kept, and only won encounters. |
| **A clock before the first day gave new hunting records a negative time**, and the next load dropped those records. | The clock loads at zero or later. |
| **Recovery from a damaged save chose the older backup over the newer verified copy** left by a write cut short. | The newer of the two verified copies is used. |
| **The Load and Save lists showed a recovered save as the slot's own**, with no warning until it was loaded. | The list says the slot was recovered. |

## The quest

| Fault | Fix |
| --- | --- |
| **With the gate jammed, the hint said "Brace it at the sluice" while bracing was refused** for want of the brace, the wrench or an understanding of the crack. The quarry was never named. | The hint leads to whatever is missing first. |
| **Forcing the archive shutter in the waterkeeper's own sight said "You force the shutter and slip inside."** Her report is hers at once, so the shutter was already barred and the ledger out of reach. | It says she bars it at once and the archive is closed to him, and there is no arrival line. |
| **Forcing the sluice gate never asked who saw it**, so the witnessed route (a report to the waterkeeper) could not happen in play. | The witnesses are asked, as at the shutter. |

## Sound

| Fault | Fix |
| --- | --- |
| **The bell's later strikes rang on over the pause menu, the title and a rebuilt world.** | A pause, a quit or a new world cuts the peal off. |
| **After a load, a new journey or a rebuild, a crate last heard flying was heard to land.** | Props' last speeds are forgotten with the actors'. |
| **Ambience or Dialogue at 0 still came through faintly, by way of the rooms' reverb** (it returns on the effects bus). | A sound's reverb send is weighed by its own bus's level against the effects level. A bus at 0 sends nothing, and the wet share is unchanged at full volume. |

## Found sound by the same reads

- **Saves:** saves during a build, while dead or with a panel open are refused. A pending mount is kept. A newer version's save is never overwritten, and a damaged current save is never copied over a good backup.
- **Repeated rewards:** none. Grants, pickups, the settlement, evidence, meat sales and restocks each happen once.
- **Clocks:** report and calm times survive midnight and loads.
- **Listeners and resources:** the menu score, hidden-tab suspension, speech and input listeners are released. So are the GPU resources a rebuild frees.
