import type { Cond, ItemId, NpcId, PlaceId } from '../game/types';

/**
 * Spoken lines for the hero and Rillford's people (A53). The game still has no dialogue windows (A27): people speak
 * in the world.
 * - Walking near someone may draw a remark (the barks in npcs.ts).
 * - Interacting with them plays a short exchange: sometimes the hero's question, then their answer.
 * - Two people at work or at rest near each other sometimes talk between themselves (the scenes below).
 * - The hero remarks on places, what he inspects and finds, fights, wounds, nightfall and dawn.
 * Every line is a proposal, not approved canon, like the text-first dialogue it grew from (dialogue.ts). Each line is
 * voiced by its speaker's designed voice with Eleven v4, generated from exactly this text (tools/world-audio/voices.json
 * records it). Square-bracketed directions such as [sighs] shape the delivery and are not shown on screen.
 */

export type Speaker = NpcId | 'hero';

export interface VoiceLine {
  speaker: Speaker;
  text: string;
}

/** The words as shown on screen: the delivery directions in square brackets are for the voice only. */
export const shown = (text: string) => text.replace(/\[[^\]]*\]\s*/g, '').replace(/\s{2,}/g, ' ').trim();

/** Whether an hour falls in a span of the day (wrapping midnight when from > to). */
export const inHours = (hour: number, [from, to]: readonly [number, number]) => (from <= to ? hour >= from && hour < to : hour >= from || hour < to);

/** One exchange: the hero may ask first; the person answers. The first exchange whose conditions hold and that has
 * not been heard yet plays; `again` exchanges are the ones repeated once everything has been heard. */
export interface Talk {
  npc: NpcId;
  when?: Cond[];
  ask?: string;
  reply: string;
  again?: boolean;
}

/** Two people talking between themselves while they stand near each other, overheard when the player comes close. */
export interface Scene {
  id: string;
  cast: [NpcId, NpcId];
  /** Hours of the day when it can happen (wrapping midnight when from > to). */
  hours: [from: number, to: number];
  when?: Cond[];
  /** The lines in order; each belongs to one of the cast. */
  lines: string[];
}

const F = (key: string): Cond => ({ t: 'fact', key });
const NF = (key: string): Cond => ({ t: 'not', c: F(key) });
const before: Cond = { t: 'phase', below: 'committed' };
const unsettled: Cond = { t: 'phase', below: 'settled' };
const settled: Cond = { t: 'phase', is: 'settled' };
const alloc = (is: 'rillford' | 'quarry' | 'rotation'): Cond => ({ t: 'alloc', is });
const has = (id: 'dry_channel' | 'reduced_spring_flow' | 'diversion_and_seep' | 'cracked_sluice' | 'rotation_ledger' | 'worker_testimony'): Cond => ({ t: 'evidence', id });
const rescued = F('ila_rescued');
const stranded = NF('ila_rescued');
const beastDead: Cond = { t: 'defeated', id: 'cut_creature' };
const quarryWorking: Cond = { t: 'any', c: [alloc('quarry'), alloc('rotation')] };

const L = (speaker: Speaker, text: string): VoiceLine => ({ speaker, text });

export const VOICE_LINES: Record<string, VoiceLine> = {
  'rowan.bark.supplies': L('trail_hunter', "Rillford's pots are running thin. Take a bow from the bench if you need one. Bring back meat and I'll pay a fair price. Keep your hunt clear of the road."),
  /* ---- the hero ---- */
  'hero.arrival': L('hero', 'Salt in my mouth. Sand in everything. And no name to go with any of it.'),
  'hero.arrival.bell': L('hero', 'A bell, inland. Somebody is in trouble. Might as well be me who answers.'),
  'hero.place.lantern_point': L('hero', 'A lighthouse. Dark, for now. Somebody kept it lit once.'),
  'hero.place.deepwood': L('hero', 'Old trees. Older than whatever I was.'),
  'hero.place.overlook': L('hero', 'A village below. Smoke from the chimneys, at least.'),
  'hero.place.rillford': L('hero', 'Rillford. The bell is louder here. So is the quiet.'),
  'hero.place.ford': L('hero', 'The ford. Washed out, like everything else round here.'),
  'hero.place.spring_shrine': L('hero', 'A shrine. The water sounds thin.'),
  'hero.place.sluice': L('hero', 'So this is the sluice. Cracked, and nobody has mended it.'),
  'hero.place.quarry': L('hero', 'A quarry with no cutting. That is a lot of people standing still.'),
  'hero.place.the_cut': L('hero', 'The Cut. Mind your footing.'),
  'hero.place.archive': L('hero', 'Shelves of records. Somebody kept count of everything except me.'),
  'hero.blade': L('hero', 'A rusted blade. Better than bare hands. Barely.'),
  'hero.beast': L('hero', 'That is no dog.'),
  'hero.wounded.1': L('hero', '[gasps] Not like this.'),
  'hero.wounded.2': L('hero', '[breathing hard] I need to rest. Soon.'),
  'hero.respawn.1': L('hero', '[exhales] Still breathing. Let us not do that again.'),
  'hero.respawn.2': L('hero', 'Up. Again.'),
  'hero.victory': L('hero', '[breathing hard] Stay down. Please.'),
  'hero.settled': L('hero', 'The bell has changed. Either I fixed something, or I broke it properly.'),
  'hero.night': L('hero', 'Dark already. The road looks longer at night.'),
  'hero.dawn': L('hero', 'Morning. Still no name. Still breathing.'),
  'hero.rescued': L('hero', 'She is safe. One thing done right today.'),
  'hero.shortcut': L('hero', 'The old gate is open. A way round, without a fight.'),
  'hero.rite': L('hero', '[exhales] The water is calmer. For now.'),
  'hero.gate.stabilized': L('hero', 'Braced and turning. It will hold.'),
  'hero.gate.jammed': L('hero', '[sighs] Jammed. That one is on me.'),
  'hero.inspect.arrival_wreckage': L('hero', 'A boat, once. Did I come in it? I cannot even tell you that.'),
  'hero.inspect.templar_waymarker': L('hero', 'Notches in the stone. Someone wanted this path found.'),
  'hero.inspect.dry_channel': L('hero', 'Dry to the mud. A whole village drinking from one well.'),
  'hero.inspect.spring_sediment': L('hero', 'Silt. The spring still wells up underneath it. Choked, not dead.'),
  'hero.inspect.town_diversion': L('hero', 'A fresh cut in the bank. Somebody helped themselves.'),
  'hero.inspect.quarry_seep': L('hero', 'Water where it should not be, and rock cracked where it was cut too far.'),
  'hero.inspect.sluice_crack': L('hero', 'That stone will not hold if anyone forces the gate. Careful hands, then.'),
  'hero.inspect.inspection_log': L('hero', 'A week missing, right before the flood. Convenient. Or careless.'),
  'hero.inspect.wetland_fish': L('hero', 'The shallows are drying out. The fish knew before anyone did.'),
  'hero.inspect.saltward_kit': L('hero', 'A level and a marked staff. Somebody knew how to share this water, once.'),
  'hero.item.archive_key': L('hero', 'A key to a room full of other people’s memories.'),
  'hero.item.votive_reed': L('hero', 'One reed. One chance. Do not waste it.'),
  'hero.item.sluice_brace': L('hero', 'A brace for the cracked post. Now to set it without breaking anything.'),
  'hero.item.gate_wrench': L('hero', 'Heavy. Good. The gate will need persuading.'),
  'hero.item.coin': L('hero', 'Coin. Whoever I was, I will need some of this.'),
  'hero.item.healing_herb': L('hero', 'Bitter-smelling leaves. Probably good for something.'),
  'hero.item.shore_apple': L('hero', 'Salt on the skin of it. Still an apple.'),
  'hero.ask.where': L('hero', 'Where am I?'),
  'hero.ask.bell': L('hero', 'What is that bell?'),
  'hero.ask.work': L('hero', 'Where can I find work?'),
  'hero.ask.ashore': L('hero', 'Did you see me come ashore?'),
  'hero.ask.road': L('hero', 'Where does the road go?'),
  'hero.ask.water': L('hero', 'What happened to the water?'),
  'hero.ask.who': L('hero', 'Who else wants it?'),
  'hero.ask.places': L('hero', 'Where are the sluice and the shrine?'),
  'hero.ask.choose': L('hero', 'What would you do?'),
  'hero.ask.diversion': L('hero', 'The side gate above the fields. That was you?'),
  'hero.ask.failing': L('hero', 'Is the spring failing?'),
  'hero.ask.gate': L('hero', 'And the gate?'),
  'hero.ask.accord': L('hero', 'What is the Accord?'),
  'hero.ask.rite': L('hero', 'Tell me about the rite.'),
  'hero.ask.wait': L('hero', 'Why not wait for the water?'),
  'hero.ask.marchers': L('hero', 'What do the Marchers want?'),
  'hero.ask.lever': L('hero', 'Where is that maintenance gate?'),
  'hero.ask.ila': L('hero', 'Have you seen Ila?'),
  'hero.ask.down': L('hero', 'How do I get you down?'),
  'hero.ask.gully': L('hero', 'What did you see in the gully?'),
  'hero.ask.close': L('hero', 'How should the gate be closed?'),
  'hero.ask.from': L('hero', 'Where are you from?'),
  'hero.ask.stay': L('hero', 'Will you stay?'),
  'hero.ask.reserve': L('hero', 'And the repair reserve?'),
  'hero.ask.sufficient': L('hero', 'Sufficient?'),
  'hero.ask.owns': L('hero', 'Who owns the quarry?'),
  'hero.ask.late': L('hero', 'And if the delivery is late?'),
  'hero.ask.write': L('hero', 'What do you write down?'),
  'hero.ask.witness': L('hero', 'Who are the Ash Witness?'),
  'hero.ask.me': L('hero', 'What will you write about me?'),
  'hero.ask.archive': L('hero', 'What is in the archive?'),
  'hero.ask.see': L('hero', 'Can I see it?'),
  'hero.ask.templar': L('hero', 'Are you a Templar?'),
  'hero.ask.mill': L('hero', 'What does the mill need?'),
  'hero.ask.grain': L('hero', 'How is the grain?'),
  'hero.ask.built': L('hero', 'Who built the mill?'),
  'hero.ask.darin': L('hero', 'What is Darin like to work for?'),
  'hero.ask.sleep': L('hero', 'Where do you sleep?'),
  'hero.ask.help': L('hero', 'Can I help?'),
  'hero.ask.bake': L('hero', 'What do you bake?'),
  'hero.ask.village': L('hero', 'How is the village holding up?'),

  /* ---- Joss Merrin, caravan master ---- */
  'joss.where': L('caravan_master', 'The overlook above Rillford, friend. You came up from the strand on foot? Nobody comes up from the strand. Sit a moment before you fall over.'),
  'joss.ashore': L('caravan_master', '[chuckles] I saw a man walk out of the surf like it owed him money. Did not seem polite to ask.'),
  'joss.bell': L('caravan_master', 'Rillford’s drought bell. They ring it when the household channels run dry, and nobody rings it lightly. It has been going since dawn.'),
  'joss.work': L('caravan_master', 'Ask for the reeve, Mara Venn. East there is a quarry under a Marcher contract, north a Templar spring. Work enough for spare hands, and arguments to go with it.'),
  'joss.road': L('caravan_master', 'The ford road washed out in the thaw, so the wagon waits here. If you walk down, watch the side path off the ford. Something big has been about.'),
  'joss.roads': L('caravan_master', 'East to the ford, if the ford were standing. Further on, the Marcher estates, and folk who would charge you for the dust on your boots.'),
  'joss.beast': L('caravan_master', 'They say the thornback is dead. Then I will take the cut road home, and thank whoever did it.'),
  'joss.after': L('caravan_master', 'I heard the bell ring differently this morning. Whatever you did down there, it carried up the hill.'),
  'joss.idle': L('caravan_master', 'Wagon is not going anywhere yet. Neither am I.'),
  'joss.bark.horse': L('caravan_master', 'Easy, old girl. The road will dry.'),
  'joss.bark.fog': L('caravan_master', 'Morning. Fog is lifting off the strand.'),
  'joss.bark.lamp': L('caravan_master', '[yawns] Lamp is low. So am I.'),

  /* ---- Mara Venn, reeve of Rillford ---- */
  'mara.intro': L('rillford_reeve', 'You heard the bell, then. It has not rung in my term until today. I am Mara Venn. Rillford elected me to keep it fed, and this morning I have very little to feed anyone with.'),
  'mara.water': L('rillford_reeve', 'The late thaw broke the old sluice and choked the spring channels with silt. The household channel behind the mill is dry. Go and see it.'),
  'mara.who': L('rillford_reeve', 'The quarry wants it for cutting, the shrine wants its share, and I cannot give all three what each is owed.'),
  'mara.places': L('rillford_reeve', 'North along the mill lane to the sluice. Past it, up the steps, the spring shrine. The quarry is east, along the cut track.'),
  'mara.channel': L('rillford_reeve', 'You have seen the channel, then. Now you know why I ring that bell myself, some mornings.'),
  'mara.choose': L('rillford_reeve', 'If it comes to one or the other, I would choose the village, and I will not pretend otherwise. That is why it should not be my choice alone.'),
  'mara.diversion': L('rillford_reeve', '[sighs] Yes. I opened it when the channel first ran short, and I called no witnesses. I told myself it was too small to matter. It is not nothing.'),
  'mara.hear': L('rillford_reeve', 'Talk to Darin and to Sister Edda before you decide anything. I would rather you heard all of us than only me.'),
  'mara.after.rillford': L('rillford_reeve', 'The channel behind the mill is filling. I can hear it. It cost the quarry, and I know it. We will owe a review.'),
  'mara.after.quarry': L('rillford_reeve', 'The mill sits still and the households still ration. I said I would abide by your choice, and I will. But Rillford is protesting, and so am I.'),
  'mara.after.rotation': L('rillford_reeve', 'Mill by day, quarry by night. Neither of us has what we asked for. That is what fair looks like, I suppose.'),
  'mara.bark.bucket': L('rillford_reeve', 'A bucket a day. That is what I promised them.'),
  'mara.bark.bread': L('rillford_reeve', 'Water in the channel. Bread by the weekend.'),
  'mara.bark.morning': L('rillford_reeve', '[sighs] Another day of buckets.'),
  'mara.bark.short': L('rillford_reeve', 'Let us hear it, then. Who is short today?'),
  'mara.scene.cansee': L('rillford_reeve', 'I can see that, Bess. I am standing in it.'),
  'mara.scene.counting': L('rillford_reeve', '[sighs] Everybody is counting. That is the trouble.'),
  'mara.scene.hear': L('rillford_reeve', 'I hear it. Do not waste a drop.'),
  'mara.scene.broken': L('rillford_reeve', 'Only that it is still broken.'),
  'mara.scene.three': L('rillford_reeve', 'Then three will have to do. I am sorry, Hesper.'),
  'mara.scene.share': L('rillford_reeve', 'Smaller ones, Hesper. We still share.'),

  /* ---- Sister Edda Sorn, waterkeeper of the spring ---- */
  'edda.intro': L('spring_steward', 'You have the look of someone walking since dawn. I am Sister Edda Sorn, waterkeeper of this spring. It still gives what it can. It is the channels below that have failed.'),
  'edda.failing': L('spring_steward', 'It is not failing. Silt obstructs it. If you doubt me, kneel at the intake and put your hand in.'),
  'edda.gate': L('spring_steward', 'The support beside the gate cracked in the flood. I would not force that gate open. It could give way.'),
  'edda.accord': L('spring_steward', 'An old agreement between the village, the order and the land. It says who may take water, and that someone must always watch who takes it.'),
  'edda.rite.ask': L('spring_steward', 'A votive reed, a few words, and patience. It calms an unstable flow for perhaps forty minutes. Long enough to work a gate safely. No longer.'),
  'edda.rite': L('spring_steward', 'The rite calms an unstable flow for a while. It does not make water. It makes a gate less violent.'),
  'edda.log': L('spring_steward', '[exhales] You have read my log. Yes, I deferred the inspection. I trusted old stone, and the stone did not deserve it.'),
  'edda.after.rotation': L('spring_steward', 'A schedule witnessed by the reeve, the foreman and the spring. This is what the Accord meant. I will not miss another inspection.'),
  'edda.after': L('spring_steward', 'The wetland has its minimum. An emergency allocation lapses unless it is reviewed, and I will hold the review.'),
  'edda.bark.patience': L('spring_steward', 'Patience. The water remembers its way.'),
  'edda.bark.reeds': L('spring_steward', 'Mind the reeds. They were here before any of us.'),
  'edda.bark.blessed': L('spring_steward', 'Blessed is the water that finds its way home.'),
  'edda.bark.light': L('spring_steward', 'The light goes early at the spring.'),

  /* ---- Darin Kest, quarry foreman ---- */
  'darin.intro': L('quarry_foreman', 'Quarry is stopped. No water to cut with, less to drink. Darin Kest. If the reeve sent you to shut me down, save your breath.'),
  'darin.wait': L('quarry_foreman', 'I have a Marcher contract and a delivery that will not wait on the weather. The estate counts blocks, not excuses.'),
  'darin.marchers': L('quarry_foreman', 'Stone, on time, and no stories about why it is late. Halvek writes the numbers. I am the one who has to make them true.'),
  'darin.ila': L('quarry_foreman', 'Ila Rusk went along the cut path to read the seep gully, and something big took the path from her. There is an old maintenance gate. Its lever is by the lower stack.'),
  'darin.lever': L('quarry_foreman', 'Old gate, older lever. Lower stack, east side of the yard. It sticks. Pull like you mean it.'),
  'darin.seep': L('quarry_foreman', 'We cut a short extension after the permission ran out. The seep came after. My crew reported it. Nobody came.'),
  'darin.safe': L('quarry_foreman', 'Ila is down safe? [exhales] Good. She is stubborn, but she is the best eye for rock I have got.'),
  'darin.after.quarry': L('quarry_foreman', 'Water in the cutting trench again. The delivery goes out. I will not thank you for the look on the village’s face, mind.'),
  'darin.after.rotation': L('quarry_foreman', 'Nights for us, days for the mill. The crew hates it, and they will do it.'),
  'darin.after.rillford': L('quarry_foreman', 'Quarry is stopped. My crew is unpaid and idle. The estate will have my hide for this.'),
  'darin.bark.count': L('quarry_foreman', 'Forty blocks. I can count, Halvek.'),
  'darin.bark.stack': L('quarry_foreman', 'Who is minding the lower stack?'),
  'darin.bark.edge': L('quarry_foreman', '[shouts] Mind the edge! I am not losing anyone else this season.'),
  'darin.bark.ledgers': L('quarry_foreman', 'Ledgers. I would rather lift stone.'),
  'darin.scene.blocks': L('quarry_foreman', '[shouts] Pell Dunmore! Those blocks will not square themselves.'),
  'darin.scene.well': L('quarry_foreman', 'Then fetch water from the well.'),
  'darin.scene.contract': L('quarry_foreman', 'For the contract, Pell.'),
  'darin.scene.load': L('quarry_foreman', '[shouts] Load the cart! The steward is counting.'),
  'darin.scene.used': L('quarry_foreman', '[laughs] Do not get used to it.'),

  /* ---- Ila Rusk, seasonal stoneworker ---- */
  'ila.ledge': L('maintenance_worker', 'Keep back from the path! A thornback took the ledge below, and it does not like company. I am Ila Rusk, seasonal maintenance.'),
  'ila.down': L('maintenance_worker', 'There is an old maintenance gate. The lever is by the quarry’s lower stack. Pull it, and I can walk the old track round the ledge.'),
  'ila.notnow': L('maintenance_worker', 'Not now! Get me off this ledge first, then I will tell you everything.'),
  'ila.waiting': L('maintenance_worker', 'Still here. Still counting the same three handholds.'),
  'ila.saw': L('maintenance_worker', 'My legs have forgotten how to be legs. Here is what I saw up there: fresh fractures on the support beside the gate, and the seep feeding the wrong channel.'),
  'ila.close': L('maintenance_worker', 'Slowly, from the downstream side. Brace the cracked post first, then a quarter turn of the wheel, and wait for the water to settle.'),
  'ila.from': L('maintenance_worker', 'Rimeward. Up north, where the rivers freeze solid and nobody argues about water. They argue about everything else.'),
  'ila.stay': L('maintenance_worker', 'Until my legs remember they are legs. Then wherever there is stone that needs reading.'),
  'ila.villain': L('maintenance_worker', 'Do not look for a villain. Look for who will keep the pieces from failing again.'),
  'ila.bark.hello': L('maintenance_worker', '[shouts] Hello? Anyone down there?'),
  'ila.bark.down': L('maintenance_worker', '[whispers] Do not look down, Ila. Do not look down.'),
  'ila.bark.bench': L('maintenance_worker', 'Warm bench. Dry boots. I could weep.'),
  'ila.bark.cheerful': L('maintenance_worker', 'Somebody play something cheerful, before I remember the ledge.'),

  /* ---- Oren Halvek, estate steward ---- */
  'oren.intro': L('estate_steward', 'Steward Halvek, Marcher estate. If you are here about the delivery, the contract stands regardless of who has water.'),
  'oren.reserve': L('estate_steward', 'The repair reserve is… sufficient.'),
  'oren.reserve.truth': L('estate_steward', '[clears throat] It is empty. The estate has not funded repairs since the winter levy. Please do not repeat that.'),
  'oren.owns': L('estate_steward', 'The Marcher estate holds the contract. The crown holds the estate. I hold the ledger, which is the only part anyone ever reads.'),
  'oren.late': L('estate_steward', 'Penalties. Then excuses. Then a new steward. I would prefer to avoid the third.'),
  'oren.date': L('estate_steward', 'The delivery date has not moved. Is there something else?'),
  'oren.after.quarry': L('estate_steward', 'The delivery will go out. The estate notes your part in it. That is not a promise of anything.'),
  'oren.after': L('estate_steward', 'The estate is reviewing its commitments. A missed delivery reflects on my ledger, not yours. Good day.'),
  'oren.bark.columns': L('estate_steward', 'Columns that do not add up. How familiar.'),
  'oren.bark.counting': L('estate_steward', 'Thirty-eight. Thirty-nine. And none since Tuesday.'),

  /* ---- Sel Anrit, recorder of the Ash Witness ---- */
  'sel.intro': L('ash_recorder', 'Sel Anrit, recorder. Third failure this season: a bridge, a granary road, now the water. You will call it coincidence. I do not.'),
  'sel.write': L('ash_recorder', 'Everything. Including an old rotation ledger in the shrine archive. The copies disagree. If you can read it, read it.'),
  'sel.witness': L('ash_recorder', 'We write down what happens, so that later no one can say it happened differently. We take no side. That is the hardest part.'),
  'sel.me': L('ash_recorder', 'That you arrived without a name, and asked good questions. The rest, you have not done yet.'),
  'sel.pattern': L('ash_recorder', 'Repair only delays it. Each failure is smaller than the last cause, and larger than the last cure.'),
  'sel.after': L('ash_recorder', 'I have written down what you did. I do not yet know whether it is a beginning or a delay. But it is written.'),
  'sel.bark.ink': L('ash_recorder', 'The ink dries slowly today. Damp air.'),
  'sel.bark.hour': L('ash_recorder', 'Name, place, hour. Always the hour.'),
  'sel.bark.river': L('ash_recorder', 'The river was higher, once. I have it written.'),
  'sel.bark.dark': L('ash_recorder', 'Too dark to write. Not too dark to remember.'),

  /* ---- Tolan Harrow, shrine warden ---- */
  'tolan.intro': L('shrine_warden', 'Warden Tolan Harrow. The archive is locked, and Sister Edda holds the say. State your business.'),
  'tolan.archive': L('shrine_warden', 'Records older than the village. The order keeps them. Few read them, and fewer put them back.'),
  'tolan.see': L('shrine_warden', 'Not without the Sister’s word. Bring me that, and I will turn the key myself.'),
  'tolan.templar': L('shrine_warden', 'Sworn to the order for thirty years. These days that means sweeping roots off a doorstep and turning away the curious.'),
  'tolan.guard': L('shrine_warden', 'If you want steel discipline rather than speeches, I teach a little of it. Feet apart, guard high, and do not flinch.'),
  'tolan.after': L('shrine_warden', 'The Sister says the water is fair now. I say keep the gate braced and the log honest.'),
  'tolan.bark.hey': L('shrine_warden', '[shouts] Hey! Who is there?'),
  'tolan.bark.hands': L('shrine_warden', 'Hands where I can see them, pilgrim.'),
  'tolan.bark.lock': L('shrine_warden', '[sighs] Another night, another lock to check.'),
  'tolan.bark.along': L('shrine_warden', 'Move along, pilgrim. The spring is that way.'),

  /* ---- Bess Corran, mill hand ---- */
  'bess.intro': L('mill_hand', 'The wheel has been dry since the flood. Without water I have nothing to grind. I stand here so the reeve sees somebody is minding it.'),
  'bess.mill': L('mill_hand', 'Water in the channel behind it, that is all. Half a channel would do. A quarter, even. I am not proud.'),
  'bess.grain': L('mill_hand', '[laughs] Since you ask: in sacks, going nowhere. Thank you for asking. Nobody else has.'),
  'bess.built': L('mill_hand', 'My grandmother’s grandmother, if you believe my grandmother. The wheel is younger. Only just.'),
  'bess.after.rillford': L('mill_hand', '[laughs] She turns! Grain by evening, and the whole village will smell the flour.'),
  'bess.after': L('mill_hand', 'Still dry. I will keep standing here. Somebody should.'),
  'bess.bark.grain': L('mill_hand', 'Go on, ask me how the grain is doing.'),
  'bess.bark.morning': L('mill_hand', 'Morning! Still dry. Still here.'),
  'bess.scene.dry': L('mill_hand', '[calls out] Still dry, reeve!'),
  'bess.scene.counting': L('mill_hand', 'Just making sure somebody is counting.'),
  'bess.scene.listen': L('mill_hand', '[laughs] Listen to her go, reeve!'),
  'bess.scene.promise': L('mill_hand', 'Not one. Promise.'),

  /* ---- Pell Dunmore, quarry hand ---- */
  'pell.intro': L('quarry_hand', 'Foreman says we wait. Nothing to cut with, nothing to drink.'),
  'pell.ila': L('quarry_hand', 'Ila is up the cut path. Something big took the ledge. Foreman knows about the gate.'),
  'pell.darin': L('quarry_hand', 'Loud. Honest, mind. He shouts the same at the crew as at the steward. Only the steward shouts back.'),
  'pell.sleep': L('quarry_hand', 'Crew bunks behind the yard. Four of us, two blankets. We take turns being cold.'),
  'pell.after.rotation': L('quarry_hand', '[sighs] Night shift again. Night shift of what? Staring at rocks in the dark?'),
  'pell.after.quarry': L('quarry_hand', 'Load the wagon. Quickly, before somebody changes their mind.'),
  'pell.bark.dust': L('quarry_hand', 'Dust in my teeth and nothing to wash it down.'),
  'pell.bark.done': L('quarry_hand', 'Another day of nothing, done.'),
  'pell.scene.dry': L('quarry_hand', 'Nothing to square them with, foreman. The trench is dry.'),
  'pell.scene.uphill': L('quarry_hand', '[sighs] Uphill. In buckets. For stone.'),
  'pell.scene.says': L('quarry_hand', 'For the contract, he says.'),
  'pell.scene.count': L('quarry_hand', 'Let him count. We are cutting again.'),

  /* ---- Hesper Lowe, baker ---- */
  'hesper.intro': L('village_baker', 'No water, no dough, my love. If you have not looked at the dry channel behind the mill, do.'),
  'hesper.help': L('village_baker', 'Take a loaf, you look like you need it. Then go and help the reeve. You cannot ask a bucket to do a river’s work.'),
  'hesper.bake': L('village_baker', 'Rye loaves, when there is water. Flatbread when there is not. Prayers when there is neither.'),
  'hesper.village': L('village_baker', 'Tired and polite, mostly. Polite will not last, love. Get the water moving before it does not.'),
  'hesper.after.rillford': L('village_baker', 'Bread by the weekend, and not a day later. I have promised half the village already.'),
  'hesper.after': L('village_baker', 'Smaller loaves this week. Everybody understands. Nobody likes it.'),
  'hesper.bark.step': L('village_baker', '[laughs] Mind the step, love, it is floury.'),
  'hesper.bark.barrel': L('village_baker', 'Last of the rain barrel, this.'),
  'hesper.bark.ovens': L('village_baker', 'Ovens first, gossip after.'),
  'hesper.bark.queue': L('village_baker', 'Who is for the well? Mind the queue.'),
  'hesper.scene.word': L('village_baker', '[calls out] Mara! Any word from the sluice?'),
  'hesper.scene.flour': L('village_baker', 'I can stretch the flour three more days. Not four.'),
  'hesper.scene.quick': L('village_baker', 'Do not be sorry, love. Be quick.'),
  'hesper.scene.loaves': L('village_baker', 'Full loaves tomorrow, Mara!'),
  'hesper.scene.warm': L('village_baker', '[laughs] Smaller, then. But warm.'),

  /* ---- the barks that were text only ---- */
  'bess.bark.wheel': L('mill_hand', 'The wheel has not turned since the flood.'),
  'bess.bark.evening': L('mill_hand', 'Grain by evening!'),
  'hesper.bark.dough': L('village_baker', 'No water, no dough.'),
  'pell.bark.nothing': L('quarry_hand', 'Nothing to cut with. Nothing to drink.'),
  'pell.bark.load': L('quarry_hand', 'Load the wagon. Quickly.'),
  'pell.bark.night': L('quarry_hand', '[sighs] Night shift again…'),
  'mara.bark.where': L('rillford_reeve', 'Where is the water going?'),
  'darin.bark.contract': L('quarry_foreman', 'Contract does not care about the weather.'),
  'edda.bark.quiet': L('spring_steward', 'The spring is quiet today.'),
  'tolan.bark.lamp': L('shrine_warden', 'Keep the lamp out of the archive.'),
  'sel.bark.write': L('ash_recorder', 'Write it down. Someone must.'),
  'oren.bark.date': L('estate_steward', 'The delivery date has not moved.'),
};

/** Interacting with someone: their exchanges in order of preference. */
export const TALKS: Talk[] = [
  { npc: 'caravan_master', ask: 'hero.ask.where', reply: 'joss.where' },
  { npc: 'caravan_master', ask: 'hero.ask.bell', reply: 'joss.bell', when: [unsettled] },
  { npc: 'caravan_master', ask: 'hero.ask.ashore', reply: 'joss.ashore' },
  { npc: 'caravan_master', ask: 'hero.ask.work', reply: 'joss.work', when: [before] },
  { npc: 'caravan_master', reply: 'joss.road', when: [unsettled, { t: 'not', c: beastDead }] },
  { npc: 'caravan_master', ask: 'hero.ask.road', reply: 'joss.roads' },
  { npc: 'caravan_master', reply: 'joss.beast', when: [beastDead] },
  { npc: 'caravan_master', reply: 'joss.after', when: [settled] },
  { npc: 'caravan_master', reply: 'joss.idle', again: true },

  { npc: 'rillford_reeve', reply: 'mara.intro' },
  { npc: 'rillford_reeve', ask: 'hero.ask.water', reply: 'mara.water', when: [before] },
  { npc: 'rillford_reeve', ask: 'hero.ask.who', reply: 'mara.who', when: [before] },
  { npc: 'rillford_reeve', ask: 'hero.ask.places', reply: 'mara.places', when: [unsettled] },
  { npc: 'rillford_reeve', reply: 'mara.channel', when: [before, has('dry_channel')] },
  { npc: 'rillford_reeve', ask: 'hero.ask.diversion', reply: 'mara.diversion', when: [F('saw_diversion')] },
  { npc: 'rillford_reeve', ask: 'hero.ask.choose', reply: 'mara.choose', when: [before] },
  { npc: 'rillford_reeve', reply: 'mara.hear', when: [before], again: true },
  { npc: 'rillford_reeve', reply: 'mara.after.rillford', when: [settled, alloc('rillford')], again: true },
  { npc: 'rillford_reeve', reply: 'mara.after.quarry', when: [settled, alloc('quarry')], again: true },
  { npc: 'rillford_reeve', reply: 'mara.after.rotation', when: [settled, alloc('rotation')], again: true },

  { npc: 'spring_steward', reply: 'edda.intro' },
  { npc: 'spring_steward', ask: 'hero.ask.failing', reply: 'edda.failing', when: [before] },
  { npc: 'spring_steward', ask: 'hero.ask.gate', reply: 'edda.gate', when: [before] },
  { npc: 'spring_steward', ask: 'hero.ask.accord', reply: 'edda.accord' },
  { npc: 'spring_steward', ask: 'hero.ask.rite', reply: 'edda.rite.ask', when: [before] },
  { npc: 'spring_steward', reply: 'edda.log', when: [F('saw_inspection_gap')] },
  { npc: 'spring_steward', reply: 'edda.rite', when: [before, has('reduced_spring_flow')], again: true },
  { npc: 'spring_steward', reply: 'edda.after.rotation', when: [settled, alloc('rotation')], again: true },
  { npc: 'spring_steward', reply: 'edda.after', when: [settled, { t: 'not', c: alloc('rotation') }], again: true },

  { npc: 'quarry_foreman', reply: 'darin.intro' },
  { npc: 'quarry_foreman', ask: 'hero.ask.wait', reply: 'darin.wait', when: [before] },
  { npc: 'quarry_foreman', ask: 'hero.ask.ila', reply: 'darin.ila', when: [stranded] },
  { npc: 'quarry_foreman', ask: 'hero.ask.lever', reply: 'darin.lever', when: [stranded] },
  { npc: 'quarry_foreman', ask: 'hero.ask.marchers', reply: 'darin.marchers' },
  { npc: 'quarry_foreman', reply: 'darin.safe', when: [rescued] },
  { npc: 'quarry_foreman', reply: 'darin.seep', when: [before, has('diversion_and_seep')], again: true },
  { npc: 'quarry_foreman', reply: 'darin.after.quarry', when: [settled, alloc('quarry')], again: true },
  { npc: 'quarry_foreman', reply: 'darin.after.rotation', when: [settled, alloc('rotation')], again: true },
  { npc: 'quarry_foreman', reply: 'darin.after.rillford', when: [settled, alloc('rillford')], again: true },

  { npc: 'maintenance_worker', reply: 'ila.ledge', when: [stranded] },
  { npc: 'maintenance_worker', ask: 'hero.ask.down', reply: 'ila.down', when: [stranded] },
  { npc: 'maintenance_worker', ask: 'hero.ask.gully', reply: 'ila.notnow', when: [stranded] },
  { npc: 'maintenance_worker', reply: 'ila.waiting', when: [stranded], again: true },
  { npc: 'maintenance_worker', reply: 'ila.saw', when: [rescued] },
  { npc: 'maintenance_worker', ask: 'hero.ask.close', reply: 'ila.close', when: [rescued] },
  { npc: 'maintenance_worker', ask: 'hero.ask.from', reply: 'ila.from', when: [rescued] },
  { npc: 'maintenance_worker', ask: 'hero.ask.stay', reply: 'ila.stay', when: [rescued] },
  { npc: 'maintenance_worker', reply: 'ila.villain', when: [rescued], again: true },

  { npc: 'estate_steward', reply: 'oren.intro' },
  { npc: 'estate_steward', ask: 'hero.ask.reserve', reply: 'oren.reserve', when: [before] },
  { npc: 'estate_steward', ask: 'hero.ask.sufficient', reply: 'oren.reserve.truth', when: [before] },
  { npc: 'estate_steward', ask: 'hero.ask.owns', reply: 'oren.owns' },
  { npc: 'estate_steward', ask: 'hero.ask.late', reply: 'oren.late', when: [before] },
  { npc: 'estate_steward', reply: 'oren.date', when: [before], again: true },
  { npc: 'estate_steward', reply: 'oren.after.quarry', when: [settled, alloc('quarry')], again: true },
  { npc: 'estate_steward', reply: 'oren.after', when: [settled, { t: 'not', c: alloc('quarry') }], again: true },

  { npc: 'ash_recorder', reply: 'sel.intro' },
  { npc: 'ash_recorder', ask: 'hero.ask.write', reply: 'sel.write' },
  { npc: 'ash_recorder', ask: 'hero.ask.witness', reply: 'sel.witness' },
  { npc: 'ash_recorder', ask: 'hero.ask.me', reply: 'sel.me' },
  { npc: 'ash_recorder', reply: 'sel.pattern', when: [unsettled], again: true },
  { npc: 'ash_recorder', reply: 'sel.after', when: [settled], again: true },

  { npc: 'shrine_warden', reply: 'tolan.intro' },
  { npc: 'shrine_warden', ask: 'hero.ask.archive', reply: 'tolan.archive' },
  { npc: 'shrine_warden', ask: 'hero.ask.see', reply: 'tolan.see', when: [unsettled] },
  { npc: 'shrine_warden', ask: 'hero.ask.templar', reply: 'tolan.templar' },
  { npc: 'shrine_warden', reply: 'tolan.guard', again: true, when: [unsettled] },
  { npc: 'shrine_warden', reply: 'tolan.after', when: [settled], again: true },

  { npc: 'mill_hand', reply: 'bess.intro', when: [unsettled] },
  { npc: 'mill_hand', ask: 'hero.ask.grain', reply: 'bess.grain', when: [unsettled] },
  { npc: 'mill_hand', ask: 'hero.ask.built', reply: 'bess.built' },
  { npc: 'mill_hand', ask: 'hero.ask.mill', reply: 'bess.mill', when: [unsettled], again: true },
  { npc: 'mill_hand', reply: 'bess.after.rillford', when: [settled, alloc('rillford')], again: true },
  { npc: 'mill_hand', reply: 'bess.after', when: [settled, { t: 'not', c: alloc('rillford') }], again: true },

  { npc: 'quarry_hand', reply: 'pell.intro', when: [unsettled] },
  { npc: 'quarry_hand', ask: 'hero.ask.ila', reply: 'pell.ila', when: [stranded] },
  { npc: 'quarry_hand', ask: 'hero.ask.darin', reply: 'pell.darin' },
  { npc: 'quarry_hand', ask: 'hero.ask.sleep', reply: 'pell.sleep' },
  { npc: 'quarry_hand', reply: 'pell.after.rotation', when: [settled, alloc('rotation')], again: true },
  { npc: 'quarry_hand', reply: 'pell.after.quarry', when: [settled, alloc('quarry')], again: true },
  { npc: 'quarry_hand', reply: 'pell.intro', when: [unsettled], again: true },

  { npc: 'village_baker', reply: 'hesper.intro', when: [unsettled] },
  { npc: 'village_baker', ask: 'hero.ask.help', reply: 'hesper.help', when: [unsettled] },
  { npc: 'village_baker', ask: 'hero.ask.bake', reply: 'hesper.bake' },
  { npc: 'village_baker', ask: 'hero.ask.village', reply: 'hesper.village', when: [unsettled], again: true },
  { npc: 'village_baker', reply: 'hesper.after.rillford', when: [settled, alloc('rillford')], again: true },
  { npc: 'village_baker', reply: 'hesper.after', when: [settled, { t: 'not', c: alloc('rillford') }], again: true },
  { npc: 'trail_hunter', reply: 'rowan.bark.supplies', again: true },
];

/** Overheard: people near each other at work or at rest, talking between themselves. */
export const SCENES: Scene[] = [
  {
    id: 'quarry.waiting', cast: ['quarry_foreman', 'quarry_hand'], hours: [7, 18], when: [before],
    lines: ['darin.scene.blocks', 'pell.scene.dry', 'darin.scene.well', 'pell.scene.uphill', 'darin.scene.contract', 'pell.scene.says'],
  },
  {
    id: 'quarry.working', cast: ['quarry_foreman', 'quarry_hand'], hours: [7, 18], when: [settled, quarryWorking],
    lines: ['darin.scene.load', 'pell.scene.count', 'darin.scene.used'],
  },
  {
    id: 'mill.dry', cast: ['mill_hand', 'rillford_reeve'], hours: [12, 17], when: [before],
    lines: ['bess.scene.dry', 'mara.scene.cansee', 'bess.scene.counting', 'mara.scene.counting'],
  },
  {
    id: 'mill.turning', cast: ['mill_hand', 'rillford_reeve'], hours: [12, 17], when: [settled, alloc('rillford')],
    lines: ['bess.scene.listen', 'mara.scene.hear', 'bess.scene.promise'],
  },
  {
    id: 'square.evening', cast: ['village_baker', 'rillford_reeve'], hours: [17, 20], when: [unsettled],
    lines: ['hesper.scene.word', 'mara.scene.broken', 'hesper.scene.flour', 'mara.scene.three', 'hesper.scene.quick'],
  },
  {
    id: 'square.settled', cast: ['village_baker', 'rillford_reeve'], hours: [17, 20], when: [settled],
    lines: ['hesper.scene.loaves', 'mara.scene.share', 'hesper.scene.warm'],
  },
];

/** The hero's own remarks, by what prompted them. Several lines for one cue are taken in turn. */
export type HeroCue =
  | 'arrival' | 'arrival.bell' | `place.${PlaceId}` | `inspect.${string}` | `item.${ItemId}`
  | 'blade' | 'beast' | 'wounded' | 'respawn' | 'victory' | 'settled' | 'night' | 'dawn'
  | 'rescued' | 'shortcut' | 'rite' | 'gate.stabilized' | 'gate.jammed';

export const HERO_LINES: Partial<Record<HeroCue, string[]>> = {
  arrival: ['hero.arrival'],
  'arrival.bell': ['hero.arrival.bell'],
  blade: ['hero.blade'],
  beast: ['hero.beast'],
  wounded: ['hero.wounded.1', 'hero.wounded.2'],
  respawn: ['hero.respawn.1', 'hero.respawn.2'],
  victory: ['hero.victory'],
  settled: ['hero.settled'],
  night: ['hero.night'],
  dawn: ['hero.dawn'],
  rescued: ['hero.rescued'],
  shortcut: ['hero.shortcut'],
  rite: ['hero.rite'],
  'gate.stabilized': ['hero.gate.stabilized'],
  'gate.jammed': ['hero.gate.jammed'],
};
// Places, inspections and finds: one line each, named after what prompted it.
for (const id of Object.keys(VOICE_LINES)) {
  const m = /^hero\.(place|inspect|item)\.(.+)$/.exec(id);
  if (m) HERO_LINES[`${m[1]}.${m[2]}` as HeroCue] = [id];
}

/** Display names for spoken captions. */
export const SPEAKER_NAMES: Record<Speaker, string> = {
  trail_hunter: 'Rowan Vale',
  hero: 'You',
  caravan_master: 'Joss Merrin',
  rillford_reeve: 'Mara Venn',
  spring_steward: 'Sister Edda',
  quarry_foreman: 'Darin Kest',
  maintenance_worker: 'Ila Rusk',
  estate_steward: 'Oren Halvek',
  ash_recorder: 'Sel Anrit',
  shrine_warden: 'Tolan Harrow',
  mill_hand: 'Bess Corran',
  quarry_hand: 'Pell Dunmore',
  village_baker: 'Hesper Lowe',
};
