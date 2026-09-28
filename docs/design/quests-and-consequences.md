# Quests and consequences

**Status:** original proposal for Tervain. Names, dialogue premises, and outcomes below are design material, not shipped content or established player choices. The slice contains **one main quest and two short supporting encounters**, for a 30–45 minute first pass. Broader campaign principles are included to guide future work; they are not additional slice requirements.

## Narrative contract

A quest begins with people needing something in the world. It should remain understandable without a floating marker. The player can learn enough to act through conversation, physical evidence, or exploration. Information changes available actions or their reliability. At least one decision changes something the player can subsequently see, hear, use, or lose.

Separate truth from testimony. NPCs can lie, misunderstand, or omit information, but the author must know what actually happened. Do not rewrite that truth to validate whichever side the player chooses. Moral ambiguity comes from incompatible needs and obligations, not from making every witness equally unreliable.

Tie quests to the [factions](../world/factions.md) and [narrative](../world/narrative.md). A faction label supplies context; a person's conduct supplies judgment. The [Accord of the Wells](../world/setting.md) is the proposed historical basis for shared water obligations, not a magical law that supplies an automatic correct answer.

## The Dry Bell: first complete quest

**Place:** Bellwether Vale, between Rillford, a quarry, and the spring shrine. **Trigger:** Rillford sounds its drought warning bell. The player can respond to it, discover the damaged sluice independently, or meet a quarry worker first. All entry points lead into the same stateful quest.

Reeve Mara Venn, representing the Hearth League, needs water for households and the communal mill. Templar waterkeeper Sister Edda Sorn protects minimum flow through the shrine and downstream channels under the Accord. Quarry foreman Darin Kest needs water under a Marcher contract; a shutdown means lost wages and a missed delivery. Each has an interest and responsibility.

**Authoritative facts:** a late-thaw flood damaged the sluice and deposited sediment upstream. A town diversion, quarry seepage through fractured support, and a deferred inspection compound the shortage. No single saboteur is established. Closing one diversion cannot restore the former supply; forcing the damaged gate fully open risks another failure. The foreman minimized seepage, the steward deferred inspection, and the reeve promised more relief than the remaining flow can sustain.

The player can expose these failures and still cooperate with the people responsible. The central question is how to distribute reduced flow while a proper repair becomes possible.

## People and information

The four principals are Mara Venn (`rillford_reeve`), Edda Sorn (`spring_steward`), Darin Kest (`quarry_foreman`), and maintenance worker Ila Rusk (`maintenance_worker`), a seasonal Rimeward stoneworker. Each needs a clear voice, current location, evening fallback, and response after resolution. Stable role identifiers survive later name revisions.

| Evidence | Acquisition routes | What it establishes or enables |
| --- | --- | --- |
| Dry household channel | Observe it; ask the reeve | Rillford has a real shortage. Opens the basic petition. |
| Reduced spring flow | Inspect flood sediment; hear the worker's account | Closing one diversion cannot fully solve the shortage. |
| Town diversion and quarry seepage | Follow both channels; question the reeve and foreman | Town demand and quarry damage both affect available flow. |
| Cracked sluice support | Inspect near the gate; ask the steward after seeing damage | Full restoration is unsafe without stabilization. |
| Old rotation ledger | Request archive access; use a borrowed key; trespass | A workable precedent for alternating use exists. |
| Worker testimony | Rescue the stranded worker | Corroborates the timeline and gives a safe gate procedure. |

No single document is mandatory. Physical observations substitute for testimony; a practical rotation can be proposed after inspecting both consumers and the sluice even if the ledger is missed. The ledger makes consent easier and supplies historical texture. Optional facts must create useful leverage without withholding basic understanding from a player who avoids theft or combat.

The journal distinguishes “the foreman says the spring is failing” from “sediment is obstructing the spring.” A contradiction produces a new question, not a hidden reputation penalty. Show what a committed water allocation will do before the final interaction.

## Two supporting encounters

1. **Stranded at the Cut:** the maintenance worker cannot safely return from a quarry-side path. A territorial animal from the slice's single creature family blocks the direct route. The player can fight it, open a maintenance shortcut, or draw it away and escort the worker through a safe gap. The worker provides testimony and a gate procedure. This is one short encounter using an existing archetype, not an independent rescue campaign.
2. **The Kept Record:** an old rotation ledger is stored in a restricted archive room. The player can secure access through the steward, borrow a key with a resident's permission, or trespass. The record adds evidence and a negotiating precedent. Observed trespass can cause a local warning or loss of access; the mere act of reading does not alert everyone. This is one compact social/exploration encounter.

Neither encounter is a mandatory experience-point toll. A direct investigator can reach a defensible resolution without completing both. Avoid adding a separate fetch quest for every repair part: one available brace and the appropriate tool can be introduced as part of the quarry interaction.

## Decisions and material outcomes

Stabilizing the support requires the brace, tool, and either the worker's procedure or careful inspection. An optional spring rite makes the operation safer without increasing water. Violence can obtain access, not additional flow. Normal allocations preserve minimum drinking and habitat flow. Permanent Accord changes require witnesses from affected residents, downstream users, and a waterkeeper; emergency control alone does not establish lawful ownership.

| Commitment | Preconditions | Immediate effect | Cost and local reaction |
| --- | --- | --- | --- |
| Prioritize Rillford | Safe control; minimum drinking/habitat thresholds | Household channel recovers; communal mill returns to restricted service | Quarry operations pause; the foreman and unpaid workers are unhappy. Reeve offers hospitality. |
| Prioritize the quarry | Safe control; minimum drinking/habitat thresholds | Quarry resumes limited operations; delivery remains possible | Mill stays closed and household rationing continues. Marcher contractor records the service; Rillford protests. |
| Establish a rotation | Safe control; minimum thresholds; evidence of both needs; consent to a witnessed schedule | Quarry and mill operate in alternating periods | Neither meets full demand. Supervision costs labor; missed shifts become a later concern. Both recognize a qualified compromise. |
| Force the mechanism without stabilization | Explicit danger prompt; direct access to gate | Gate jams and further reduces controllable flow | Repair becomes a recovery step; temporary rationing is worse. The quest remains recoverable. |

The rotation requires negotiated consent, produces less reliable hours, and leaves workers angry over night shifts. Social skill cannot manufacture agreement without meeting a stated concern. Humiliating the foreman may require mediation to restore talks; hiding evidence can achieve an emergency allocation while leaving a misleading public account. Forced control has a distinct legal and reputational consequence.

The slice should avoid a hard real-time drought deadline. People emphasize urgency, but stopping to read or use accessibility settings must not kill the village. Outcome changes occur through explicit player actions and authored transitions.

## State and authoring contract

Store facts independently of the journal's presentation. Suggested quest phases are `unseen`, `investigating`, `decision_ready`, `committed`, and `settled`. A damaging gate action adds a `repair_required` condition; it does not discard investigation. Conversations are views over facts and relationships, not the only containers of quest progression.

| Transition | Conditions | Atomic effects |
| --- | --- | --- |
| Enter investigation | Any recognized entry trigger | Set quest active; reveal only the relevant reported lead. |
| Verify a clue | Valid observation, item inspection, or testimony | Add evidence fact once; update its provenance and journal view. |
| Prepare safe control | Brace, tool, valid procedure/inspection; player at gate | Stabilize gate once; consume only the designated repair item. |
| Commit allocation | Safe control; allocation-specific conditions; explicit choice | Set allocation and responsibility; record witnesses; enqueue reaction events. |
| Settle | Commitment applied to physical channels; report or observation confirms it | Grant the earned completion reward once; enable local aftermath. |

Every authored action has a stable ID, conditions, effects, and a fallback when conditions are no longer true. Conditions are pure checks over known state. Effects are validated before committing: an inventory failure must not leave an item consumed and a repair undone. Rewards use stable grant IDs, so repeating dialogue or reloading cannot duplicate them. World visuals derive from durable facts; they are not the only proof that a choice occurred.

Separate `observed_by` from `known_to`. A witnessed act reaches another NPC only through an authored report or conversation. For the slice, a few explicit reports are sufficient; a generalized rumor simulation is unnecessary. Save the pending report state so reloading does not erase a witnessed offense or instantly spread one that has not been reported. More architecture detail belongs in [engineering](../engineering/architecture.md).

## Failure, absence, and consequence visibility

No essential NPC may be silently invulnerable solely to protect a hidden quest dependency. Choose one explicit rule for the slice: either protected characters use clear noncombat boundaries, or death/incapacitation is supported with fallback evidence and authority. The proposed baseline supports durable absence for any of the four principals. For the three decision-makers—Mara, Edda, and Darin—a noticeboard/public statement records an emergency allocation, physical clues preserve the truth, and a local caretaker acknowledges the result. Ila's absence leaves the inspection route available. Killing a principal does not award their normal trust, payment, or negotiated consent. Forced control remains possible, with hostility and reduced rewards.

Missing the worker or ledger leaves investigation routes open. Taking the brace before the quest starts remains valid. Selling it should be recoverable by buyback or one replacement source, not infinite respawning rewards. Leaving the region pauses the unresolved local state. On return, NPC dialogue summarizes what remains unresolved without resetting completed work.

The first consequence must be visible before the player leaves: a channel fills, a mill resumes, quarry labor stops, a posted schedule appears, or a guard restricts access. Dialogue alone is insufficient. A single follow-up visit later shows the chosen cost through work schedules and a short encounter. Proposed campaign callback: the same quarry contract later funds a bridge repair; interrupted delivery changes who pays and who claims credit. The slice only needs a saved callback flag and one local aftermath, not the later bridge quest.

Verification should cover each allocation; forcing then repairing the gate; entry through each starting location; missing both supporting encounters; theft with and without a witness; a principal becoming unavailable; and saving/loading before and after commitment and reward. See the [vertical-slice acceptance plan](../production/vertical-slice.md). Successful branching means coherent states and credible consequences, not the largest possible number of endings.
