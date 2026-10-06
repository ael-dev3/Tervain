Native combat kernel checkpoint
===============================

src/gothic3/combat.ts exports pure bounded arithmetic queries and ordered state
plans. Its GiveXP planner feeds an ordinary-play Hero reward path that updates
XP and handles one threshold crossing by updating Level and LP; the
melee/combat-task kernel remains unintegrated. A resolved math query does not
establish native contact or mean that a full combat task was ported.

The progression bridge seeds `Perk_Learn` as inactive from the hash-checked
starting-inventory capture. The full accessor-framed serialized `gCNPC_PS`
packet is now read; its legacy Level record passes through the byte-verified
obsolete-class reader and remains opaque, while the current Level begins at
the verified new-game value. The retained NPC property set is still not
attached to the live Hero entity, and the level-up visual effect remains absent.

Implemented profile: untransformed Hero with valid PlayerMemory, fist or single
one-hand mode, Action1..5, Impact1/Blade2, initialized humanoid NPC species0/5,
resolved skill activation, armor classification and carrier owner. Guard state,
directional GetAttitude and early AssessHit/contact eligibility are explicit
caller dependencies with source provenance. Unknown dependencies return an
unsupported result and no effect plan. Standing reactions require native helper
1000c160 result0; no generic pose-to-reaction guessing is used.

Public manifest/evidence/action labels are under public/gothic3/combat. Native
C/assembly text excerpts are in this directory's sources tree. Each receipt has
original PE input SHA256, study source path/line/hash, excerpt hashes and a
read-only audit of every assembly instruction byte against its original PE.
Five-byte export jumps retain separate target-body receipts. These are research
text, not original source recovered from the developer or recompiled DLLs.

Reproduce with Python3.10+ from the repository root:
  python tools/gothic3/research_native_combat.py --study-root "PATH_TO_COMPLETED_LOCAL_STUDY"
The study must include 00_Original_Runtime and 01_Decompiled_Code with canonical
functions.csv/full_disassembly.asm/pseudocode. The tool only reads those sources
and writes owned assets/gothic3/combat and public/gothic3/combat output.
The four native module SHA256 values are pinned to the studied installed build;
another binary build must be researched before its addresses/rules are accepted.

Critical installed-build distinctions:
- GiveXP assembly uses level*5 (10062b1d LEA), although expanded C says *10.
- Orc species5 is humanoid. IsBoss is valid enclave plus NPCType2.
- Action24 is StumbleR; Action11/12 share a label but retain distinct values.
- Active skill means a matching learnable stack with Learned or ActivationCount
  >0. Item presence or AssureStack alone is insufficient.
- Generic _Hit_ phase threshold is float32(maxTime)*0.6000000238418579 compared
  with double GetPlayTime. Its flag is marked before OnHit. Script OnHit checks
  fist hands0/8; sword contact uses TouchDamage and has no inferred60% hit timer.
- Guard costs use pre-protection damage/2. Stamina deficit subtracts HP before
  possible ordinary engine damage. Alive guard reactions17/18/21 suppress that
  ordinary engine subtraction; zero final receiver damage is unsupported.
- Damage arithmetic truncates toward zero. Protection uses signed32 IMUL and
  integer division, with cap80 before armor perks. No hit-chance roll is added.
- Default NPC XP and its shared DefeatedByPlayer flag prevent KO/kill duplication;
  the flag is set even when PartyMemberType5 makes GiveXP a no-op. A GiveXP call
  increments level only once, adds LP10 (+1 Learn) and does not refill HP.

Numeric boundary: point/level/progress inputs use bounded signed32 integers.
Derived state overflow and exceptional NaN/infinite/float-to-int cases return
unsupported. Damage amount is at most0xffffff so its exact product with a
binary32 multiplier fits binary64. Protection multiplication deliberately wraps
with Math.imul, preserving native signed32 behavior. This is a stated kernel
domain, not an invented game stat cap or proof of x87 instruction equality.

Ordered nativeBoundary effects locate still-deferred impact/entity notifications
and defeat-task/XP notifications. Full AI/contact/collision groups, native skill
and inventory resolution, quest callback dispatch, status effects, task execution,
ragdolls, spells/projectiles and other weapon modes require later milestones.
Executing this plan without those dependencies is not full original combat.
