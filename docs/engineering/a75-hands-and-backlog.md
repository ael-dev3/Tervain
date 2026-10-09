# Hands checked in the game, the wanderer's finger joints, and the backlog (A75, 0.0.13)

This record continues [A71](a71-backlog.md) and the A72–A74 pull requests: the hands of the residents and the wanderer
were looked at close up in the running production build, what was wrong there was fixed, and each backlog item is listed
with what is done and what remains open.

All captures below come from the production build served locally (`vite preview`) in headless Chromium with software
rendering (SwiftShader, no GPU) in a cloud container: they show what the game draws, not how fast a real GPU draws it.

## Residents' hands

Every named resident (12, 24 hands) was framed hand by hand at 11:00 in the served build with
`tools/cdp.mjs`. The 31 hands that have finger chains curl as A72 intended (relaxed, open on the work, closed on tool
handles); none tore or folded. Measured on the real skin in a full fist, the worst hand edge stretches 4.3 times its rest
length (ash recorder, right) and 98% of edges stay within 0.38–2.6 times.

- **Fixed: the quill lay over the back of the hand.** A pen runs along the fingers, so A72 left it where the hand frame
  put it, and on the estate steward that frame faced the wrong way: the quill crossed the back of his writing hand, the
  thumb 35 mm and the fingertips 22 mm from it. The residents' fingers bend as one chain and their thumbs (4–6 cm) cannot
  reach the finger pads, so the pen is now held pressed by the fingers against the thumb: it starts just clear of the
  curled fingertips' skin on the thumb side, its nib 3 cm beyond, and runs back along the inside of the thumb, which
  curls to lie along it. In the work pose thumb and fingertips are 1.3–2.9 mm from the shaft (estate steward, quarry
  foreman, ash recorder; `residentFingers.test.ts`).
- **Corrected: the three hands without chains are modelled fists.** Both of the caravan master's hands and the baker's
  left are sculpted closed, with no fingers apart to bend (the code had called the caravan master's "sleeved"). They keep
  their shape. This is a hard limit of those meshes; opening them needs new models.

## The wanderer's finger joints

The A74 body was skinned to the A45 rig's finger chains, which sit 30–50 mm off the new mesh's digits (the thumb 56–83
mm). Each knuckle turned the skin about a point outside the finger, so a grip swung the digits wide and stretched the skin
between them; A73 had already given Thumb1 its skin.

At load ([`hero/fingerFit.ts`](../../src/presentation/hero/fingerFit.ts)) each of the 32 finger joints moves to the
weighted centre of the crease where it takes over from its parent (the vertices both carry at least 15% of), as linear
blend skinning bends best about that point. The inverse binds move with the joints, so the skin stands exactly as
modelled at bind (within 3e-7 m); the joints keep their rest turns, so every clip and grip turns them as before; the
clips' constant finger translations are carried to the new rests. The Meshy source of the body is not in the repository
(31 MB), so the fit is applied to the shipped model rather than baked into a new file.

| Full fist (Boxing_Practice) | A73 | A75 |
| --- | ---: | ---: |
| Worst hand edge | 8.68× | 6.58× |
| 99.9th percentile | 5.76× | 4.52× |
| 99th percentile | 3.25× | 2.56× |
| Half grip, worst | 5.68× | 4.41× |

The worst edges left are 1–2 mm slivers in the webs between fused fingers, which open to about 8 mm in a full fist; the
previous body reached 5.9×. The test holds the worst under 7×. In the served build both hands were framed relaxed, on
the sword's grip and in a fist: they close without tearing.

## Riding

Backing up the saddled deer plays its walk in reverse (it played the forward walk), and its hoofbeats are counted
whichever way the stride runs.

## Downloads before the world opens

Measured in the served build, new game, by the resources started before the game's `tervain:world-open` mark: 57.7 MiB
in 89 requests, of which 46.9 MiB models (A72 reported 58.5 MiB). The largest are the wanderer (7.4 MiB), the near
detail of the trees in view (27 MiB in all; their mid and far files already borrow the near file's images), the title
screen's own backdrop (the menu warden 2.5 MiB and a deer 1.8 MiB) and the resident motion library (1.1 MiB).

- **Lighter:** the title banner's emblem was a 1,254 px, 1.4 MiB PNG painted into a 384 px canvas. It now loads as a
  512 px WebP of 86 KB; the master stays in the repository unchanged and the asset record names both.
- Everything else after entry downloads as before: residents, animals and furniture continue in the background (in the
  software-rendered browser the rest of the cast took several minutes, bound by the CPU decoding its textures).

## Status of the backlog

| # | Item | State |
| --- | --- | --- |
| 1 | Indoor light and sound respect floor and ceiling | Done (A70, TV-B01); re-verified in A75 in the running game with `audits/2026-10-08/reproduce.mjs`. |
| 2 | Bounded recovery for failed building textures | Done (A70, TV-B02); re-verified as item 1. |
| 3 | Controller hints on right-stick look | Done (A70, TV-B03); re-verified as item 1. |
| 4 | Smaller first download, staged loading | Done to 57.7 MiB before entry (A72, A75). Open: the near tree files (they set each tree's scale, collisions and leaf sites). |
| 5 | Fixed-step simulation, interpolated drawing | Done (A72). |
| 6 | Transitions, contact, turns, feet, fingers | Done as recorded in A70–A72 and here. Open: authored turn clips (turns step from each figure's own gait). Hard limit: three modelled-fist hands. |
| 7 | Residents inhabit interiors | Done (A70). |
| 8 | Hunting, respawn, encounters, progression, riding | Done (A70, A71; reverse walk here). |
| 9 | Close-up quality and grit | Partly: crowns (A72), interior windows (A70), floor shadows without a shadow map (A70), the quill (A75). Hard limit: a shadow-casting hearth light exceeds the richest materials' texture units. Grass: cutting its light-through by 30% and its sheen by 40% made no measurable difference in a backlit view (mean colour 77, 62, 39 before, 76, 62, 38 after), so it was left as it is; which views read as glossy needs naming. |
| 10 | Performance evidence | A71/A72 figures on a development GPU stand; this container has no GPU, so A75 adds no frame-time figures. |
| 11 | Asset ledger | 20 Meshy sources generated by Ael under Meshy Pro (the A74 body included), 54 unresolved, no commercial clearance claimed. Resolving the 54 needs Ael's own records. |
| 12 | Hero rework polish | Finger joints seated (above); thumb skin (A73). |

Meshy credits: none spent in A75 (no API key in this environment). Totals stay as recorded: trees and fingers 30 of 100,
hero 35 of 200.
