# Gameplay design

**Status:** proposed design baseline, not an implementation claim. The confirmed direction is a serious single-player Steam fantasy RPG, an original world centered on a Templar-inspired order within the Hegemony (A21), meaningful relationships among regional factions, and technology/assets shared where useful with Warpkeep. Camera, combat, progression, and detailed systems below remain proposals; accepted menu presentation direction is recorded separately under A26. See [decisions](../decisions.md).

**Current `0.0.5` boundary (A27):** a sparse amnesiac landing, dense forest journey, and first settlement inland. Conversation windows are removed; NPC Observe produces nonblocking text without marking a meeting, changing trust, or choosing a quest reply. Environmental inspection and readable records use notices with persistent journal evidence. Movement, combat, world interactions, menus, and saves remain, while the earlier quest/dialogue graph is retained for future interface work. Conversation-dependent services and full water negotiations described below are future design, not current acceptance claims. See the [prototype](../engineering/prototype.md#forest-arrival-pass-30-september-2026).

## The experience we are designing

The player arrives somewhere that was functioning before their arrival. People have trades, allegiances, fears, and practical problems. Exploration reveals why they disagree; preparation gives the player leverage; taking a position changes relationships and material conditions. The world should reward attention to a ford, a locked storeroom, or a nervous worker as much as attention to a quest marker.

The proposed default is third-person exploration and combat, offline play, a player-defined traveler, and an authored regional campaign. Tervain is not a settlement management game. Owning a room or earning sanctuary can support belonging without introducing production queues, keep upgrades, or passive-resource chores. Ordinary travel connects places. Rare supernatural passages can exist later if the story earns them, but a network of convenient warps is outside the baseline.

The central loop is:

1. Enter a place and notice its current condition.
2. Meet people, learn needs, and discover routes and competing accounts.
3. Prepare through equipment, instruction, food, or local knowledge.
4. Explore, negotiate, sneak, or fight toward a chosen resolution.
5. Observe the consequence, collect an earned reward, and find a new reason to travel.

The [setting](../world/setting.md) and [factions](../world/factions.md) explain what gives those actions context. [Quest design](quests-and-consequences.md) turns the loop into a first playable example.

## Exploration and navigation

Proposed movement starts with walking, running, a stamina-limited sprint, a modest jump, and explicit low obstacle traversal. Unrestricted climbing, swimming combat, mounts, and parkour are expansion decisions. Terrain readability takes priority over movement complexity: a traversable slope must look different from a cliff, and a fence must behave consistently.

Bellwether Vale provides one legible network: Rillford, its ford, a quarry route, a spring shrine, and the damaged sluice. A safer road takes longer; a narrow maintenance path bypasses a confrontation; a conspicuous locked route grants access only through permission, a key, or trespass. Each shortcut should have a world reason to exist. Avoid placing invisible walls across plausible openings.

The current arrival route precedes that network: sparse strand → dense woodland → relocated waystation → Rillford. Habitat blending, grounded floor detail, trail markers, and connected canopy masses should give that transition depth while keeping movement clearance. Dense decoration is not a reason to block the authored trail or detach a visual tree from its collision proxy. Gameplay tree and leaf motion remains paused.

Navigation combines landmarks, spoken directions, a hand-drawn-style regional map, and optional objective indicators. The journal records directions accurately; players need not memorize dialogue. An exploration setting can suppress destination markers without hiding essential accessibility information. Distinguish an NPC's claimed location from a verified one. Mark approximate search areas as approximate.

The slice needs one elevation change, one alternate path, one dangerous crossing, and sightlines that teach their relationships. It does not need a procedurally generated continent. Discovery rewards include a route, useful evidence, a service, or a small resource cache; not every interesting ruin requires another collectible category.

## Grounded combat and magic

The proposed combat foundation is readable commitment: attacks have visible preparation, active time, and recovery. Position, stamina, reach, and timing matter. Begin with one one-handed weapon, a shield, and one hostile combatant type. Add a basic attack, a committed heavy attack, a guarded block, a short evasive step, and clear stagger rules. Avoid attack cancellation that removes all risk and enemies that track the player through an entire committed swing.

Health and stamina are sufficient for the first slice. Exhaustion prevents repeated heavy attacks and sprinting but must not trap the player in an unavoidable damage loop. Damage reactions must distinguish blocked, resisted, and clean hits. No equipment degradation, injury simulation, or layered status-effect economy is required to prove the loop.

Hostiles give a visible warning before attacking when their role permits it. They pursue within a sensible area, search briefly after losing contact, and can disengage. A defeated bandit encounter must remain defeated after loading. A defeated civilian should not automatically imply death: nonlethal confrontation is a later system unless implemented consistently, so the slice must label violent consequences clearly.

Magic belongs to the world's religion and ecology, with original names and rules. Its use should have a readable cost, a source of instruction, and visible limitations. The slice may demonstrate one authored rite at the spring: calming an unstable flow long enough to operate the sluice. It cannot conjure unlimited water, resurrect quest givers, or erase the allocation dispute. A martial spell school, summon system, and full magical character build are expansion scope. Calling a scripted interaction a complete magic system would misrepresent the milestone.

Combat audio, animation anticipation, camera collision, hit feedback, and recovery are acceptance requirements. More weapon categories come after a single duel feels dependable. Camera shake, motion blur, flashes, and head bob need independent controls or low defaults.

## Progression, trainers, and equipment

Proposed progression is practice opportunities supported by trainers, with scarce learning points or an equally legible advancement budget. A trainer requires a plausible relationship: payment, demonstrated competence, service, or trust. Learning must not depend on finding one easily killed NPC with no fallback. Distinguish knowledge permission from purchasing power; a rich stranger cannot automatically buy sacred rites.

The slice only needs one earned training opportunity and one immediately understandable improvement, such as a guarded heavy strike or more efficient blocking. Present the benefit before purchase. Do not introduce a large inactive skill tree. Attributes, numerical formulas, respec policy, and long-term level caps require a later decision supported by combat tests.

Equipment supports a few recognizable decisions: protection versus mobility, reach versus recovery, and a tool's utility versus its inventory cost. Use grounded items with visible silhouettes. Early rewards should include a repaired weapon, a tool, a piece of clothing identifying local service, or a useful consumable. Avoid showers of nearly identical percentage upgrades.

Crafting starts at an appropriate workbench with one recipe and known ingredients. A poultice or equipment repair can demonstrate preparation. Quarry machinery repairs belong to quest interactions, not a general factory system. Gathering should expose a meaningful choice or tell the player something about the terrain; sweeping every roadside plant must not be mandatory. Inventory weight, food survival meters, rarity tiers, and randomized loot affixes are not slice requirements.

## Faction access and reputation

The Templars, Hearth League, Marcher Houses, Rimeward Clans, Salt Concord, and Ash Witnesses are proposed groups with distinct regional interests; see the [faction brief](../world/factions.md). Membership, reputation, and personal trust are separate concepts. Helping a quarry worker need not endorse their employer, and insulting a steward need not make an entire faith hostile.

Track only state that causes a visible response:

| State | Example use |
| --- | --- |
| Individual trust | A foreman shares the maintenance key after the player rescues a worker. |
| Settlement standing | Rillford offers a bed after a verified improvement in water access. |
| Faction obligations | Accepting an order's initiation creates duties and limits, introduced explicitly. |
| Known offenses | A guard investigates theft reported by a witness with a credible route to report it. |
| Allegiance commitments | A later, warned commitment can exclude incompatible leadership roles. |

Reputation is local and evidence-based. No psychic global aggression: an unseen theft does not broadcast to distant towns. In the slice, model witnesses and explicit reporting events, not a simulated social network. Serious hostility has readable escalation: warning, demand, restricted access, pursuit, or combat. Ordinary dialogue choices should not unexpectedly trigger permanent war.

The slice grants affiliation or recognition, not irreversible full membership. Later membership paths should overlap early and diverge when duties actually conflict. Do not promise every faction as joinable, a universal faction ladder, or an ending for every combination until the content cost is understood.

## A small, convincing population

NPCs have bounded daily schedules: work, meal/social period, rest, and interruption behavior. The slice budgets 12 named NPCs including four principal quest actors, with no more than six full movement/combat agents near the player at once. These are content limits, not measured performance results. Distant residents use cheaper schedule states and authored transitions.

Schedule changes must preserve quest access: the journal tells the player where a steward sleeps, and urgent state changes can redirect them to a public meeting. Workers actually approach their work stations and face their movement direction. Doorways need reservations or other collision handling so two agents do not deadlock. Idle animations, tool contact, foot placement, voices, and eye lines should be tested before crowd size grows.

Background wildlife can add life with cheap bounded behavior. One bird group and one terrestrial species are enough initially. Avoid simulating an ecosystem whose gameplay effect cannot be demonstrated. Water and vegetation carry more visual responsibility than crowd count.

## Interface, persistence, and player comfort

The proposed journal separates **observed**, **reported**, and **concluded** information. It records unresolved contradictions and practical directions without deciding the player's moral position. Dialogue choices show their actual intention. A persuasion option needs a recognizable prerequisite or rationale, not an unexplained dice roll after a misleading sentence.

Keyboard/mouse and controller are proposed launch targets. Complete menus, dialogue, inventory, interactions, and saving must work without a pointer. Rebinding, sensitivity controls, hold/toggle options, subtitle sizing, speaker labels, readable contrast, and non-color-only interaction feedback belong in the foundation. Timed dialogue and rapid repeated inputs are unnecessary for the slice.

Manual save and quicksave are proposed, alongside bounded autosaves before dangerous transitions and after major quest changes. Save content includes world facts, quest steps, NPC outcomes, granted rewards, inventory, and relevant schedule state. Loading must not re-award items, reset a repaired mechanism, or revive a permanently defeated encounter. Provide a safe fallback position if geometry changes between compatible builds. Save schema and migration policy belong in [architecture](../engineering/architecture.md).

The [vertical slice](../production/vertical-slice.md) is successful when a 30–45 minute first visit supports attention, preparation, choice, and a visible consequence. Expanding combat breadth, geography, or simulation before that chain works increases cost without proving the game.
