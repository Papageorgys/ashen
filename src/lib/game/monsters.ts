import type { ItemId } from "./data";

/* --------------------------------- Bestiary -------------------------------- */

/** Broad kin of a creature — drives essence, behaviour and what it can carry. */
export type MonsterFamily =
  | "humanoid"
  | "beast"
  | "undead"
  | "demon"
  | "dragonkin"
  | "construct"
  | "insect"
  | "spirit"
  | "plant";

export const FAMILY_LABEL: Record<MonsterFamily, string> = {
  humanoid: "Humanoid",
  beast: "Beast",
  undead: "Undead",
  demon: "Demon",
  dragonkin: "Dragonkin",
  construct: "Construct",
  insect: "Insect",
  spirit: "Spirit",
  plant: "Plant",
};

export const FAMILY_BLURB: Record<MonsterFamily, string> = {
  humanoid: "Tool-users. They carry coin, steel and armour — the only kin that drops equipment.",
  beast: "Fur, claw and hunger. Hides and sinew, never gear.",
  undead: "Bound bone and grave-rot. Rich in dust, poor in loot.",
  demon: "Rift-born. Their ash burns hot in the market's crucibles.",
  dragonkin: "Scaled and old. The rarest materials in the realm.",
  construct: "Stone and clockwork. They shed ore, not spoils.",
  insect: "Swarming chitin. Cheap kills, plentiful essence.",
  spirit: "Half-there things that leave only silk and residue.",
  plant: "Rooted horrors that fight back when cut.",
};

export interface Monster {
  id: string;
  name: string;
  zoneId: string;
  family: MonsterFamily;
  /** the creature's people or breed, e.g. Orc, Wolfkin, Revenant */
  race: string;
  level: number;
  /** relative encounter weight within the zone */
  weight: number;
  elite?: boolean;
  blurb: string;
}

const M = (
  id: string,
  name: string,
  zoneId: string,
  family: MonsterFamily,
  race: string,
  level: number,
  weight: number,
  blurb: string,
  elite = false,
): Monster => ({ id, name, zoneId, family, race, level, weight, blurb, ...(elite ? { elite: true } : {}) });

export const MONSTERS: Monster[] = [
  // ---- Greywolf Fields (1)
  M("gw_pup", "Greywolf Yearling", "wolf_fields", "beast", "Wolfkin", 2, 5, "Half-grown and twice as reckless."),
  M("gw_wolf", "Greywolf Stalker", "wolf_fields", "beast", "Wolfkin", 4, 4, "Circles the wheat until the wind turns."),
  M("gw_scav", "Field Scavenger", "wolf_fields", "humanoid", "Outcast Man", 3, 3, "A starving man with a farm knife and no name."),
  M("gw_crow", "Carrion Sprite", "wolf_fields", "spirit", "Mote", 3, 2, "Follows the packs, feeding on the leavings."),
  M("gw_alpha", "Bonecoat, Pack Alpha", "wolf_fields", "beast", "Wolfkin", 8, 1, "Wears the ribs of the last hunter who tried.", true),

  // ---- Millpond Reeds (5)
  M("mp_rat", "Drowned Ratkin", "millpond_reeds", "beast", "Ratkin", 6, 5, "Bloated, bold, and never alone."),
  M("mp_leech", "Reed Leech", "millpond_reeds", "insect", "Bloodworm", 5, 4, "Drops from the stalks without a sound."),
  M("mp_poacher", "Millpond Poacher", "millpond_reeds", "humanoid", "Outcast Man", 7, 3, "Traps the reeds and anyone who walks them."),
  M("mp_toad", "Fenmaw Toad", "millpond_reeds", "beast", "Amphibian", 6, 3, "Swallows things its own size."),
  M("mp_miller", "The Drowned Miller", "millpond_reeds", "undead", "Revenant", 11, 1, "Still turning a wheel that rotted out a century ago.", true),

  // ---- Howling Warren (8, dungeon)
  M("hw_vermin", "Warren Gnasher", "howling_warren", "beast", "Ratkin", 9, 5, "Teeth first, always."),
  M("hw_goblin", "Warren Goblin", "howling_warren", "humanoid", "Goblin", 10, 4, "Small, filthy, armed with somebody else's blade."),
  M("hw_shaman", "Goblin Bonespeaker", "howling_warren", "humanoid", "Goblin", 11, 3, "Chants in a language it invented last week."),
  M("hw_spider", "Tunnel Weaver", "howling_warren", "insect", "Arachne", 9, 3, "Strings the low passages at throat height."),
  M("hw_king", "Grubmother of the Warren", "howling_warren", "insect", "Arachne", 15, 1, "The tunnels are her egg sac.", true),

  // ---- Briar Downs (9)
  M("bd_horn", "Briar Ram", "briar_downs", "beast", "Hornbeast", 10, 5, "Charges through thorn as if it were mist."),
  M("bd_boar", "Thornhide Boar", "briar_downs", "beast", "Swinekin", 11, 4, "Its bristles have gone woody with age."),
  M("bd_bandit", "Downs Cutpurse", "briar_downs", "humanoid", "Bandit", 11, 3, "Works the hill road with three friends and a whistle."),
  M("bd_briar", "Waking Bramble", "briar_downs", "plant", "Thornling", 10, 3, "Grabs an ankle, then a throat."),
  M("bd_lord", "Sirl the Thorn Baron", "briar_downs", "humanoid", "Bandit", 16, 1, "Crowned himself over four hills and a bridge toll.", true),

  // ---- Ruined Orchard (12)
  M("ro_scare", "Restless Scarecrow", "ruined_orchard", "construct", "Effigy", 13, 5, "Straw, nails and a grudge."),
  M("ro_blight", "Blightroot Sapling", "ruined_orchard", "plant", "Blightling", 13, 4, "Fruits in black. Do not eat."),
  M("ro_ghoul", "Orchard Ghoul", "ruined_orchard", "undead", "Ghoul", 14, 3, "Buried under the trees, and unhappy about it."),
  M("ro_reaver", "Orchard Reaver", "ruined_orchard", "humanoid", "Deserter", 14, 3, "Sold his colours for a barrel of cider."),
  M("ro_warden", "The Hollow Warden", "ruined_orchard", "construct", "Effigy", 19, 1, "Still walking the rows it was built to guard.", true),

  // ---- Sunken Crypt (15, dungeon)
  M("sc_skel", "Oathbound Skeleton", "sunken_crypt", "undead", "Skeleton", 16, 5, "Its oath outlasted its tongue."),
  M("sc_wight", "Crypt Wight", "sunken_crypt", "undead", "Wight", 17, 4, "Cold enough to fog steel."),
  M("sc_robber", "Tomb Robber", "sunken_crypt", "humanoid", "Bandit", 16, 3, "Came for the gold, stayed as furniture."),
  M("sc_shade", "Vault Shade", "sunken_crypt", "spirit", "Shade", 17, 3, "Only visible in the corner of an eye."),
  M("sc_knight", "Sir Adrec, Drowned Knight", "sunken_crypt", "undead", "Revenant", 22, 1, "Still answers a challenge, politely.", true),

  // ---- Kingsroad Marches (17)
  M("km_deserter", "Kingsroad Deserter", "kingsroad_marches", "humanoid", "Deserter", 18, 5, "Fled a war that nobody won."),
  M("km_brigand", "Verge Brigand", "kingsroad_marches", "humanoid", "Bandit", 18, 4, "Charges a toll on a road he does not own."),
  M("km_hound", "Roadside Houndkin", "kingsroad_marches", "beast", "Wolfkin", 17, 3, "Fed on the losing side of an ambush."),
  M("km_wraith", "Milestone Wraith", "kingsroad_marches", "spirit", "Shade", 19, 2, "Marks distance to a town that burned."),
  M("km_captain", "Captain Vaugh, the Unpaid", "kingsroad_marches", "humanoid", "Deserter", 24, 1, "Keeps his company's standard and its bad habits.", true),

  // ---- Saltmere Flats (20)
  M("sm_crab", "Brine Chitin", "saltmere_flats", "insect", "Crustacean", 21, 5, "Shell crusted white, edge underneath."),
  M("sm_salt", "Saltbound Husk", "saltmere_flats", "undead", "Husk", 21, 4, "Preserved perfectly. Still walking."),
  M("sm_raider", "Saltmere Raider", "saltmere_flats", "humanoid", "Corsair", 22, 3, "Works the pans between tides."),
  M("sm_elem", "Brine Wisp", "saltmere_flats", "spirit", "Elemental", 21, 3, "Tastes of the sea and stings like it."),
  M("sm_lord", "The Pale Harvester", "saltmere_flats", "undead", "Husk", 27, 1, "Rakes the salt for bodies that are not there yet.", true),

  // ---- Drowned Chapel (21, dungeon)
  M("dc_choir", "Choirbone Cantor", "drowned_chapel", "undead", "Skeleton", 22, 5, "Sings underwater without a breath."),
  M("dc_acolyte", "Sunken Acolyte", "drowned_chapel", "humanoid", "Cultist", 23, 4, "Never stopped kneeling."),
  M("dc_font", "Fontborn Spirit", "drowned_chapel", "spirit", "Shade", 23, 3, "Pours out of the holy water and reforms."),
  M("dc_eel", "Nave Eel", "drowned_chapel", "beast", "Serpent", 22, 3, "Nests in the collapsed pews."),
  M("dc_priest", "The Grey Cantor", "drowned_chapel", "humanoid", "Cultist", 28, 1, "Still leads the service. Attendance is mandatory.", true),

  // ---- Ashen Steppe (24)
  M("as_beast", "Ashmane Prowler", "ashen_steppe", "beast", "Lionkin", 25, 5, "Grey on grey until it moves."),
  M("as_orc", "Steppe Orc Raider", "ashen_steppe", "humanoid", "Orc", 26, 4, "Rides down anything slower than a horse."),
  M("as_cinder", "Cinder Wisp", "ashen_steppe", "spirit", "Elemental", 25, 3, "Ash that never settled."),
  M("as_bull", "Ashhorn Bull", "ashen_steppe", "beast", "Hornbeast", 26, 3, "Turns the plain to smoke when it runs."),
  M("as_warlord", "Ghazruk the Ashbanner", "ashen_steppe", "humanoid", "Orc", 32, 1, "Rides under a standard stitched from banners he took.", true),

  // ---- Ashen Quarry (27, dungeon)
  M("aq_golem", "Quarry Golem", "ashen_quarry", "construct", "Golem", 28, 5, "Cut from the vein it guards."),
  M("aq_dwarf", "Renegade Stonewright", "ashen_quarry", "humanoid", "Dwarf", 29, 4, "Sold the quarry's secrets, then took the quarry."),
  M("aq_elemental", "Emberveined Elemental", "ashen_quarry", "spirit", "Elemental", 29, 3, "Molten stone with an opinion."),
  M("aq_beetle", "Slagshell Beetle", "ashen_quarry", "insect", "Chitinid", 28, 3, "Chews ore and spits the rest."),
  M("aq_foreman", "The Overseer of Cuts", "ashen_quarry", "construct", "Golem", 34, 1, "Counts the stone, and now counts you.", true),

  // ---- Emberwood (29)
  M("ew_treant", "Smouldering Treant", "emberwood", "plant", "Treant", 30, 5, "Burning from the inside for a hundred years."),
  M("ew_imp", "Emberimp", "emberwood", "demon", "Imp", 30, 4, "Sets what is left of the canopy alight for fun."),
  M("ew_hunter", "Charcoal Hunter", "emberwood", "humanoid", "Outcast Man", 31, 3, "Lives off what the fire drives out."),
  M("ew_stag", "Cinderstag", "emberwood", "beast", "Hornbeast", 30, 3, "Antlers glowing like a banked hearth."),
  M("ew_heart", "Heartwood, the Ever-Burning", "emberwood", "plant", "Treant", 36, 1, "The tree the fire started in, and never left.", true),

  // ---- Moonveil Glade (32)
  M("mg_spider", "Silverweave Spider", "moonveil_glade", "insect", "Arachne", 33, 5, "Its thread is worth more than its life."),
  M("mg_sylph", "Moonveil Sylph", "moonveil_glade", "spirit", "Fey", 33, 4, "Laughs from three directions at once."),
  M("mg_elf", "Glade Exile", "moonveil_glade", "humanoid", "Exiled Elf", 34, 3, "Cast out, and taking it out on travellers."),
  M("mg_owl", "Mistfeather Owl", "moonveil_glade", "beast", "Raptor", 33, 3, "Silent until it is already on you."),
  M("mg_lady", "The Veiled Lady", "moonveil_glade", "spirit", "Fey", 39, 1, "Grants one wish, in the worst possible reading.", true),

  // ---- Obsidian Labyrinth (33, dungeon)
  M("ol_sentinel", "Glass Sentinel", "obsidian_labyrinth", "construct", "Golem", 34, 5, "Reflects you back holding your own sword."),
  M("ol_cultist", "Labyrinth Cultist", "obsidian_labyrinth", "humanoid", "Cultist", 35, 4, "Maps the maze in blood on their own arms."),
  M("ol_shade", "Corridor Shade", "obsidian_labyrinth", "spirit", "Shade", 34, 3, "Walks the wall beside you."),
  M("ol_hound", "Obsidian Hound", "obsidian_labyrinth", "demon", "Hellhound", 35, 3, "Made of the black glass it hunts across."),
  M("ol_architect", "The Architect's Remnant", "obsidian_labyrinth", "construct", "Golem", 41, 1, "Still redrawing the corridors behind you.", true),

  // ---- Frost Hollow (36)
  M("fh_wolf", "Hollowfang Wolf", "frost_hollow", "beast", "Wolfkin", 37, 5, "Breath freezes before it reaches you."),
  M("fh_giant", "Frostbound Marauder", "frost_hollow", "humanoid", "Frost Giant", 38, 4, "Twice a man's height and half as patient."),
  M("fh_wisp", "Rime Wisp", "frost_hollow", "spirit", "Elemental", 37, 3, "Cold enough to crack a blade."),
  M("fh_bear", "Glacier Maul", "frost_hollow", "beast", "Bearkin", 38, 3, "Sleeps under the ice and wakes badly."),
  M("fh_jarl", "Jarl Hrekka Icebrand", "frost_hollow", "humanoid", "Frost Giant", 44, 1, "Keeps a hall of frozen challengers, all standing.", true),

  // ---- Gate of the Abyss (40, dungeon)
  M("ag_imp", "Rift Tormentor", "abyss_gate", "demon", "Imp", 41, 5, "Pours through the gap in twos and threes."),
  M("ag_reaver", "Abyssal Reaver", "abyss_gate", "demon", "Fiend", 42, 4, "Six arms, all of them holding something."),
  M("ag_thrall", "Gate Thrall", "abyss_gate", "humanoid", "Cultist", 42, 3, "Opened the door and could not close it."),
  M("ag_maw", "Voidmaw Crawler", "abyss_gate", "insect", "Chitinid", 41, 3, "Eats the light around it."),
  M("ag_warden", "Warden of the Threshold", "abyss_gate", "demon", "Fiend", 48, 1, "Nothing has gone through it in an age.", true),

  // ---- Stormbreak Coast (41)
  M("sb_corsair", "Wreckline Corsair", "stormbreak_coast", "humanoid", "Corsair", 42, 5, "Salvages ships that have not sunk yet."),
  M("sb_elem", "Stormcalled Fury", "stormbreak_coast", "spirit", "Elemental", 43, 4, "Lightning with a temper and a shape."),
  M("sb_drake", "Galewing Drake", "stormbreak_coast", "dragonkin", "Drake", 43, 3, "Rides the squall line hunting."),
  M("sb_husk", "Sailor's Husk", "stormbreak_coast", "undead", "Husk", 42, 3, "Crawled up the cliff and kept crawling."),
  M("sb_captain", "Captain Morran the Drowned", "stormbreak_coast", "humanoid", "Corsair", 49, 1, "Sails a hull with no bottom left.", true),

  // ---- The Frozen Hold (44, dungeon)
  M("fz_sentry", "Hold Sentry", "frozen_hold", "construct", "Golem", 45, 5, "Dwarven make. Still on shift."),
  M("fz_dwarf", "Icebound Vaultguard", "frozen_hold", "humanoid", "Dwarf", 46, 4, "Frozen mid-oath at the vault door."),
  M("fz_wyrm", "Hoarfrost Wyrmling", "frozen_hold", "dragonkin", "Wyrmling", 46, 3, "Nested in the treasury and grew into it."),
  M("fz_spirit", "Vault Revenant", "frozen_hold", "undead", "Revenant", 45, 3, "Counts the hoard nightly, aloud."),
  M("fz_king", "Thane Durrik, Sealed Within", "frozen_hold", "humanoid", "Dwarf", 52, 1, "Sealed the hold himself and never opened it.", true),

  // ---- Wyrm Plateau (46)
  M("wp_drake", "Plateau Drake", "wyrm_plateau", "dragonkin", "Drake", 47, 5, "Comes down out of the sun."),
  M("wp_kin", "Scalekin Raider", "wyrm_plateau", "humanoid", "Scalekin", 48, 4, "Serves the wyrms and takes their leavings."),
  M("wp_roc", "Cragwing Roc", "wyrm_plateau", "beast", "Raptor", 47, 3, "Carries off armoured men without slowing."),
  M("wp_elem", "Windshear Spirit", "wyrm_plateau", "spirit", "Elemental", 47, 3, "The wind that strips the plateau bare."),
  M("wp_matron", "Vashkir the Sky-Matron", "wyrm_plateau", "dragonkin", "Wyrm", 54, 1, "Every drake on the plateau is hers.", true),

  // ---- The Cinderwaste (49)
  M("cw_walker", "Unburnt Walker", "cinderwaste", "undead", "Husk", 50, 5, "Walked out of the fire and never stopped."),
  M("cw_fiend", "Ashfiend", "cinderwaste", "demon", "Fiend", 51, 4, "Wears the ash like a coat."),
  M("cw_pilgrim", "Cinder Pilgrim", "cinderwaste", "humanoid", "Cultist", 50, 3, "Walking towards whatever started the burn."),
  M("cw_worm", "Emberworm", "cinderwaste", "insect", "Chitinid", 50, 3, "Tunnels under the ash and surfaces beneath you."),
  M("cw_tyrant", "Sear, the Last Flame", "cinderwaste", "demon", "Fiend", 56, 1, "The fire that made the waste, given a body.", true),

  // ---- Wyrm Roost (50, dungeon)
  M("wr_broodling", "Roost Broodling", "wyrm_roost", "dragonkin", "Wyrmling", 51, 5, "Small only by the standards of the roost."),
  M("wr_keeper", "Scalekin Roostkeeper", "wyrm_roost", "humanoid", "Scalekin", 52, 4, "Feeds the brood, and knows what they like."),
  M("wr_guard", "Bonecoil Guardian", "wyrm_roost", "construct", "Golem", 52, 3, "Built from the bones of the roost's dead."),
  M("wr_wyvern", "Cliffside Wyvern", "wyrm_roost", "dragonkin", "Drake", 52, 3, "Guards the approach with a barbed tail."),
  M("wr_lord", "Kaargoth, Roost-Lord", "wyrm_roost", "dragonkin", "Wyrm", 58, 1, "Older than the clan charters. Considerably.", true),

  // ---- The Sunless Throne (52, dungeon)
  M("st_guard", "Throneguard Revenant", "sunless_throne", "undead", "Revenant", 53, 5, "Died at the door and holds it still."),
  M("st_court", "Courtier of Dust", "sunless_throne", "undead", "Wight", 54, 4, "Bows, then draws."),
  M("st_champion", "Champion of the Black Crown", "sunless_throne", "humanoid", "Deathsworn", 55, 3, "Swore to a corpse and meant it."),
  M("st_horror", "Throne Horror", "sunless_throne", "demon", "Fiend", 54, 3, "Whatever the crown made of its last bearer."),
  M("st_king", "The Last Dead King", "sunless_throne", "undead", "Revenant", 60, 1, "Holds court over nothing, forever.", true),
];

export const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map((m) => [m.id, m])) as Record<string, Monster>;

const BY_ZONE = MONSTERS.reduce<Record<string, Monster[]>>((acc, m) => {
  (acc[m.zoneId] ??= []).push(m);
  return acc;
}, {});

export function zoneMonsters(zoneId: string): Monster[] {
  return BY_ZONE[zoneId] ?? [];
}

export function isHumanoid(m: Monster | undefined) {
  return m?.family === "humanoid";
}

/** Elites hit harder and pay better — the numbers every system reads. */
export const ELITE = {
  /** chance any single encounter slot rolls the zone's elite */
  chanceField: 0.14,
  chanceDungeon: 0.22,
  xpMult: 1.35,
  goldMult: 1.4,
  /** flat bonus to every drop roll on the run */
  dropBonus: 0.1,
  /** the elite hits the banner this much harder */
  threatMult: 1.25,
} as const;

/**
 * Only tool-using kin carry gear. These are the pools a humanoid can hand over,
 * chosen by the zone's recommended level.
 */
export const HUMANOID_GEAR: { maxLevel: number; chance: number; items: ItemId[] }[] = [
  { maxLevel: 14, chance: 0.1, items: ["apprentice_tunic", "training_blade", "oath_ring", "wayfarer_mail"] },
  { maxLevel: 24, chance: 0.085, items: ["iron_blade", "hide_mail", "oak_focus", "acolyte_robe", "brigand_plate", "silver_earring"] },
  { maxLevel: 37, chance: 0.06, items: ["duskiron_blade", "plated_mail", "spirit_focus", "duskweave_robe", "hunters_leather", "ember_pendant"] },
  { maxLevel: 99, chance: 0.035, items: ["moonweave_robe", "ember_greatsword", "abyss_plate", "wyrmscale_coat", "abyss_ring", "wyrm_torc"] },
];

export function humanoidGearPool(zoneLevel: number) {
  return HUMANOID_GEAR.find((b) => zoneLevel <= b.maxLevel) ?? HUMANOID_GEAR[HUMANOID_GEAR.length - 1]!;
}

/** What the party met and killed on one run. */
export interface Encounter {
  monsterId: string;
  kills: number;
  elite: boolean;
}

/** Lifetime bestiary record for one creature. */
export interface BestiaryEntry {
  kills: number;
  elites: number;
  firstAt: number;
  lastAt: number;
}
