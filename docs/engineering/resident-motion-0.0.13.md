# Resident motion correction — 0.0.13

Residents now walk between their scheduled places regardless of distance from
the player. A failed route leaves them waiting with still feet and triggers
a bounded retry; it cannot teleport them or start a work gesture away from
the actual workstation. The final approach to a doorway uses the same
terrain and finite-body sweep as ordinary travel.

Walking eases into movement, slows at its destination and turns through
checked corners. Gait advances only with resolved metres and retains its
phase during stops, conversation and obstruction. Moving residents see the
current positions of other people, wildlife and the player. They can pass
a visitor in an open lane, wait at an occupied doorway, and leave shared
sleeping quarters in turns. Shared conversation anchors have distinct
collision-checked standing positions; work surfaces and seated anchors
retain their authored placement.

Conversations reserve both participants but speaking gestures belong only
to the current voiced turn. Listeners face the speaker without continually
waving their arms. Seated speech preserves the seat, lower-body pose and
caption/voice height. Brief idle gestures return to a relaxed stance; work
and conversation transitions limit joint and hip velocity. The imported
Meshy sole-clearance correction releases smoothly without moving the
physical controller root.

The three ambient coastal residents start in their intended posture and
use local activity clocks that pause with the game. The fireside resident
is aligned with the actual bench and remains seated while conversing.
Their contacts have finite, stature-specific height rather than blocking
all space above them.

Bandits and the Thornback pursue and return through the walkable grid.
The Thornback has a cached grid for its larger body, prepared while the
world loads. Swept finite-body movement also covers lunges and recoil;
an unreachable return remains a retrying wait instead of abandoning the
post. Combat timings, damage, reach, parries and the approved hero clips
retain their existing behavior.

## Evidence

The schedule regression walks every named resident through all active
routines on actual terrain, buildings, forest landmarks, trees, scatter,
ambient contacts and the hunter station. Five world states cover the
original valley, both Ila rescue methods, the emergency meeting and the
rotation allocation. Each of the sixty cases checks exact arrival,
sleeping state, body clearance and a bounded displacement on every step.
Two further cases walk Ila's real rescue exits, and a simultaneous full-cast
case checks dawn, evening and night with current resident contact snapshots.
Another case obstructs Ila's partially completed maintenance route, refreshes
navigation and verifies a safe quarry-side reconnect without returning to the
ledge. Together these provide sixty-four actual-world schedule scenarios.
Additional tests cover failed routes, blocked feet, passing, shared
doors, listening, seat support and refresh-rate independence.

Hostile tests use real colliders and navigation to verify a thin-fence
detour and return at 30/60/120 Hz, a wider creature route, gate reopening,
overhead clearance, living-body contacts and swept lunges. Existing
combat and locomotion regressions remain in place.

The production-poser CPU audit loads all seventeen delivered NPC GLBs,
checks complete equipped triangle counts, and samples 18,319,548 posed
vertices and 27,540 transition frames. It verifies finite geometry,
bounded peaceful transitions, seated speech support, return to standing
and unchanged source templates. Browser image decoding is replaced for
that numerical audit; native rendering is reviewed separately.

No model, texture, voice or music binary is changed by this correction.
The existing 50,000-triangle actor budget and model-rights records remain
in effect. These are procedural animation improvements, not motion-capture
or full foot IK.

A63 later fitted the hanging arms, gestures, seats and work poses to each resident's body, refitted the elbows and
knees, blended the skin as rigid motions and gave four trades their tools; see the
[resident record](residents-0.0.13.md).
