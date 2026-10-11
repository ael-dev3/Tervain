# Fifth pass of bug scouts (A96, 0.0.13)

The fifth pass reread two areas:
- the interface's text, key labels, panels and accessibility, with every text template checked against its callers by
  script;
- the living world: the animals, hunting, and who speaks when.

Each fault was confirmed against the code. Those marked *(test)* have a test that fails without the fix.

## The interface

| Fault | Fix |
| --- | --- |
| **The meat sale promised two coins whatever the hunter's rank**, while the sale paid up to five. *(test)* | The prompt names the price paid at the rank reached. The field notes say the price rises. |
| **Counts were never singular**: "1 arrows", "Trade 1 hide for 1 arrows". *(test)* | Text can now take a singular and a plural form, and the arrow and coin counts use it. |
| **Begun from a controller, the arrival hint mixed keyboard and pad**: "W to walk · Click the view to look · A to inspect". *(test)* | A controller gets its own hint, naming the sticks. |
| **Some keys the rebind screen accepts showed as code names**: "ControlRight", "Mouse3", "BracketLeft", "Numpad5". *(test)* | Every such key reads as its keycap: "Right Ctrl", "Back button", "[", "Num 5". |
| **A screen reader never heard what a key was bound to**: each button was named only "Jump 1". | Each button's name includes the bound key, and "press a key" while rebinding. |
| **On the Pause row, the rebind hint said Escape cancels**, though there Escape is a key to bind. *(test)* | That row's hint leaves Escape out. |
| **The journal's tabs read "Observed3".** | They read "Observed 3". |

## The living world

| Fault | Fix |
| --- | --- |
| **An overheard scene started over the hero's remark**: reaching the quarry, the men's talk began while he was still speaking. *(test)* | A scene begins once the hero has finished. |
| **A resident's bark talked over the player's conversation, and two barks overlapped.** *(test)* | A bark waits for any conversation and any other resident's line. |
| **A once-only remark of the hero's could be lost for good.** It was dropped after waiting 20 seconds behind a conversation, or when a panel opened in the second before it. Its moment (a first sight of a place, say) never comes again. *(test)* | A once-only remark waits as long as it must, and outlasts a panel, a hidden page or a fall. A load still lets it go. |
| **Game cornered at the edge of its range froze**, watching from a few metres while it was shot, then went back to grazing beside the hunter. *(test)* | It breaks round him, to the place in its range farthest from him. While still alarmed it stays on watch rather than grazing. |
| **A stag's carcass could not be skinned from its antler side.** Its knife position lay beyond the reach that the prompt and the command allow, and the prompt vanished as the player walked to it. *(test)* | The knife position stays within reach of the carcass from every side. |
| **The sleeping cat woke to call** whenever its timer ran out at night. *(test)* | It calls only when awake. |
| **A healed or returning animal could settle in front of the hunter**: about 30 m off, where it was meant to return out of his sight. *(test)* | It settles at the place in its range farthest from him. |

## Followed up (A98)

- **The map's "Show place" and "Pin place" stayed enabled with no place chosen, and did nothing.** They are now
  disabled until a place is chosen. *(test)*
- **The licence links in the About panel could not be reached with a controller.** They can now.
- **An unused dialogue view** is removed.

## Not changed

- **Hotbar slot labels read 1 to 0 even when a digit is bound to another action.** The number-pad key with the same
  number still uses the slot, so the label stays true.

## Found sound by the same reads

- **Text:** all 620 text templates against every caller; no missing or misnamed parameters.
- **Rebinding:** a pending rebind is cleared on every panel change; swaps work.
- **Live key labels:** prompts follow rebinds every frame.
- **Controller navigation:** sliders, grids, tabs and the failure screens.
- **Disabled controls:** they are guarded.
- **Numbers:** bars are clamped; save dates are guarded.
- **Speech:** every line exists, is voiced and belongs to its speaker. Exchanges queue in turn. Sleeping, absent and
  unarrived residents stay quiet.
- **Animals:** they keep to their ground, habitat and range. Carcasses cannot vanish while being skinned. Return timers
  are right across loads. Herd alarms reach only their own kind. The ridden deer hands over cleanly.
