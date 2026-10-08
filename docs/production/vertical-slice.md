# First complete playable: Bellwether Vale

Status: **proposed scope and acceptance brief**. The earlier browser prototype established renderer-free story systems. The current `0.0.5` forest-arrival pass removes conversation windows and focuses on exploration; it does not offer the full negotiation interface or meet the acceptance table below. See [prototype notes](../engineering/prototype.md) for what is implemented, retained, placeholder, and unmeasured. Foundation dated 29 September 2026.

## Purpose

Prove that Tervain can combine a lush explorable landscape, satisfying direct character control, believable residents, faction disagreement, and a visible persistent consequence in one small desktop build.

The player enters **Bellwether Vale**, reaches the village of **Rillford**, and becomes involved in **The Dry Bell**. A damaged waterway threatens irrigation, quarry work, and the protected spring habitat. The player investigates, stabilizes what can be repaired, and helps establish an allocation with understandable winners, costs, and obligations.

The proposed first pass is **30–45 minutes**. A developer can replay important branch states much faster through a test harness. This is a slice-duration hypothesis, not a whole-game length promise.

## Playable geography

| Place | Experience to prove |
| --- | --- |
| Sparse strand, Deepwood trail, inland waystation and overlook | Amnesiac environmental introduction, canopy-depth traversal, landmark orientation, and safe first movement before Rillford. A27 establishes this opening; detailed history remains proposed. |
| Rillford | Daily routines, dialogue, service/training, evidence of water shortage. |
| Spring shrine and wetland | Templar work and belief expressed through place, ecological stake, utility interaction. |
| Damaged sluice | Readable physical problem, inspection, repair/stabilization and changed water presentation. |
| Quarry | Work and contracts, foreman's perspective, a rescue/access problem. |
| Ford and side path | Meaningful route choice, one encounter, visible navigation consequence. |

Use one connected compact exterior with at most two small accessible interiors. (Superseded by A66: every building can now be entered.) Distant mountains, forest masses, and a road beyond the border can imply the larger setting without playable second regions. Authored line-of-sight and travel time determine useful size; no kilometer target is set before walking the graybox.

## Content cap

- One main quest: The Dry Bell.
- Two short supporting encounters: a stranded maintenance worker and the old maintenance/rotation record. They inform the main problem; neither becomes a separate campaign.
- At most twelve named residents, with four principal quest actors: Mara Venn, Sister Edda Sorn, Darin Kest, and Ila Rusk.
- Three represented local interests: the Hearth League village, Templar spring stewardship, and a quarry under a Marcher contract. Other factions can appear through one bounded secondary voice or a piece of trade context.
- One player body/rig for production testing; final customization remains open.
- One melee weapon kit and one utility rite. The player starts unarmed and finds the weapon in the world (A31, P16). A second weapon class is optional only after the required experience works.
- One hostile humanoid archetype and one creature family, reused thoughtfully; no boss or large siege requirement.
- One limited service/training interaction, a useful item reward, and a small inventory.
- One day/night transition with a few readable work/rest changes. Heavy weather is optional polish.
- Three authored allocation outcomes after stabilization, as specified in [quest design](../design/quests-and-consequences.md).

These are caps to protect learning and polish. Cutting a decorative feature is preferable to leaving a broken interaction or an incoherent ending.

## Intended player sequence

1. Arrive with control quickly, notice the dry warning bell and the working settlement.
2. Hear a concrete request and learn that several parties need the same limited water.
3. Walk to the relevant places, encounter one manageable threat, and discover physical and recorded evidence.
4. Speak to at least two conflicting perspectives; optional support work makes the costs clearer or improves implementation.
5. Stabilize the damaged works without pretending repair immediately creates unlimited water.
6. Commit to a supported allocation and learn who will maintain it. A negotiated rotation has a real cost and need for witnesses.
7. Revisit the village/route and perceive the result through at least three details.
8. Save, close the application, reopen it, and find the same outcome with appropriate follow-up dialogue.

The current opening shape is established by A27: sparse strand, no remembered identity, dense woodland, and people farther inland. The protagonist's actual past and the cause of amnesia remain proposals. The complete quest sequence above is a future interface target; `0.0.5` replaces NPC conversations with nonblocking observation. When conversation returns, it should explain the stakes without requiring a lore encyclopedia.

## Deliverable package

Provide one locally installable or self-contained desktop build for the selected test OS, its source revision, controls, known limitations, and repeatable benchmark route. Include save recovery instructions and a concise list of what is real versus prototype representation.

The art pass should include selected trees, ground/rock/water treatment, village and shrine architecture, four visually readable principal characters, and restrained ambient life. Reuse candidates must have the [asset inventory](../engineering/shared-assets.md) information before distribution. Proxies are acceptable for earlier milestones and must be labeled honestly.

## Acceptance scenarios

| Area | Evidence required |
| --- | --- |
| Orientation | A new player reaches the village and identifies a path to spring/quarry without developer coaching; optional guidance remains usable. |
| Movement | Walking/running/slopes/steps and interactions are reliable; no backward-looking locomotion, chronic foot sliding, camera clipping, or unavoidable snagging on foliage. |
| Combat | Attacks and defense have readable timing, hit feedback, and recovery. A defeated encounter can be reloaded consistently; the camera allows the player to see the threat. |
| Belief and politics | A player can explain what the three local interests need and what their preferred resolution costs someone else. |
| Evidence | Optional clues improve understanding; a missed document or unavailable principal does not silently destroy the main quest. |
| Outcomes | Each authored allocation is reachable from an intended path, preserves its costs, changes local presentation, and has a valid ending state. |
| Persistent state | Rewards occur once, facts survive restart, resolution remains coherent, and an interrupted save has a recoverable path. |
| Residents | A small set works/rests plausibly, responds to the outcome, and does not require full simulation when offscreen. |
| Presentation | Canopies connect to branches, feet/buildings meet ground, water agrees with the chosen state, lighting and UI remain readable. |
| Input/accessibility | Complete with keyboard/mouse and controller; visible focus, functional remapping with conflict feedback, scalable text, subtitles, reduced motion, and a high-contrast UI option. |
| Packaging | Launches without development services; fullscreen/focus/quit/relaunch work; local play does not require Warpkeep connectivity. |
| Performance | A dated report on an identified device follows the architecture benchmark; targets are revised openly if not met. |

## Required branch and failure coverage

Verify the village-priority, quarry-priority, and negotiated-rotation outcomes. Test missed optional evidence, failed support encounter, a principal becoming unavailable, an unobserved versus witnessed offense, visiting places out of order, leaving mid-conversation, repeated resolution attempts, and loading before/after a grant.

Do not require every character to be killable to claim this coverage. The slice can demonstrate absence or incapacity through bounded states; [O12](../decisions.md) remains a wider design question.

## Production dependencies

Movement and camera must work before encounter geometry is polished. Quest facts and consequences must work before dialogue recording. Asset conventions must work before assembling hundreds of props. Local saves must work before a playtester is asked to evaluate lasting consequences. The packaged benchmark must work before approving continent scope.

## Decision at the end

Record whether the experience is enjoyable, comprehensible, technically viable, and economical to author. Identify the largest missing quality and the cost of fixing it. Choose among continuing with the current stack, revising the scope/stack, or repeating a focused prototype. A finished document, attractive screenshot, or large amount of code is not slice completion.
