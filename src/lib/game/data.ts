// Static game data: races, classes, skills, zones, items, recipes, contracts.
// Names are original, inspired by classic MMO clan management.

export type Role = "guardian" | "blade" | "archer" | "arcanist" | "mender" | "chanter" | "artisan";

export const ROLE_LABEL: Record<Role, string> = {
  guardian: "Guardian",
  blade: "Blade",
  archer: "Archer",
  arcanist: "Arcanist",
  mender: "Mender",
  chanter: "Chanter",
  artisan: "Artisan",
};

export const MAX_LEVEL = 52;
export const MAX_SKILL_LEVEL = 100;

export type RaceId = "hyunan" | "sylvani" | "nocturi" | "grakhar" | "durgan" | "kaemari";

/** Classic MMO stat block. */
export interface Stats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wit: number;
  men: number;
}

export const STAT_LABEL: Record<keyof Stats, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wit: "WIT",
  men: "MEN",
};

export interface Passive {
  name: string;
  desc: string;
  /** flat/percent effects applied by the engine */
  power?: number; // % power
  hp?: number; // % hp
  mp?: number; // % mp
  find?: number; // flat find
  craft?: number; // craft chance points
  regen?: number; // % regen speed
  mitigation?: number; // % damage taken reduction
}

export interface Race {
  id: RaceId;
  name: string;
  blurb: string;
  stats: Stats;
  luck: number;
  passive: Passive;
}

export const RACES: Race[] = [
  {
    id: "hyunan",
    name: "Ashborn Human",
    blurb: "Adaptable survivors of the imperial heartland — the forgiving first blade.",
    stats: { str: 40, dex: 30, con: 43, int: 21, wit: 11, men: 25 },
    luck: 1,
    passive: {
      name: "River Discipline",
      desc: "+5% power, +5% HP — trained from birth.",
      power: 5,
      hp: 5,
    },
  },
  {
    id: "sylvani",
    name: "Sylvan Elf",
    blurb: "Longlived wardens of the deep groves — scouts, rangers, and mobile skirmishers.",
    stats: { str: 36, dex: 35, con: 36, int: 23, wit: 14, men: 26 },
    luck: 1,
    passive: {
      name: "Grove Sight",
      desc: "+3 loot find, +10% out-of-combat recovery.",
      find: 3,
      regen: 10,
    },
  },
  {
    id: "nocturi",
    name: "Hollow-Touched",
    blurb: "Exiles who bargained with the dark — necrotic, and at home in the Hollow Covenant.",
    stats: { str: 41, dex: 32, con: 32, int: 25, wit: 12, men: 24 },
    luck: 0,
    passive: {
      name: "Dark Bargain",
      desc: "+8% power, -5% HP — the pact takes its cut.",
      power: 8,
      hp: -5,
    },
  },
  {
    id: "grakhar",
    name: "Emberkin",
    blurb: "Ash-blooded of the burnt steppe — the Ash runs hot and hard in them.",
    stats: { str: 44, dex: 29, con: 45, int: 18, wit: 12, men: 22 },
    luck: 0,
    passive: {
      name: "Ash Hide",
      desc: "+12% HP, 6% damage taken reduction.",
      hp: 12,
      mitigation: 6,
    },
  },
  {
    id: "durgan",
    name: "Highland Dwar",
    blurb: "Deep-forge smiths of the highlands — masters of siege and craft.",
    stats: { str: 39, dex: 27, con: 45, int: 20, wit: 10, men: 29 },
    luck: 3,
    passive: {
      name: "Forge Blood",
      desc: "+4 loot find, +4% clan craft success.",
      find: 4,
      craft: 4,
    },
  },
  {
    id: "kaemari",
    name: "Ferran Beastkin",
    blurb: "Winged wanderers bound to a soul-blade — keen of sense, deadly in the duel.",
    stats: { str: 40, dex: 34, con: 38, int: 23, wit: 13, men: 26 },
    luck: 1,
    passive: { name: "Soulbind", desc: "+6% power, +8% MP.", power: 6, mp: 8 },
  },
];

export type ArmorType = "robe" | "light" | "heavy";

export const ARMOR_LABEL: Record<ArmorType, string> = {
  robe: "Robe Mastery",
  light: "Light Mastery",
  heavy: "Heavy Mastery",
};

/** Which stat drives a role's damage/healing. */
export const ROLE_MAIN_STAT: Record<Role, keyof Stats> = {
  guardian: "str",
  blade: "str",
  archer: "dex",
  arcanist: "int",
  mender: "men",
  chanter: "wit",
  artisan: "dex",
};

export interface ClassDef {
  id: string;
  name: string;
  race: RaceId;
  role: Role;
  skills: [string, string];
  /** Combat power weights */
  power: number;
  /** Bonus to loot quantity */
  find: number;
  /** armour the class is trained in — wearing it grants the mastery bonus */
  armor: ArmorType;
  /** class stat modifiers on top of the racial block */
  mods: Partial<Stats>;
  passive: Passive;
}

export const CLASSES: ClassDef[] = [
  // Hyunan
  {
    id: "bulwark",
    name: "Bulwark Knight",
    race: "hyunan",
    role: "guardian",
    skills: ["Iron Vow", "Taunting Roar"],
    power: 9,
    find: 0,
    armor: "heavy",
    mods: { str: 4, con: 8 },
    passive: {
      name: "Shield Discipline",
      desc: "8% damage taken reduction, +8% HP.",
      mitigation: 8,
      hp: 8,
    },
  },
  {
    id: "duelist",
    name: "Twin Edge Duelist",
    race: "hyunan",
    role: "blade",
    skills: ["Cleaving Arc", "Sudden Step"],
    power: 12,
    find: 0,
    armor: "light",
    mods: { str: 6, dex: 6 },
    passive: { name: "Dual Wield", desc: "+8% power from twin blades.", power: 8 },
  },
  {
    id: "windshot",
    name: "Windshot Ranger",
    race: "hyunan",
    role: "archer",
    skills: ["Piercing Volley", "Falcon Mark"],
    power: 11,
    find: 1,
    armor: "light",
    mods: { dex: 9 },
    passive: { name: "Long Sight", desc: "+6% power, +2 loot find.", power: 6, find: 2 },
  },
  {
    id: "runecaster",
    name: "Runecaster",
    race: "hyunan",
    role: "arcanist",
    skills: ["Ember Sigil", "Frost Lattice"],
    power: 12,
    find: 0,
    armor: "robe",
    mods: { int: 9, wit: 4 },
    passive: { name: "Rune Reservoir", desc: "+15% MP.", mp: 15 },
  },
  {
    id: "lightbearer",
    name: "Lightbearer",
    race: "hyunan",
    role: "mender",
    skills: ["Dawn Mend", "Warding Halo"],
    power: 6,
    find: 0,
    armor: "robe",
    mods: { men: 9, wit: 3 },
    passive: { name: "Dawn Blessing", desc: "+12% MP, +10% recovery.", mp: 12, regen: 10 },
  },
  // Sylvani
  {
    id: "verdant",
    name: "Verdant Fencer",
    race: "sylvani",
    role: "blade",
    skills: ["Thorn Riposte", "Leafstep"],
    power: 11,
    find: 1,
    armor: "light",
    mods: { dex: 8, str: 3 },
    passive: {
      name: "Leafstep",
      desc: "+6% power, 4% damage taken reduction.",
      power: 6,
      mitigation: 4,
    },
  },
  {
    id: "gladeshot",
    name: "Gladeshot",
    race: "sylvani",
    role: "archer",
    skills: ["Silent Loose", "Bramble Trap"],
    power: 12,
    find: 2,
    armor: "light",
    mods: { dex: 10 },
    passive: { name: "Quiet Hunt", desc: "+3 loot find, +5% power.", find: 3, power: 5 },
  },
  {
    id: "tideweaver",
    name: "Tide Weaver",
    race: "sylvani",
    role: "arcanist",
    skills: ["Riptide Coil", "Mist Veil"],
    power: 11,
    find: 0,
    armor: "robe",
    mods: { int: 8, men: 4 },
    passive: { name: "Tidal Flow", desc: "+12% MP, +12% recovery.", mp: 12, regen: 12 },
  },
  {
    id: "lifebinder",
    name: "Lifebinder",
    race: "sylvani",
    role: "mender",
    skills: ["Bloom Suture", "Rootbound Ward"],
    power: 6,
    find: 1,
    armor: "robe",
    mods: { men: 10 },
    passive: { name: "Bloom", desc: "+15% recovery, +8% HP for the wearer.", regen: 15, hp: 8 },
  },
  // Nocturi
  {
    id: "duskblade",
    name: "Duskblade",
    race: "nocturi",
    role: "blade",
    skills: ["Gloom Lunge", "Bleeding Whisper"],
    power: 13,
    find: 0,
    armor: "light",
    mods: { str: 8, dex: 5 },
    passive: { name: "Gloom Edge", desc: "+10% power.", power: 10 },
  },
  {
    id: "shadowstalk",
    name: "Shadowstalker",
    race: "nocturi",
    role: "archer",
    skills: ["Nightshade Bolt", "Vanish"],
    power: 12,
    find: 2,
    armor: "light",
    mods: { dex: 10 },
    passive: {
      name: "Shadow Step",
      desc: "+4 loot find, 5% damage taken reduction.",
      find: 4,
      mitigation: 5,
    },
  },
  {
    id: "voidcaller",
    name: "Voidcaller",
    race: "nocturi",
    role: "arcanist",
    skills: ["Abyss Rift", "Soul Tether"],
    power: 14,
    find: 0,
    armor: "robe",
    mods: { int: 11 },
    passive: { name: "Void Draw", desc: "+12% power, -6% HP.", power: 12, hp: -6 },
  },
  {
    id: "hexbinder",
    name: "Hexbinder",
    race: "nocturi",
    role: "chanter",
    skills: ["Ruin Brand", "Silence Sigil"],
    power: 8,
    find: 1,
    armor: "robe",
    mods: { wit: 9, int: 4 },
    passive: { name: "Hexwork", desc: "+10% MP, +5% power.", mp: 10, power: 5 },
  },
  // Grakhar
  {
    id: "ironmaul",
    name: "Ironmaul",
    race: "grakhar",
    role: "guardian",
    skills: ["Anvil Guard", "Ground Shatter"],
    power: 10,
    find: 0,
    armor: "heavy",
    mods: { str: 6, con: 9 },
    passive: {
      name: "Anvil Body",
      desc: "+12% HP, 7% damage taken reduction.",
      hp: 12,
      mitigation: 7,
    },
  },
  {
    id: "frenzy",
    name: "Frenzy Raider",
    race: "grakhar",
    role: "blade",
    skills: ["Blood Rush", "Skull Split"],
    power: 14,
    find: 0,
    armor: "heavy",
    mods: { str: 11 },
    passive: { name: "Frenzy", desc: "+14% power, -8% HP.", power: 14, hp: -8 },
  },
  {
    id: "totem",
    name: "Totem Chanter",
    race: "grakhar",
    role: "chanter",
    skills: ["War Drums", "Ancestor Shout"],
    power: 7,
    find: 1,
    armor: "light",
    mods: { wit: 8, con: 4 },
    passive: { name: "War Drums", desc: "+8% MP, +6% HP.", mp: 8, hp: 6 },
  },
  {
    id: "spiritcall",
    name: "Spirit Shaman",
    race: "grakhar",
    role: "mender",
    skills: ["Ash Renewal", "Stormcall"],
    power: 8,
    find: 0,
    armor: "light",
    mods: { men: 8, int: 4 },
    passive: { name: "Ancestor Spirits", desc: "+12% recovery, +8% MP.", regen: 12, mp: 8 },
  },
  // Durgan
  {
    id: "runeguard",
    name: "Runeguard",
    race: "durgan",
    role: "guardian",
    skills: ["Deepstone Wall", "Rune Bash"],
    power: 10,
    find: 1,
    armor: "heavy",
    mods: { con: 10, men: 4 },
    passive: { name: "Deepstone", desc: "10% damage taken reduction.", mitigation: 10 },
  },
  {
    id: "prospector",
    name: "Prospector",
    race: "durgan",
    role: "artisan",
    skills: ["Pry Loose", "Vein Sense"],
    power: 5,
    find: 6,
    armor: "light",
    mods: { dex: 6, con: 4 },
    passive: { name: "Vein Sense", desc: "+6 loot find, +3% craft success.", find: 6, craft: 3 },
  },
  {
    id: "forgewright",
    name: "Forgewright",
    race: "durgan",
    role: "artisan",
    skills: ["Temper Steel", "Master Assembly"],
    power: 5,
    find: 4,
    armor: "heavy",
    mods: { str: 5, con: 5 },
    passive: {
      name: "Forgewright",
      desc: "+6% craft success on everything the clan makes.",
      craft: 6,
    },
  },
  // Kaemari
  {
    id: "soulhunter",
    name: "Soulhunter",
    race: "kaemari",
    role: "blade",
    skills: ["Soul Reap", "Wing Dash"],
    power: 13,
    find: 1,
    armor: "light",
    mods: { str: 7, dex: 6 },
    passive: { name: "Soul Reap", desc: "+9% power, +6% MP.", power: 9, mp: 6 },
  },
  {
    id: "windrider",
    name: "Windrider",
    race: "kaemari",
    role: "archer",
    skills: ["Gale Shot", "Updraft"],
    power: 12,
    find: 1,
    armor: "light",
    mods: { dex: 9, wit: 3 },
    passive: {
      name: "Updraft",
      desc: "+7% power, 4% damage taken reduction.",
      power: 7,
      mitigation: 4,
    },
  },
  {
    id: "sealkeeper",
    name: "Sealkeeper",
    race: "kaemari",
    role: "chanter",
    skills: ["Binding Seal", "Vigor Chant"],
    power: 8,
    find: 1,
    armor: "robe",
    mods: { wit: 8, men: 5 },
    passive: { name: "Binding Seals", desc: "+12% MP, +8% recovery.", mp: 12, regen: 8 },
  },
];

export const CLASS_BY_ID = Object.fromEntries(CLASSES.map((c) => [c.id, c])) as Record<
  string,
  ClassDef
>;
export const RACE_BY_ID = Object.fromEntries(RACES.map((r) => [r.id, r])) as Record<RaceId, Race>;

/* ---------------------------------- Skills --------------------------------- */

export type SkillKind = "attack" | "heal" | "buff" | "debuff";

export interface SkillDef {
  id: string;
  name: string;
  role: Role;
  kind: SkillKind;
  /** character level needed to learn */
  unlock: number;
  /** gold paid to the skill trainer */
  cost: number;
  mp: number;
  /** rounds before it can be used again */
  cooldown: number;
  /** damage / heal / buff scale */
  potency: number;
  desc: string;
}

/** Nine skills per role. Class signature names override the first two. */
const ROLE_SKILLS: Record<Role, Omit<SkillDef, "id" | "role">[]> = {
  guardian: [
    {
      name: "Shield Strike",
      kind: "attack",
      unlock: 1,
      cost: 300,
      mp: 8,
      cooldown: 0,
      potency: 0.9,
      desc: "Steady bash.",
    },
    {
      name: "Bulwark Stance",
      kind: "buff",
      unlock: 10,
      cost: 1400,
      mp: 18,
      cooldown: 4,
      potency: 0.25,
      desc: "Cuts damage taken by the party.",
    },
    {
      name: "Provoke",
      kind: "debuff",
      unlock: 20,
      cost: 4200,
      mp: 20,
      cooldown: 3,
      potency: 0.18,
      desc: "Pulls hits onto the guardian.",
    },
    {
      name: "Earthbreak",
      kind: "attack",
      unlock: 32,
      cost: 12000,
      mp: 40,
      cooldown: 3,
      potency: 2.2,
      desc: "Heavy area slam.",
    },
    {
      name: "Last Oath",
      kind: "heal",
      unlock: 44,
      cost: 30000,
      mp: 60,
      cooldown: 6,
      potency: 1.4,
      desc: "Emergency ward, restores the wounded.",
    },
    {
      name: "Shield Bash",
      kind: "debuff",
      unlock: 6,
      cost: 800,
      mp: 12,
      cooldown: 2,
      potency: 0.12,
      desc: "Staggers the beast, blunting its next blow.",
    },
    {
      name: "Iron Skin",
      kind: "buff",
      unlock: 16,
      cost: 3000,
      mp: 24,
      cooldown: 5,
      potency: 0.2,
      desc: "Hardens the guardian's own hide.",
    },
    {
      name: "Aegis Chain",
      kind: "buff",
      unlock: 26,
      cost: 7600,
      mp: 34,
      cooldown: 5,
      potency: 0.28,
      desc: "Links the party under one ward.",
    },
    {
      name: "Unbroken Wall",
      kind: "buff",
      unlock: 50,
      cost: 52000,
      mp: 85,
      cooldown: 8,
      potency: 0.45,
      desc: "The line does not fall while it holds.",
    },
  ],
  blade: [
    {
      name: "Slash",
      kind: "attack",
      unlock: 1,
      cost: 300,
      mp: 6,
      cooldown: 0,
      potency: 1.1,
      desc: "Fast cut.",
    },
    {
      name: "Rush",
      kind: "buff",
      unlock: 10,
      cost: 1400,
      mp: 16,
      cooldown: 4,
      potency: 0.3,
      desc: "Raises own damage for the fight.",
    },
    {
      name: "Rend",
      kind: "debuff",
      unlock: 20,
      cost: 4200,
      mp: 22,
      cooldown: 3,
      potency: 0.2,
      desc: "Bleeds the target's defence.",
    },
    {
      name: "Whirl of Edges",
      kind: "attack",
      unlock: 32,
      cost: 12000,
      mp: 38,
      cooldown: 2,
      potency: 2.4,
      desc: "Spinning storm of steel.",
    },
    {
      name: "Death Sentence",
      kind: "attack",
      unlock: 44,
      cost: 30000,
      mp: 70,
      cooldown: 6,
      potency: 4.2,
      desc: "Devastating finisher.",
    },
    {
      name: "Twin Fang",
      kind: "attack",
      unlock: 6,
      cost: 800,
      mp: 12,
      cooldown: 1,
      potency: 1.5,
      desc: "Two strikes in one breath.",
    },
    {
      name: "Bloodthirst",
      kind: "heal",
      unlock: 16,
      cost: 3000,
      mp: 20,
      cooldown: 4,
      potency: 0.8,
      desc: "Drinks life from the wound.",
    },
    {
      name: "Sundering Cut",
      kind: "debuff",
      unlock: 26,
      cost: 7600,
      mp: 30,
      cooldown: 3,
      potency: 0.24,
      desc: "Splits armour open.",
    },
    {
      name: "Storm of Blades",
      kind: "attack",
      unlock: 50,
      cost: 52000,
      mp: 95,
      cooldown: 7,
      potency: 5.2,
      desc: "A gale of steel across the field.",
    },
  ],
  archer: [
    {
      name: "Quick Shot",
      kind: "attack",
      unlock: 1,
      cost: 300,
      mp: 6,
      cooldown: 0,
      potency: 1.05,
      desc: "Snap arrow.",
    },
    {
      name: "Hunter's Eye",
      kind: "buff",
      unlock: 10,
      cost: 1400,
      mp: 16,
      cooldown: 5,
      potency: 0.28,
      desc: "Sharpens the whole volley.",
    },
    {
      name: "Crippling Arrow",
      kind: "debuff",
      unlock: 20,
      cost: 4200,
      mp: 20,
      cooldown: 3,
      potency: 0.16,
      desc: "Slows the beast.",
    },
    {
      name: "Storm of Shafts",
      kind: "attack",
      unlock: 32,
      cost: 12000,
      mp: 36,
      cooldown: 2,
      potency: 2.3,
      desc: "Arrow rain.",
    },
    {
      name: "Heartseeker",
      kind: "attack",
      unlock: 44,
      cost: 30000,
      mp: 64,
      cooldown: 6,
      potency: 4.0,
      desc: "One arrow, one throat.",
    },
    {
      name: "Barbed Shot",
      kind: "attack",
      unlock: 6,
      cost: 800,
      mp: 11,
      cooldown: 1,
      potency: 1.45,
      desc: "A hooked head that tears on the way out.",
    },
    {
      name: "Steady Aim",
      kind: "buff",
      unlock: 16,
      cost: 3000,
      mp: 22,
      cooldown: 5,
      potency: 0.22,
      desc: "Breath held, every shot bites.",
    },
    {
      name: "Bleeding Volley",
      kind: "debuff",
      unlock: 26,
      cost: 7600,
      mp: 28,
      cooldown: 3,
      potency: 0.22,
      desc: "Peppers the target until it bleeds out.",
    },
    {
      name: "Falling Sky",
      kind: "attack",
      unlock: 50,
      cost: 52000,
      mp: 90,
      cooldown: 7,
      potency: 5.0,
      desc: "The whole quiver at once.",
    },
  ],
  arcanist: [
    {
      name: "Ember Bolt",
      kind: "attack",
      unlock: 1,
      cost: 300,
      mp: 10,
      cooldown: 0,
      potency: 1.2,
      desc: "Cheap spell.",
    },
    {
      name: "Arcane Focus",
      kind: "buff",
      unlock: 10,
      cost: 1400,
      mp: 20,
      cooldown: 5,
      potency: 0.32,
      desc: "Boosts spell power.",
    },
    {
      name: "Curse of Ash",
      kind: "debuff",
      unlock: 20,
      cost: 4200,
      mp: 26,
      cooldown: 3,
      potency: 0.22,
      desc: "Weakens the target.",
    },
    {
      name: "Frost Cascade",
      kind: "attack",
      unlock: 32,
      cost: 12000,
      mp: 48,
      cooldown: 2,
      potency: 2.6,
      desc: "Freezing wave.",
    },
    {
      name: "Abyssal Collapse",
      kind: "attack",
      unlock: 44,
      cost: 30000,
      mp: 90,
      cooldown: 6,
      potency: 4.6,
      desc: "Tears open the void.",
    },
    {
      name: "Cinder Lance",
      kind: "attack",
      unlock: 6,
      cost: 800,
      mp: 16,
      cooldown: 1,
      potency: 1.6,
      desc: "A spear of white fire.",
    },
    {
      name: "Mana Well",
      kind: "buff",
      unlock: 16,
      cost: 3000,
      mp: 5,
      cooldown: 6,
      potency: 0.3,
      desc: "Draws mana back out of the air.",
    },
    {
      name: "Gravebind",
      kind: "debuff",
      unlock: 26,
      cost: 7600,
      mp: 32,
      cooldown: 4,
      potency: 0.26,
      desc: "Roots the beast in cold earth.",
    },
    {
      name: "Starfall",
      kind: "attack",
      unlock: 50,
      cost: 52000,
      mp: 115,
      cooldown: 7,
      potency: 5.6,
      desc: "Calls down burning sky.",
    },
  ],
  mender: [
    {
      name: "Mend Wounds",
      kind: "heal",
      unlock: 1,
      cost: 300,
      mp: 12,
      cooldown: 0,
      potency: 1.0,
      desc: "Heals the most wounded ally.",
    },
    {
      name: "Guardian Ward",
      kind: "buff",
      unlock: 10,
      cost: 1400,
      mp: 22,
      cooldown: 5,
      potency: 0.22,
      desc: "Shields the party.",
    },
    {
      name: "Purge",
      kind: "debuff",
      unlock: 20,
      cost: 4200,
      mp: 24,
      cooldown: 4,
      potency: 0.15,
      desc: "Strips the beast's fury.",
    },
    {
      name: "Greater Restoration",
      kind: "heal",
      unlock: 32,
      cost: 12000,
      mp: 55,
      cooldown: 3,
      potency: 2.4,
      desc: "Heals the whole party.",
    },
    {
      name: "Return from the Veil",
      kind: "heal",
      unlock: 44,
      cost: 30000,
      mp: 95,
      cooldown: 8,
      potency: 5.0,
      desc: "Pulls the fallen back up.",
    },
    {
      name: "Balm of Light",
      kind: "heal",
      unlock: 6,
      cost: 800,
      mp: 16,
      cooldown: 1,
      potency: 1.4,
      desc: "A quick warm mend.",
    },
    {
      name: "Blessing of Vigour",
      kind: "buff",
      unlock: 16,
      cost: 3000,
      mp: 26,
      cooldown: 5,
      potency: 0.2,
      desc: "Steadies tired arms.",
    },
    {
      name: "Sanctuary Circle",
      kind: "buff",
      unlock: 26,
      cost: 7600,
      mp: 38,
      cooldown: 6,
      potency: 0.3,
      desc: "Holy ground beneath the party.",
    },
    {
      name: "Tide of Life",
      kind: "heal",
      unlock: 50,
      cost: 52000,
      mp: 110,
      cooldown: 7,
      potency: 4.4,
      desc: "A flood of healing over everyone.",
    },
  ],
  chanter: [
    {
      name: "War Hymn",
      kind: "buff",
      unlock: 1,
      cost: 300,
      mp: 10,
      cooldown: 2,
      potency: 0.14,
      desc: "Party attack chant.",
    },
    {
      name: "Iron Cadence",
      kind: "buff",
      unlock: 10,
      cost: 1400,
      mp: 18,
      cooldown: 4,
      potency: 0.18,
      desc: "Party defence chant.",
    },
    {
      name: "Dirge",
      kind: "debuff",
      unlock: 20,
      cost: 4200,
      mp: 24,
      cooldown: 3,
      potency: 0.2,
      desc: "Saps the target.",
    },
    {
      name: "Spirit Wellspring",
      kind: "heal",
      unlock: 32,
      cost: 12000,
      mp: 30,
      cooldown: 3,
      potency: 1.2,
      desc: "Restores mana and flesh.",
    },
    {
      name: "Anthem of Ruin",
      kind: "buff",
      unlock: 44,
      cost: 30000,
      mp: 80,
      cooldown: 7,
      potency: 0.5,
      desc: "Overwhelming battle anthem.",
    },
    {
      name: "March Beat",
      kind: "buff",
      unlock: 6,
      cost: 800,
      mp: 12,
      cooldown: 3,
      potency: 0.12,
      desc: "Keeps the party swinging faster.",
    },
    {
      name: "Verse of Focus",
      kind: "buff",
      unlock: 16,
      cost: 3000,
      mp: 22,
      cooldown: 5,
      potency: 0.16,
      desc: "Sharpens spellcasters in the line.",
    },
    {
      name: "Lament",
      kind: "debuff",
      unlock: 26,
      cost: 7600,
      mp: 30,
      cooldown: 4,
      potency: 0.24,
      desc: "The beast falters at the sound.",
    },
    {
      name: "Chorus of Kings",
      kind: "buff",
      unlock: 50,
      cost: 52000,
      mp: 100,
      cooldown: 8,
      potency: 0.6,
      desc: "Every voice of the clan at once.",
    },
  ],
  artisan: [
    {
      name: "Pry Loose",
      kind: "attack",
      unlock: 1,
      cost: 300,
      mp: 6,
      cooldown: 0,
      potency: 0.7,
      desc: "Pickaxe swing.",
    },
    {
      name: "Vein Sense",
      kind: "buff",
      unlock: 10,
      cost: 1400,
      mp: 14,
      cooldown: 6,
      potency: 0.35,
      desc: "Improves loot found on the run.",
    },
    {
      name: "Salvage Cut",
      kind: "debuff",
      unlock: 20,
      cost: 4200,
      mp: 18,
      cooldown: 4,
      potency: 0.12,
      desc: "Exposes weak points.",
    },
    {
      name: "Field Repair",
      kind: "heal",
      unlock: 32,
      cost: 12000,
      mp: 34,
      cooldown: 4,
      potency: 1.1,
      desc: "Patches armour mid-fight.",
    },
    {
      name: "Master Assembly",
      kind: "buff",
      unlock: 44,
      cost: 30000,
      mp: 60,
      cooldown: 8,
      potency: 0.6,
      desc: "Raises craft luck of the clan.",
    },
    {
      name: "Hammer Toss",
      kind: "attack",
      unlock: 6,
      cost: 800,
      mp: 10,
      cooldown: 1,
      potency: 1.0,
      desc: "Throws the smithing hammer.",
    },
    {
      name: "Prospector's Luck",
      kind: "buff",
      unlock: 16,
      cost: 3000,
      mp: 20,
      cooldown: 6,
      potency: 0.25,
      desc: "Better eye for what is worth carrying.",
    },
    {
      name: "Weakpoint Study",
      kind: "debuff",
      unlock: 26,
      cost: 7600,
      mp: 26,
      cooldown: 4,
      potency: 0.2,
      desc: "Marks the seam in any hide.",
    },
    {
      name: "Grand Design",
      kind: "buff",
      unlock: 50,
      cost: 52000,
      mp: 75,
      cooldown: 9,
      potency: 0.75,
      desc: "The workshop's finest hour.",
    },
  ],
};

/** Per-class skill list: role skills, first two renamed to the class signatures. */
export function classSkills(classId: string): SkillDef[] {
  const cls = CLASS_BY_ID[classId]!;
  return ROLE_SKILLS[cls.role]!.map((s, i) => ({
    ...s,
    id: `${classId}_${i}`,
    role: cls.role,
    name: i < 2 ? cls.skills[i as 0 | 1]! : s.name,
  }));
}

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(
  CLASSES.flatMap((c) => classSkills(c.id).map((s) => [s.id, s])),
);

export type SkillCondition =
  "always" | "opening" | "self_hp_low" | "ally_hp_low" | "enemy_hp_low" | "mp_high" | "never";

export const CONDITION_LABEL: Record<SkillCondition, string> = {
  always: "Always",
  opening: "Opening round",
  self_hp_low: "My HP < 50%",
  ally_hp_low: "An ally < 60% HP",
  enemy_hp_low: "Enemy < 40% HP",
  mp_high: "MP > 50%",
  never: "Never",
};

/* ---------------------------------- Items ---------------------------------- */

export type ItemId = string;
export type Grade = "Low" | "NG" | "D" | "C";

export type Slot = "weapon" | "armor" | "gloves" | "boots" | "helmet" | "jewelry";

export const SLOT_LABEL: Record<Slot, string> = {
  weapon: "Weapon",
  armor: "Chest",
  gloves: "Hands",
  boots: "Feet",
  helmet: "Head",
  jewelry: "Jewelry",
};

export type ArmorPieceSlot = "gloves" | "boots" | "helmet";

/** Each armour school names its pieces differently. */
export const ARMOR_PIECE_NAME: Record<ArmorType, Record<ArmorPieceSlot, string>> = {
  robe: { gloves: "Gloves", boots: "Shoes", helmet: "Hood" },
  light: { gloves: "Bracers", boots: "Boots", helmet: "Helm" },
  heavy: { gloves: "Gauntlets", boots: "Sabatons", helmet: "Great Helm" },
};

export interface ItemDef {
  id: ItemId;
  name: string;
  kind: "material" | "gear" | "shot" | "scroll";
  grade: Grade;
  value: number; // gold value
  /** gear only: power granted to the wearer */
  power?: number;
  /** gear only: level required to wear */
  reqLevel?: number;
  /** gear only */
  slot?: Slot;
  /** armor only — matching the class mastery grants a bonus */
  armorType?: ArmorType;
  /** gear only: stat bonuses */
  stats?: Partial<Stats>;
  desc: string;
}

export const ITEMS: ItemDef[] = [
  // materials
  {
    id: "coarse_hide",
    name: "Coarse Hide",
    kind: "material",
    grade: "Low",
    value: 12,
    desc: "Rough pelt from field beasts. The bones of every leather set.",
  },
  {
    id: "iron_shard",
    name: "Iron Shard",
    kind: "material",
    grade: "Low",
    value: 15,
    desc: "Cheap smelt-iron scavenged from ruins.",
  },
  {
    id: "bone_dust",
    name: "Bone Dust",
    kind: "material",
    grade: "Low",
    value: 18,
    desc: "Ground remains — binder for cloth and focus work.",
  },
  {
    id: "spirit_ore",
    name: "Spirit Ore",
    kind: "material",
    grade: "NG",
    value: 44,
    desc: "Faintly humming ore. Required for no-grade and D-grade smithing.",
  },
  {
    id: "moon_silk",
    name: "Moon Silk",
    kind: "material",
    grade: "NG",
    value: 52,
    desc: "Woven under cold light. Robes and jewelry both demand it.",
  },
  {
    id: "ember_core",
    name: "Ember Core",
    kind: "material",
    grade: "D",
    value: 120,
    desc: "A still-burning heart pulled from ash beasts.",
  },
  {
    id: "abyss_crystal",
    name: "Abyss Crystal",
    kind: "material",
    grade: "C",
    value: 320,
    desc: "Rift-glass. The gate of every C-grade recipe.",
  },
  {
    id: "dragon_sinew",
    name: "Dragon Sinew",
    kind: "material",
    grade: "C",
    value: 900,
    desc: "Torn from a wyrm. Vanishingly rare, absurdly valuable.",
  },

  // Low grade — quest rewards only, up to level 15
  {
    id: "apprentice_tunic",
    name: "Apprentice Tunic",
    kind: "gear",
    grade: "Low",
    value: 60,
    power: 4,
    reqLevel: 1,
    slot: "armor",
    armorType: "robe",
    stats: { men: 2 },
    desc: "Guild-issue cloth. Free, and it shows.",
  },
  {
    id: "training_blade",
    name: "Training Blade",
    kind: "gear",
    grade: "Low",
    value: 70,
    power: 5,
    reqLevel: 6,
    slot: "weapon",
    stats: { str: 2 },
    desc: "Blunted edge, honest weight.",
  },
  {
    id: "wayfarer_mail",
    name: "Wayfarer Mail",
    kind: "gear",
    grade: "Low",
    value: 120,
    power: 7,
    reqLevel: 12,
    slot: "armor",
    armorType: "light",
    stats: { dex: 2, con: 2 },
    desc: "The last armour the guild ever hands out for nothing.",
  },
  {
    id: "oath_ring",
    name: "Oath Ring",
    kind: "gear",
    grade: "Low",
    value: 90,
    power: 4,
    reqLevel: 10,
    slot: "jewelry",
    stats: { men: 3 },
    desc: "Plain band sworn over at the clan hall.",
  },

  // No-grade — farmed & crafted
  {
    id: "iron_blade",
    name: "Iron Warblade",
    kind: "gear",
    grade: "NG",
    value: 260,
    power: 11,
    reqLevel: 15,
    slot: "weapon",
    stats: { str: 4 },
    desc: "First real steel most sworn ever hold.",
  },
  {
    id: "hide_mail",
    name: "Hardened Hide Mail",
    kind: "gear",
    grade: "NG",
    value: 260,
    power: 10,
    reqLevel: 15,
    slot: "armor",
    armorType: "light",
    stats: { dex: 3, con: 3 },
    desc: "Boiled hide plates — quiet and quick.",
  },
  {
    id: "oak_focus",
    name: "Oakheart Focus",
    kind: "gear",
    grade: "NG",
    value: 280,
    power: 12,
    reqLevel: 18,
    slot: "weapon",
    stats: { int: 4, men: 2 },
    desc: "Carved heartwood that holds a spell steady.",
  },
  {
    id: "acolyte_robe",
    name: "Acolyte Robe",
    kind: "gear",
    grade: "NG",
    value: 250,
    power: 9,
    reqLevel: 15,
    slot: "armor",
    armorType: "robe",
    stats: { int: 3, men: 3 },
    desc: "Silk-lined weave for casters who never take a hit.",
  },
  {
    id: "brigand_plate",
    name: "Brigandine Harness",
    kind: "gear",
    grade: "NG",
    value: 290,
    power: 12,
    reqLevel: 18,
    slot: "armor",
    armorType: "heavy",
    stats: { con: 5 },
    desc: "Riveted plates over hide. Heavy, and glad of it.",
  },
  {
    id: "silver_earring",
    name: "Silver Earring",
    kind: "gear",
    grade: "NG",
    value: 240,
    power: 8,
    reqLevel: 15,
    slot: "jewelry",
    stats: { wit: 3 },
    desc: "Cheap silver, honest enchantment.",
  },

  // D grade
  {
    id: "duskiron_blade",
    name: "Duskiron Blade",
    kind: "gear",
    grade: "D",
    value: 900,
    power: 22,
    reqLevel: 25,
    slot: "weapon",
    stats: { str: 7, dex: 3 },
    desc: "Dark-tempered edge that drinks the light.",
  },
  {
    id: "plated_mail",
    name: "Riveted Plate Mail",
    kind: "gear",
    grade: "D",
    value: 900,
    power: 20,
    reqLevel: 25,
    slot: "armor",
    armorType: "heavy",
    stats: { con: 8 },
    desc: "Full plate for those who stand at the front.",
  },
  {
    id: "spirit_focus",
    name: "Spirit Focus",
    kind: "gear",
    grade: "D",
    value: 950,
    power: 23,
    reqLevel: 28,
    slot: "weapon",
    stats: { int: 7, wit: 3 },
    desc: "A caged spirit answers each incantation.",
  },
  {
    id: "duskweave_robe",
    name: "Duskweave Robe",
    kind: "gear",
    grade: "D",
    value: 880,
    power: 19,
    reqLevel: 25,
    slot: "armor",
    armorType: "robe",
    stats: { int: 6, men: 4 },
    desc: "Shadow-dyed weave, light as breath.",
  },
  {
    id: "hunters_leather",
    name: "Hunter's Leather",
    kind: "gear",
    grade: "D",
    value: 880,
    power: 20,
    reqLevel: 25,
    slot: "armor",
    armorType: "light",
    stats: { dex: 7, con: 3 },
    desc: "Supple, silent, built for the long stalk.",
  },
  {
    id: "ember_pendant",
    name: "Ember Pendant",
    kind: "gear",
    grade: "D",
    value: 950,
    power: 16,
    reqLevel: 28,
    slot: "jewelry",
    stats: { int: 4, men: 4 },
    desc: "Warm to the touch, even in Frost Hollow.",
  },

  // C grade
  {
    id: "moonweave_robe",
    name: "Moonweave Robe",
    kind: "gear",
    grade: "C",
    value: 2600,
    power: 34,
    reqLevel: 38,
    slot: "armor",
    armorType: "robe",
    stats: { int: 10, men: 6 },
    desc: "Spun from moon silk. Casters kill for it.",
  },
  {
    id: "ember_greatsword",
    name: "Ember Greatsword",
    kind: "gear",
    grade: "C",
    value: 3000,
    power: 40,
    reqLevel: 40,
    slot: "weapon",
    stats: { str: 12, con: 3 },
    desc: "A furnace with a hilt.",
  },
  {
    id: "abyss_plate",
    name: "Abyssforged Plate",
    kind: "gear",
    grade: "C",
    value: 3200,
    power: 37,
    reqLevel: 44,
    slot: "armor",
    armorType: "heavy",
    stats: { con: 13 },
    desc: "Forged in rift-fire. Nothing gets through it cheaply.",
  },
  {
    id: "wyrmscale_coat",
    name: "Wyrmscale Coat",
    kind: "gear",
    grade: "C",
    value: 3100,
    power: 36,
    reqLevel: 42,
    slot: "armor",
    armorType: "light",
    stats: { dex: 11, con: 5 },
    desc: "Overlapping wyrm scales — fast and near unbreakable.",
  },
  {
    id: "abyss_ring",
    name: "Abyss Signet",
    kind: "gear",
    grade: "C",
    value: 2900,
    power: 26,
    reqLevel: 40,
    slot: "jewelry",
    stats: { int: 6, wit: 6 },
    desc: "The rift stares back through it.",
  },
  {
    id: "wyrm_torc",
    name: "Wyrmbone Torc",
    kind: "gear",
    grade: "C",
    value: 3400,
    power: 28,
    reqLevel: 44,
    slot: "jewelry",
    stats: { str: 5, con: 6, men: 4 },
    desc: "Carved from a roost-lord's vertebra.",
  },
];

/* ------------------------- Soul / Spirit shot economy ----------------------- */
/*
 * Souls drop from physical enemies, Spirits from magical ones. They are raw
 * resources: only the town market refines them into shots, which are consumed
 * one per attack and are a pure gold sink (never required to stay playable).
 */

export type EnemyArchetype = "physical" | "magical" | "mixed";

/** Fraction of essence drops that come back as Souls (rest are Spirits). */
export const SOUL_SPLIT: Record<EnemyArchetype, number> = {
  physical: 0.8,
  mixed: 0.5,
  magical: 0.2,
};

/** Shot grades, cheapest first. */
export const SHOT_GRADES: Grade[] = ["Low", "NG", "D", "C"];

/** Level a member must reach before a grade of shot fires at full effect. */
export const SHOT_TIER_LEVEL: Record<Grade, number> = { Low: 1, NG: 15, D: 25, C: 40 };

/** Base power spike a matching-grade shot grants on an attack. */
export const SHOT_BOOST = 0.25;
export const BLESSED_BOOST = 0.4;
/** Blessed shots cost 3× the mats and fee of the plain variant. */
export const BLESSED_MULT = 3;
/** Shots are refined ten at a time. */
export const SHOT_BATCH = 10;

export interface ShotSpec {
  grade: Grade;
  /** derived target cost per shot: (shot_drain_share × faucet) / consumption */
  costPerShot: number;
  /** essence consumed per batch of SHOT_BATCH */
  embers: number;
  /** market fee in gold per batch */
  fee: number;
}

export const SHOT_SPECS: Record<Grade, ShotSpec> = {
  Low: { grade: "Low", costPerShot: 1.0, embers: 4, fee: 6 },
  NG: { grade: "NG", costPerShot: 2.6, embers: 8, fee: 18 },
  D: { grade: "D", costPerShot: 5.0, embers: 12, fee: 38 },
  C: { grade: "C", costPerShot: 10.5, embers: 20, fee: 85 },
};

const GRADE_WORD: Record<Grade, string> = {
  Low: "Low",
  NG: "No-Grade",
  D: "D-Grade",
  C: "C-Grade",
};

export type ShotKind = "soul" | "spirit";

export function shotId(kind: ShotKind, grade: Grade, blessed = false) {
  return `${blessed ? "blessed_" : ""}${kind}shot_${grade.toLowerCase()}`;
}

export function emberId(kind: ShotKind) {
  return `${kind}_ember`;
}

const SHOT_ITEMS: ItemDef[] = [
  {
    id: "soul_ember",
    name: "Soul Ember",
    kind: "material",
    grade: "Low",
    value: 1,
    desc: "A hot mote left by slain beasts and warriors. Refined into soulshots.",
  },
  {
    id: "spirit_ember",
    name: "Spirit Ember",
    kind: "material",
    grade: "Low",
    value: 1,
    desc: "A cold mote left by casters, wraiths and the undead. Refined into spiritshots.",
  },
];

for (const grade of SHOT_GRADES) {
  const spec = SHOT_SPECS[grade];
  for (const kind of ["soul", "spirit"] as ShotKind[]) {
    for (const blessed of [false, true]) {
      const mult = blessed ? BLESSED_MULT : 1;
      SHOT_ITEMS.push({
        id: shotId(kind, grade, blessed),
        name: `${blessed ? "Blessed " : ""}${kind === "soul" ? "Soulshot" : "Spiritshot"} — ${GRADE_WORD[grade]}`,
        kind: "shot",
        grade,
        value: Math.round(spec.costPerShot * mult),
        desc:
          kind === "soul"
            ? `Charges a weapon swing. +${Math.round((blessed ? BLESSED_BOOST : SHOT_BOOST) * 100)}% physical damage, one consumed per attack.`
            : `Charges a spell. +${Math.round((blessed ? BLESSED_BOOST : SHOT_BOOST) * 100)}% magical damage, one consumed per cast.`,
      });
    }
  }
}

ITEMS.push(...SHOT_ITEMS);

/* --------------------------------- Runes ----------------------------------- */
/*
 * Engravable weapon runes. Socket one onto a champion's weapon and every strike
 * they land changes damage type, so a banner can be tuned to a zone's weakness
 * (see the threat profile on the War Table). Runes are refined from farmed
 * essence at the Jewelcraft bench — the essence economy feeding gear again.
 */
export const RUNE_ITEMS: ItemDef[] = [
  {
    id: "rune_fire",
    name: "Ember Rune",
    kind: "material",
    grade: "D",
    value: 90,
    desc: "Engrave it on a weapon and every strike burns — the wielder deals Fire.",
  },
  {
    id: "rune_frost",
    name: "Frost Rune",
    kind: "material",
    grade: "D",
    value: 90,
    desc: "Engrave it on a weapon and every strike bites cold — the wielder deals Frost.",
  },
  {
    id: "rune_shadow",
    name: "Shadow Rune",
    kind: "material",
    grade: "D",
    value: 110,
    desc: "Engrave it on a weapon and every strike drinks the light — the wielder deals Shadow.",
  },
  {
    id: "rune_holy",
    name: "Sacred Rune",
    kind: "material",
    grade: "D",
    value: 130,
    desc: "Engrave it on a weapon and every strike shines — the wielder deals Holy.",
  },
];

ITEMS.push(...RUNE_ITEMS);

const RUNE_RECIPES: Recipe[] = [
  {
    id: "r_rune_fire",
    result: "rune_fire",
    gold: 180,
    mastery: "jewelry",
    artisans: 1,
    chance: 0.88,
    inputs: [
      { item: "soul_ember", qty: 24 },
      { item: "spirit_ore", qty: 2 },
    ],
  },
  {
    id: "r_rune_frost",
    result: "rune_frost",
    gold: 180,
    mastery: "jewelry",
    artisans: 1,
    chance: 0.88,
    inputs: [
      { item: "spirit_ember", qty: 24 },
      { item: "moon_silk", qty: 2 },
    ],
  },
  {
    id: "r_rune_shadow",
    result: "rune_shadow",
    gold: 200,
    mastery: "jewelry",
    artisans: 1,
    chance: 0.85,
    inputs: [
      { item: "spirit_ember", qty: 20 },
      { item: "bone_dust", qty: 6 },
    ],
  },
  {
    id: "r_rune_holy",
    result: "rune_holy",
    gold: 240,
    mastery: "jewelry",
    artisans: 2,
    chance: 0.82,
    inputs: [
      { item: "soul_ember", qty: 16 },
      { item: "spirit_ember", qty: 16 },
      { item: "moon_silk", qty: 2 },
    ],
  },
];

/* ------------------------------ Spell scrolls ------------------------------- */
/*
 * A caster can imprint a spell onto vellum at the Scriptorium. The scroll then
 * belongs to the whole banner — any member can read it in the field, whatever
 * their class. Imprinting and reading are both gambles: WIT decides whether the
 * weave holds, MEN decides how badly it hurts when it doesn't.
 */

export type ScrollKind = "attack" | "buff";

export interface ScrollDef {
  id: ItemId;
  name: string;
  kind: ScrollKind;
  grade: Grade;
  /** level the scribe must have reached to attempt the imprint */
  reqLevel: number;
  /** attack: damage multiplier on the reader's power. buff: party attack/def uplift */
  power: number;
  /** MP the scribe burns on the attempt (spent win or lose) */
  mp: number;
  /** base odds the imprint takes hold, before WIT */
  base: number;
  inputs: { item: ItemId; qty: number }[];
  gold: number;
  desc: string;
}

export const SCROLLS: ScrollDef[] = [
  {
    id: "scroll_attack_ng",
    name: "Scroll of Cinders",
    kind: "attack",
    grade: "NG",
    reqLevel: 15,
    power: 1.8,
    mp: 30,
    base: 0.72,
    inputs: [
      { item: "bone_dust", qty: 3 },
      { item: "spirit_ore", qty: 1 },
      { item: "spirit_ember", qty: 12 },
    ],
    gold: 240,
    desc: "A single searing burst. Anyone can read it — the vellum does the casting.",
  },
  {
    id: "scroll_buff_ng",
    name: "Scroll of the Steady Hand",
    kind: "buff",
    grade: "NG",
    reqLevel: 15,
    power: 0.16,
    mp: 26,
    base: 0.74,
    inputs: [
      { item: "bone_dust", qty: 2 },
      { item: "moon_silk", qty: 1 },
      { item: "soul_ember", qty: 12 },
    ],
    gold: 220,
    desc: "Read at the opening of a fight, it steadies every blade in the banner.",
  },
  {
    id: "scroll_attack_d",
    name: "Scroll of the Riven Sky",
    kind: "attack",
    grade: "D",
    reqLevel: 28,
    power: 3.1,
    mp: 55,
    base: 0.56,
    inputs: [
      { item: "ember_core", qty: 1 },
      { item: "moon_silk", qty: 2 },
      { item: "spirit_ember", qty: 30 },
    ],
    gold: 900,
    desc: "Lightning called down out of a clear sky. Loud, and rarely subtle.",
  },
  {
    id: "scroll_buff_d",
    name: "Scroll of the Ember Ward",
    kind: "buff",
    grade: "D",
    reqLevel: 28,
    power: 0.26,
    mp: 48,
    base: 0.58,
    inputs: [
      { item: "ember_core", qty: 1 },
      { item: "spirit_ore", qty: 2 },
      { item: "soul_ember", qty: 30 },
    ],
    gold: 860,
    desc: "A warding sigil that burns on the air, hardening everyone beneath it.",
  },
  {
    id: "scroll_attack_c",
    name: "Scroll of Abyssal Ruin",
    kind: "attack",
    grade: "C",
    reqLevel: 40,
    power: 4.8,
    mp: 90,
    base: 0.42,
    inputs: [
      { item: "abyss_crystal", qty: 1 },
      { item: "ember_core", qty: 2 },
      { item: "spirit_ember", qty: 70 },
    ],
    gold: 2600,
    desc: "The rift is opened a hand's width. Whatever is on the other side does the rest.",
  },
  {
    id: "scroll_buff_c",
    name: "Scroll of the Wyrm's Grace",
    kind: "buff",
    grade: "C",
    reqLevel: 40,
    power: 0.38,
    mp: 84,
    base: 0.44,
    inputs: [
      { item: "abyss_crystal", qty: 1 },
      { item: "moon_silk", qty: 3 },
      { item: "soul_ember", qty: 70 },
    ],
    gold: 2500,
    desc: "Old dragon-tongue. For a few minutes the banner moves like something older.",
  },
];

export const SCROLL_BY_ID: Record<ItemId, ScrollDef> = Object.fromEntries(
  SCROLLS.map((s) => [s.id, s]),
);

ITEMS.push(
  ...SCROLLS.map<ItemDef>((s) => ({
    id: s.id,
    name: s.name,
    kind: "scroll",
    grade: s.grade,
    value: Math.round(s.gold * 0.6),
    desc:
      s.kind === "attack"
        ? `${s.desc} Read in the field for a burst of ~${s.power.toFixed(1)}× the reader's power. Consumed on use.`
        : `${s.desc} Read at the opening for +${Math.round(s.power * 100)}% party attack and defence. Consumed on use.`,
  })),
);

/* --------------------------- Armour sets & pieces --------------------------- */
/*
 * Every craftable armour school (robe / light / heavy) from D grade upward is a
 * four-piece set: chest, hands, feet and head. Wearing all four wakes the set
 * bonus. Piece names follow the school — a robe wears Gloves, heavy wears
 * Gauntlets.
 */

export interface ArmorSet {
  id: string;
  name: string;
  grade: Grade;
  armorType: ArmorType;
  pieces: ItemId[];
  bonus: { power: number; stats: Partial<Stats>; desc: string };
}

interface SetSpec {
  id: string;
  name: string;
  grade: Grade;
  armorType: ArmorType;
  chest: ItemId;
  reqLevel: number;
  /** head-piece reference values; hands ×0.85, feet ×0.8 */
  power: number;
  value: number;
  stats: Partial<Stats>;
  gold: number;
  artisans: number;
  chance: number;
  mats: { item: ItemId; qty: number }[];
  bonus: { power: number; stats: Partial<Stats>; desc: string };
}

const SET_SPECS: SetSpec[] = [
  {
    id: "duskweave",
    name: "Duskweave",
    grade: "D",
    armorType: "robe",
    chest: "duskweave_robe",
    reqLevel: 25,
    power: 9,
    value: 420,
    stats: { int: 3, men: 2 },
    gold: 900,
    artisans: 2,
    chance: 0.58,
    mats: [
      { item: "moon_silk", qty: 7 },
      { item: "spirit_ore", qty: 4 },
      { item: "ember_core", qty: 1 },
    ],
    bonus: {
      power: 14,
      stats: { int: 4, men: 3 },
      desc: "Full Duskweave: spellwork lands softer on the wearer.",
    },
  },
  {
    id: "hunter",
    name: "Hunter's",
    grade: "D",
    armorType: "light",
    chest: "hunters_leather",
    reqLevel: 25,
    power: 9,
    value: 420,
    stats: { dex: 3, con: 2 },
    gold: 900,
    artisans: 2,
    chance: 0.58,
    mats: [
      { item: "coarse_hide", qty: 14 },
      { item: "spirit_ore", qty: 4 },
      { item: "ember_core", qty: 1 },
    ],
    bonus: {
      power: 14,
      stats: { dex: 4, con: 3 },
      desc: "Full Hunter's kit: silent movement, faster draw.",
    },
  },
  {
    id: "riveted",
    name: "Riveted",
    grade: "D",
    armorType: "heavy",
    chest: "plated_mail",
    reqLevel: 25,
    power: 9,
    value: 430,
    stats: { con: 4 },
    gold: 950,
    artisans: 2,
    chance: 0.56,
    mats: [
      { item: "iron_shard", qty: 16 },
      { item: "spirit_ore", qty: 5 },
      { item: "ember_core", qty: 1 },
    ],
    bonus: { power: 14, stats: { con: 6, str: 2 }, desc: "Full Riveted plate: the line holds." },
  },
  {
    id: "moonweave",
    name: "Moonweave",
    grade: "C",
    armorType: "robe",
    chest: "moonweave_robe",
    reqLevel: 38,
    power: 16,
    value: 1200,
    stats: { int: 5, men: 3 },
    gold: 3000,
    artisans: 4,
    chance: 0.4,
    mats: [
      { item: "moon_silk", qty: 12 },
      { item: "ember_core", qty: 5 },
      { item: "abyss_crystal", qty: 2 },
    ],
    bonus: {
      power: 26,
      stats: { int: 7, men: 5 },
      desc: "Full Moonweave: the weave answers every incantation.",
    },
  },
  {
    id: "wyrmscale",
    name: "Wyrmscale",
    grade: "C",
    armorType: "light",
    chest: "wyrmscale_coat",
    reqLevel: 42,
    power: 17,
    value: 1300,
    stats: { dex: 5, con: 3 },
    gold: 3400,
    artisans: 4,
    chance: 0.36,
    mats: [
      { item: "ember_core", qty: 7 },
      { item: "abyss_crystal", qty: 3 },
      { item: "coarse_hide", qty: 20 },
    ],
    bonus: {
      power: 28,
      stats: { dex: 7, con: 5 },
      desc: "Full Wyrmscale: scales overlap into one unbroken skin.",
    },
  },
  {
    id: "abyssforged",
    name: "Abyssforged",
    grade: "C",
    armorType: "heavy",
    chest: "abyss_plate",
    reqLevel: 44,
    power: 18,
    value: 1400,
    stats: { con: 6 },
    gold: 3800,
    artisans: 5,
    chance: 0.32,
    mats: [
      { item: "abyss_crystal", qty: 4 },
      { item: "ember_core", qty: 9 },
      { item: "iron_shard", qty: 24 },
    ],
    bonus: {
      power: 30,
      stats: { con: 9, str: 3 },
      desc: "Full Abyssforged: rift-fire closes around the wearer.",
    },
  },
];

const PIECE_MULT: Record<ArmorPieceSlot, number> = { helmet: 1, gloves: 0.85, boots: 0.8 };
const PIECE_SLOTS: ArmorPieceSlot[] = ["helmet", "gloves", "boots"];

const SET_PIECE_ITEMS: ItemDef[] = [];
const SET_PIECE_RECIPES: Recipe[] = [];
export const ARMOR_SETS: ArmorSet[] = [];

function scaleStats(stats: Partial<Stats>, mult: number): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(stats) as [keyof Stats, number][]) {
    const n = Math.max(1, Math.round(v * mult));
    out[k] = n;
  }
  return out;
}

for (const spec of SET_SPECS) {
  const pieces: ItemId[] = [spec.chest];
  for (const slot of PIECE_SLOTS) {
    const mult = PIECE_MULT[slot];
    const id = `${spec.id}_${slot}`;
    SET_PIECE_ITEMS.push({
      id,
      name: `${spec.name} ${ARMOR_PIECE_NAME[spec.armorType][slot]}`,
      kind: "gear",
      grade: spec.grade,
      value: Math.round(spec.value * mult),
      power: Math.max(1, Math.round(spec.power * mult)),
      reqLevel: spec.reqLevel,
      slot,
      armorType: spec.armorType,
      stats: scaleStats(spec.stats, mult),
      desc: `${spec.name} ${ARMOR_PIECE_NAME[spec.armorType][slot].toLowerCase()} — part of the ${spec.name} ${spec.grade}-grade set.`,
    });
    SET_PIECE_RECIPES.push({
      id: `r_${id}`,
      result: id,
      gold: Math.round(spec.gold * mult),
      mastery: "armor",
      artisans: spec.artisans,
      chance: spec.chance,
      inputs: spec.mats.map((m) => ({ item: m.item, qty: Math.max(1, Math.round(m.qty * mult)) })),
    });
    pieces.push(id);
  }
  ARMOR_SETS.push({
    id: spec.id,
    name: `${spec.name} Set`,
    grade: spec.grade,
    armorType: spec.armorType,
    pieces,
    bonus: spec.bonus,
  });
}

ITEMS.push(...SET_PIECE_ITEMS);

/** Which set (if any) an item belongs to. */
export const SET_BY_ITEM: Record<ItemId, ArmorSet> = {};
for (const set of ARMOR_SETS) for (const id of set.pieces) SET_BY_ITEM[id] = set;

/* ------------------------------ Craft quality ------------------------------- */
/*
 * From D grade upward a forged piece rolls a quality level, 0 to 20. Each
 * quality step is a separate roll, so high quality is rare and artisan mastery
 * is what pushes the odds. Quality scales power, stats and resale value.
 */

export const MAX_QUALITY = 20;
export const QUALITY_GRADES: Grade[] = ["D", "C"];
export const QUALITY_POWER_STEP = 0.05;
export const QUALITY_STAT_STEP = 0.04;
export const QUALITY_VALUE_STEP = 0.12;

export function qualityItemId(base: ItemId, quality: number): ItemId {
  return quality > 0 ? `${base}#q${quality}` : base;
}

export function splitItemId(id: ItemId): { base: ItemId; quality: number } {
  const i = id.indexOf("#q");
  if (i < 0) return { base: id, quality: 0 };
  return { base: id.slice(0, i), quality: Number(id.slice(i + 2)) || 0 };
}

export function qualityLabel(quality: number) {
  if (quality === 0) return "Standard";
  if (quality >= 18) return "Masterwork";
  if (quality >= 12) return "Exquisite";
  if (quality >= 6) return "Fine";
  return "Refined";
}

export function canRollQuality(def: ItemDef | undefined) {
  return !!def && def.kind === "gear" && QUALITY_GRADES.includes(def.grade);
}

/** Which essence a zone's inhabitants leave behind. */
export const ZONE_ARCHETYPE: Record<string, EnemyArchetype> = {
  wolf_fields: "physical",
  ruined_orchard: "mixed",
  ashen_steppe: "physical",
  frost_hollow: "mixed",
  wyrm_plateau: "mixed",
  millpond_reeds: "physical",
  briar_downs: "physical",
  kingsroad_marches: "physical",
  saltmere_flats: "mixed",
  emberwood: "mixed",
  moonveil_glade: "magical",
  stormbreak_coast: "mixed",
  cinderwaste: "magical",
  sunken_crypt: "magical",
  howling_warren: "physical",
  drowned_chapel: "magical",
  ashen_quarry: "physical",
  obsidian_labyrinth: "mixed",
  abyss_gate: "magical",
  frozen_hold: "mixed",
  wyrm_roost: "mixed",
  sunless_throne: "magical",
};

/** Essence motes dropped per cleared run, solved to sustain the shot sink. */
export const ZONE_ESSENCE: Record<string, [number, number]> = {
  wolf_fields: [2, 5],
  ruined_orchard: [4, 8],
  ashen_steppe: [15, 26],
  frost_hollow: [27, 45],
  wyrm_plateau: [52, 88],
  millpond_reeds: [3, 6],
  briar_downs: [4, 8],
  kingsroad_marches: [11, 19],
  saltmere_flats: [14, 24],
  emberwood: [22, 37],
  moonveil_glade: [30, 50],
  stormbreak_coast: [45, 74],
  cinderwaste: [70, 116],
  sunken_crypt: [13, 23],
  howling_warren: [4, 7],
  drowned_chapel: [18, 30],
  ashen_quarry: [26, 42],
  obsidian_labyrinth: [34, 56],
  abyss_gate: [56, 92],
  frozen_hold: [66, 108],
  wyrm_roost: [76, 126],
  sunless_throne: [96, 158],
};

/** Roles that swing steel use soulshots; the rest burn spiritshots. */
export const ROLE_SHOT: Record<Role, ShotKind> = {
  guardian: "soul",
  blade: "soul",
  archer: "soul",
  artisan: "soul",
  arcanist: "spirit",
  mender: "spirit",
  chanter: "spirit",
};

const BASE_ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, ItemDef>;

const QUALITY_CACHE = new Map<string, ItemDef>();

/** Resolves any item id, including quality-suffixed ones like `plated_mail#q7`. */
export function itemDef(id: ItemId): ItemDef | undefined {
  const direct = BASE_ITEM_BY_ID[id];
  if (direct) return direct;
  const { base, quality } = splitItemId(id);
  const def = BASE_ITEM_BY_ID[base];
  if (!def || quality <= 0) return def;
  const hit = QUALITY_CACHE.get(id);
  if (hit) return hit;
  const stats: Partial<Stats> = {};
  for (const [k, v] of Object.entries(def.stats ?? {}) as [keyof Stats, number][]) {
    stats[k] = Math.round(v * (1 + QUALITY_STAT_STEP * quality));
  }
  const derived: ItemDef = {
    ...def,
    id,
    name: `${def.name} +${quality}`,
    value: Math.round(def.value * (1 + QUALITY_VALUE_STEP * quality)),
    ...(def.power !== undefined
      ? { power: Math.round(def.power * (1 + QUALITY_POWER_STEP * quality)) }
      : {}),
    ...(def.stats ? { stats } : {}),
  };
  QUALITY_CACHE.set(id, derived);
  return derived;
}

export const ITEM_BY_ID = new Proxy({} as Record<ItemId, ItemDef>, {
  get: (_t, key: string) => itemDef(key),
  has: (_t, key: string) => !!itemDef(String(key)),
});

export const GRADE_CLASS: Record<Grade, string> = {
  Low: "text-muted-foreground",
  NG: "text-grade-c",
  D: "text-grade-b",
  C: "text-grade-a",
};

/** Artisans specialise in one of these four crafting disciplines. */
export type CraftMastery = "mats" | "armor" | "weapon" | "jewelry";

export const CRAFT_MASTERIES: CraftMastery[] = ["mats", "armor", "weapon", "jewelry"];

export const CRAFT_MASTERY_LABEL: Record<CraftMastery, string> = {
  mats: "Material Refining",
  armor: "Armorsmithing",
  weapon: "Weaponsmithing",
  jewelry: "Jewelcrafting",
};

export const CRAFT_MASTERY_BLURB: Record<CraftMastery, string> = {
  mats: "Refines raw drops into higher materials and improves material yields.",
  armor: "Robe, light and heavy armour sets.",
  weapon: "Blades, bows and focuses.",
  jewelry: "Rings, earrings, pendants and torcs.",
};

export interface Recipe {
  id: string;
  result: ItemId;
  /** how many are produced on success */
  qty?: number;
  gold: number;
  /** which artisan mastery this recipe belongs to */
  mastery: CraftMastery;
  /** artisan skill level required (clan artisans count) */
  artisans: number;
  /** base chance of success — crafting can and will fail */
  chance: number;
  inputs: { item: ItemId; qty: number }[];
}

export const RECIPES: Recipe[] = [
  // material refining
  {
    id: "r_spirit_ore",
    result: "spirit_ore",
    qty: 2,
    gold: 80,
    mastery: "mats",
    artisans: 1,
    chance: 0.7,
    inputs: [
      { item: "iron_shard", qty: 8 },
      { item: "bone_dust", qty: 4 },
    ],
  },
  {
    id: "r_moon_silk",
    result: "moon_silk",
    qty: 2,
    gold: 120,
    mastery: "mats",
    artisans: 1,
    chance: 0.64,
    inputs: [
      { item: "coarse_hide", qty: 10 },
      { item: "bone_dust", qty: 8 },
    ],
  },
  {
    id: "r_ember_core",
    result: "ember_core",
    qty: 1,
    gold: 400,
    mastery: "mats",
    artisans: 2,
    chance: 0.5,
    inputs: [
      { item: "spirit_ore", qty: 8 },
      { item: "moon_silk", qty: 4 },
    ],
  },
  {
    id: "r_abyss_crystal",
    result: "abyss_crystal",
    qty: 1,
    gold: 1800,
    mastery: "mats",
    artisans: 4,
    chance: 0.34,
    inputs: [
      { item: "ember_core", qty: 8 },
      { item: "moon_silk", qty: 12 },
    ],
  },

  // weapons
  {
    id: "r_iron_blade",
    result: "iron_blade",
    gold: 400,
    mastery: "weapon",
    artisans: 1,
    chance: 0.72,
    inputs: [
      { item: "iron_shard", qty: 10 },
      { item: "coarse_hide", qty: 6 },
    ],
  },
  {
    id: "r_oak_focus",
    result: "oak_focus",
    gold: 520,
    mastery: "weapon",
    artisans: 1,
    chance: 0.66,
    inputs: [
      { item: "moon_silk", qty: 4 },
      { item: "bone_dust", qty: 10 },
    ],
  },
  {
    id: "r_duskiron",
    result: "duskiron_blade",
    gold: 2200,
    mastery: "weapon",
    artisans: 2,
    chance: 0.55,
    inputs: [
      { item: "iron_shard", qty: 24 },
      { item: "spirit_ore", qty: 10 },
      { item: "ember_core", qty: 3 },
    ],
  },
  {
    id: "r_spirit_focus",
    result: "spirit_focus",
    gold: 2600,
    mastery: "weapon",
    artisans: 3,
    chance: 0.5,
    inputs: [
      { item: "spirit_ore", qty: 16 },
      { item: "moon_silk", qty: 10 },
      { item: "ember_core", qty: 4 },
    ],
  },
  {
    id: "r_ember_sword",
    result: "ember_greatsword",
    gold: 8000,
    mastery: "weapon",
    artisans: 4,
    chance: 0.34,
    inputs: [
      { item: "ember_core", qty: 18 },
      { item: "abyss_crystal", qty: 6 },
      { item: "iron_shard", qty: 40 },
    ],
  },

  // armour — robe / light / heavy
  {
    id: "r_hide_mail",
    result: "hide_mail",
    gold: 400,
    mastery: "armor",
    artisans: 1,
    chance: 0.72,
    inputs: [
      { item: "coarse_hide", qty: 12 },
      { item: "bone_dust", qty: 6 },
    ],
  },
  {
    id: "r_acolyte_robe",
    result: "acolyte_robe",
    gold: 420,
    mastery: "armor",
    artisans: 1,
    chance: 0.7,
    inputs: [
      { item: "moon_silk", qty: 5 },
      { item: "coarse_hide", qty: 4 },
    ],
  },
  {
    id: "r_brigand_plate",
    result: "brigand_plate",
    gold: 480,
    mastery: "armor",
    artisans: 1,
    chance: 0.66,
    inputs: [
      { item: "iron_shard", qty: 14 },
      { item: "coarse_hide", qty: 8 },
    ],
  },
  {
    id: "r_plated_mail",
    result: "plated_mail",
    gold: 2200,
    mastery: "armor",
    artisans: 2,
    chance: 0.55,
    inputs: [
      { item: "coarse_hide", qty: 24 },
      { item: "spirit_ore", qty: 12 },
      { item: "ember_core", qty: 2 },
    ],
  },
  {
    id: "r_duskweave",
    result: "duskweave_robe",
    gold: 2100,
    mastery: "armor",
    artisans: 2,
    chance: 0.55,
    inputs: [
      { item: "moon_silk", qty: 14 },
      { item: "spirit_ore", qty: 8 },
      { item: "ember_core", qty: 2 },
    ],
  },
  {
    id: "r_hunters_leather",
    result: "hunters_leather",
    gold: 2100,
    mastery: "armor",
    artisans: 2,
    chance: 0.55,
    inputs: [
      { item: "coarse_hide", qty: 30 },
      { item: "spirit_ore", qty: 8 },
      { item: "ember_core", qty: 2 },
    ],
  },
  {
    id: "r_moonweave",
    result: "moonweave_robe",
    gold: 7000,
    mastery: "armor",
    artisans: 4,
    chance: 0.38,
    inputs: [
      { item: "moon_silk", qty: 24 },
      { item: "abyss_crystal", qty: 4 },
      { item: "ember_core", qty: 10 },
    ],
  },
  {
    id: "r_wyrmscale",
    result: "wyrmscale_coat",
    gold: 9000,
    mastery: "armor",
    artisans: 4,
    chance: 0.32,
    inputs: [
      { item: "abyss_crystal", qty: 6 },
      { item: "dragon_sinew", qty: 1 },
      { item: "ember_core", qty: 14 },
    ],
  },
  {
    id: "r_abyss_plate",
    result: "abyss_plate",
    gold: 12000,
    mastery: "armor",
    artisans: 5,
    chance: 0.28,
    inputs: [
      { item: "abyss_crystal", qty: 10 },
      { item: "dragon_sinew", qty: 2 },
      { item: "ember_core", qty: 20 },
    ],
  },

  // jewelry
  {
    id: "r_silver_earring",
    result: "silver_earring",
    gold: 380,
    mastery: "jewelry",
    artisans: 1,
    chance: 0.68,
    inputs: [
      { item: "spirit_ore", qty: 6 },
      { item: "moon_silk", qty: 3 },
    ],
  },
  {
    id: "r_ember_pendant",
    result: "ember_pendant",
    gold: 2400,
    mastery: "jewelry",
    artisans: 3,
    chance: 0.5,
    inputs: [
      { item: "ember_core", qty: 6 },
      { item: "moon_silk", qty: 12 },
      { item: "spirit_ore", qty: 14 },
    ],
  },
  {
    id: "r_abyss_ring",
    result: "abyss_ring",
    gold: 7200,
    mastery: "jewelry",
    artisans: 4,
    chance: 0.34,
    inputs: [
      { item: "abyss_crystal", qty: 6 },
      { item: "ember_core", qty: 12 },
      { item: "moon_silk", qty: 16 },
    ],
  },
  {
    id: "r_wyrm_torc",
    result: "wyrm_torc",
    gold: 11000,
    mastery: "jewelry",
    artisans: 5,
    chance: 0.28,
    inputs: [
      { item: "dragon_sinew", qty: 2 },
      { item: "abyss_crystal", qty: 8 },
      { item: "ember_core", qty: 16 },
    ],
  },
];

// hands / feet / head pieces for every craftable armour set
RECIPES.push(...(SET_PIECE_RECIPES as Recipe[]));
RECIPES.push(...RUNE_RECIPES);

/* ---------------------------------- Zones ---------------------------------- */

export interface Zone {
  id: string;
  name: string;
  kind: "field" | "dungeon";
  blurb: string;
  /** character level recommended */
  reqLevel: number;
  /** recommended party power */
  threat: number;
  /** enemy hit per round */
  enemyHit: number;
  rounds: number;
  durationMs: number;
  gold: [number, number];
  xp: number;
  rep: number;
  drops: { item: ItemId; chance: number; qty: [number, number] }[];
}

export const ZONES: Zone[] = [
  // open XP fields
  {
    id: "wolf_fields",
    name: "Greywolf Fields",
    kind: "field",
    blurb: "Starving packs roam the wheat ruins.",
    reqLevel: 1,
    threat: 30,
    enemyHit: 9,
    rounds: 10,
    durationMs: 12000,
    gold: [60, 140],
    xp: 60,
    rep: 3,
    drops: [
      { item: "coarse_hide", chance: 0.42, qty: [1, 2] },
      { item: "iron_shard", chance: 0.24, qty: [1, 2] },
      { item: "bone_dust", chance: 0.14, qty: [1, 1] },
    ],
  },
  {
    id: "ruined_orchard",
    name: "Ruined Orchard",
    kind: "field",
    blurb: "Blighted trees, restless scarecrows, easy experience.",
    reqLevel: 12,
    threat: 120,
    enemyHit: 22,
    rounds: 12,
    durationMs: 20000,
    gold: [180, 340],
    xp: 220,
    rep: 6,
    drops: [
      { item: "coarse_hide", chance: 0.34, qty: [1, 3] },
      { item: "bone_dust", chance: 0.28, qty: [1, 2] },
      { item: "spirit_ore", chance: 0.13, qty: [1, 1] },
    ],
  },
  {
    id: "ashen_steppe",
    name: "Ashen Steppe",
    kind: "field",
    blurb: "Open burnt plains crawling with ash beasts.",
    reqLevel: 24,
    threat: 320,
    enemyHit: 48,
    rounds: 14,
    durationMs: 30000,
    gold: [420, 820],
    xp: 700,
    rep: 12,
    drops: [
      { item: "spirit_ore", chance: 0.32, qty: [1, 3] },
      { item: "moon_silk", chance: 0.2, qty: [1, 2] },
      { item: "ember_core", chance: 0.07, qty: [1, 1] },
    ],
  },
  {
    id: "frost_hollow",
    name: "Frost Hollow",
    kind: "field",
    blurb: "A wide frozen basin. Cold, endless, profitable.",
    reqLevel: 36,
    threat: 640,
    enemyHit: 82,
    rounds: 15,
    durationMs: 40000,
    gold: [900, 1700],
    xp: 1600,
    rep: 20,
    drops: [
      { item: "moon_silk", chance: 0.32, qty: [1, 3] },
      { item: "ember_core", chance: 0.2, qty: [1, 2] },
      { item: "abyss_crystal", chance: 0.05, qty: [1, 1] },
    ],
  },
  {
    id: "wyrm_plateau",
    name: "Wyrm Plateau",
    kind: "field",
    blurb: "High wind-scoured stone under circling wyrms.",
    reqLevel: 46,
    threat: 1000,
    enemyHit: 120,
    rounds: 16,
    durationMs: 52000,
    gold: [1600, 2900],
    xp: 3000,
    rep: 30,
    drops: [
      { item: "ember_core", chance: 0.32, qty: [1, 3] },
      { item: "abyss_crystal", chance: 0.15, qty: [1, 2] },
      { item: "dragon_sinew", chance: 0.025, qty: [1, 1] },
    ],
  },

  {
    id: "millpond_reeds",
    name: "Millpond Reeds",
    kind: "field",
    blurb: "Flooded reed beds where drowned rats grow bold.",
    reqLevel: 5,
    threat: 55,
    enemyHit: 13,
    rounds: 11,
    durationMs: 14000,
    gold: [95, 200],
    xp: 110,
    rep: 4,
    drops: [
      { item: "coarse_hide", chance: 0.36, qty: [1, 2] },
      { item: "iron_shard", chance: 0.22, qty: [1, 2] },
      { item: "bone_dust", chance: 0.12, qty: [1, 1] },
    ],
  },
  {
    id: "briar_downs",
    name: "Briar Downs",
    kind: "field",
    blurb: "Thorn hills grazed by horned beasts.",
    reqLevel: 9,
    threat: 90,
    enemyHit: 18,
    rounds: 12,
    durationMs: 17000,
    gold: [140, 270],
    xp: 165,
    rep: 5,
    drops: [
      { item: "coarse_hide", chance: 0.38, qty: [1, 3] },
      { item: "iron_shard", chance: 0.24, qty: [1, 2] },
      { item: "bone_dust", chance: 0.16, qty: [1, 2] },
    ],
  },
  {
    id: "kingsroad_marches",
    name: "Kingsroad Marches",
    kind: "field",
    blurb: "Open verges patrolled by deserters and worse.",
    reqLevel: 17,
    threat: 190,
    enemyHit: 33,
    rounds: 13,
    durationMs: 24000,
    gold: [280, 520],
    xp: 400,
    rep: 8,
    drops: [
      { item: "bone_dust", chance: 0.3, qty: [1, 3] },
      { item: "spirit_ore", chance: 0.2, qty: [1, 2] },
      { item: "iron_shard", chance: 0.24, qty: [1, 3] },
    ],
  },
  {
    id: "saltmere_flats",
    name: "Saltmere Flats",
    kind: "field",
    blurb: "White salt pans crawling with brine-crusted things.",
    reqLevel: 20,
    threat: 250,
    enemyHit: 40,
    rounds: 13,
    durationMs: 27000,
    gold: [340, 660],
    xp: 540,
    rep: 10,
    drops: [
      { item: "spirit_ore", chance: 0.26, qty: [1, 2] },
      { item: "bone_dust", chance: 0.28, qty: [1, 3] },
      { item: "moon_silk", chance: 0.12, qty: [1, 1] },
    ],
  },
  {
    id: "emberwood",
    name: "Emberwood",
    kind: "field",
    blurb: "A forest that has been quietly burning for a century.",
    reqLevel: 29,
    threat: 400,
    enemyHit: 58,
    rounds: 14,
    durationMs: 33000,
    gold: [560, 1050],
    xp: 950,
    rep: 15,
    drops: [
      { item: "spirit_ore", chance: 0.3, qty: [1, 3] },
      { item: "moon_silk", chance: 0.22, qty: [1, 2] },
      { item: "ember_core", chance: 0.1, qty: [1, 1] },
    ],
  },
  {
    id: "moonveil_glade",
    name: "Moonveil Glade",
    kind: "field",
    blurb: "Silver mist, silver spiders, silver thread.",
    reqLevel: 32,
    threat: 500,
    enemyHit: 68,
    rounds: 15,
    durationMs: 36000,
    gold: [720, 1350],
    xp: 1250,
    rep: 17,
    drops: [
      { item: "moon_silk", chance: 0.3, qty: [1, 3] },
      { item: "spirit_ore", chance: 0.26, qty: [1, 2] },
      { item: "ember_core", chance: 0.12, qty: [1, 1] },
    ],
  },
  {
    id: "stormbreak_coast",
    name: "Stormbreak Coast",
    kind: "field",
    blurb: "Lightning-scoured cliffs above a wrecked fleet.",
    reqLevel: 41,
    threat: 800,
    enemyHit: 100,
    rounds: 16,
    durationMs: 46000,
    gold: [1200, 2200],
    xp: 2200,
    rep: 24,
    drops: [
      { item: "ember_core", chance: 0.26, qty: [1, 2] },
      { item: "moon_silk", chance: 0.28, qty: [1, 3] },
      { item: "abyss_crystal", chance: 0.08, qty: [1, 1] },
    ],
  },
  {
    id: "cinderwaste",
    name: "The Cinderwaste",
    kind: "field",
    blurb: "Ash to the horizon, and things that walk it unburnt.",
    reqLevel: 49,
    threat: 1250,
    enemyHit: 145,
    rounds: 17,
    durationMs: 60000,
    gold: [2100, 3800],
    xp: 4000,
    rep: 36,
    drops: [
      { item: "ember_core", chance: 0.34, qty: [1, 3] },
      { item: "abyss_crystal", chance: 0.18, qty: [1, 2] },
      { item: "dragon_sinew", chance: 0.035, qty: [1, 1] },
    ],
  },

  // dungeons
  {
    id: "sunken_crypt",
    name: "Sunken Crypt",
    kind: "dungeon",
    blurb: "Drowned bones still hold their oaths.",
    reqLevel: 15,
    threat: 200,
    enemyHit: 40,
    rounds: 16,
    durationMs: 26000,
    gold: [320, 620],
    xp: 420,
    rep: 18,
    drops: [
      { item: "bone_dust", chance: 0.4, qty: [1, 3] },
      { item: "spirit_ore", chance: 0.25, qty: [1, 2] },
      { item: "moon_silk", chance: 0.1, qty: [1, 1] },
    ],
  },
  {
    id: "howling_warren",
    name: "Howling Warren",
    kind: "dungeon",
    blurb: "Tunnels of gnashing vermin beneath the orchard road.",
    reqLevel: 8,
    threat: 90,
    enemyHit: 18,
    rounds: 14,
    durationMs: 18000,
    gold: [150, 300],
    xp: 180,
    rep: 10,
    drops: [
      { item: "coarse_hide", chance: 0.4, qty: [1, 3] },
      { item: "iron_shard", chance: 0.26, qty: [1, 2] },
      { item: "bone_dust", chance: 0.14, qty: [1, 1] },
    ],
  },
  {
    id: "drowned_chapel",
    name: "Drowned Chapel",
    kind: "dungeon",
    blurb: "A flooded shrine where the choir never stopped singing.",
    reqLevel: 21,
    threat: 300,
    enemyHit: 55,
    rounds: 17,
    durationMs: 32000,
    gold: [520, 980],
    xp: 780,
    rep: 26,
    drops: [
      { item: "bone_dust", chance: 0.34, qty: [1, 3] },
      { item: "spirit_ore", chance: 0.26, qty: [1, 2] },
      { item: "moon_silk", chance: 0.14, qty: [1, 2] },
    ],
  },
  {
    id: "ashen_quarry",
    name: "Ashen Quarry",
    kind: "dungeon",
    blurb: "Golems guard veins of burning stone.",
    reqLevel: 27,
    threat: 460,
    enemyHit: 70,
    rounds: 18,
    durationMs: 38000,
    gold: [700, 1400],
    xp: 1100,
    rep: 34,
    drops: [
      { item: "spirit_ore", chance: 0.36, qty: [1, 3] },
      { item: "moon_silk", chance: 0.26, qty: [1, 2] },
      { item: "ember_core", chance: 0.16, qty: [1, 2] },
    ],
  },
  {
    id: "obsidian_labyrinth",
    name: "Obsidian Labyrinth",
    kind: "dungeon",
    blurb: "Black glass corridors that rearrange behind you.",
    reqLevel: 33,
    threat: 600,
    enemyHit: 88,
    rounds: 19,
    durationMs: 44000,
    gold: [1000, 1900],
    xp: 1700,
    rep: 44,
    drops: [
      { item: "moon_silk", chance: 0.32, qty: [1, 3] },
      { item: "ember_core", chance: 0.22, qty: [1, 2] },
      { item: "abyss_crystal", chance: 0.07, qty: [1, 1] },
    ],
  },
  {
    id: "abyss_gate",
    name: "Gate of the Abyss",
    kind: "dungeon",
    blurb: "The rift breathes. Bring a full party.",
    reqLevel: 40,
    threat: 900,
    enemyHit: 115,
    rounds: 20,
    durationMs: 55000,
    gold: [1600, 3000],
    xp: 2600,
    rep: 60,
    drops: [
      { item: "ember_core", chance: 0.34, qty: [1, 2] },
      { item: "abyss_crystal", chance: 0.2, qty: [1, 2] },
      { item: "dragon_sinew", chance: 0.04, qty: [1, 1] },
    ],
  },
  {
    id: "frozen_hold",
    name: "The Frozen Hold",
    kind: "dungeon",
    blurb: "A dwarven vault sealed in blue ice, still lit from within.",
    reqLevel: 44,
    threat: 1050,
    enemyHit: 130,
    rounds: 21,
    durationMs: 62000,
    gold: [2000, 3600],
    xp: 3400,
    rep: 78,
    drops: [
      { item: "ember_core", chance: 0.34, qty: [1, 3] },
      { item: "abyss_crystal", chance: 0.22, qty: [1, 2] },
      { item: "dragon_sinew", chance: 0.06, qty: [1, 1] },
    ],
  },
  {
    id: "wyrm_roost",
    name: "Wyrm Roost",
    kind: "dungeon",
    blurb: "Only veteran clans return from the roost.",
    reqLevel: 50,
    threat: 1500,
    enemyHit: 165,
    rounds: 22,
    durationMs: 75000,
    gold: [3000, 5600],
    xp: 5000,
    rep: 110,
    drops: [
      { item: "abyss_crystal", chance: 0.34, qty: [1, 3] },
      { item: "dragon_sinew", chance: 0.14, qty: [1, 1] },
      { item: "ember_core", chance: 0.36, qty: [2, 4] },
    ],
  },
  {
    id: "sunless_throne",
    name: "The Sunless Throne",
    kind: "dungeon",
    blurb: "Where the last dead king still holds court. The clan's true test.",
    reqLevel: 52,
    threat: 1900,
    enemyHit: 190,
    rounds: 24,
    durationMs: 90000,
    gold: [4200, 7600],
    xp: 6800,
    rep: 150,
    drops: [
      { item: "abyss_crystal", chance: 0.38, qty: [2, 4] },
      { item: "dragon_sinew", chance: 0.18, qty: [1, 2] },
      { item: "ember_core", chance: 0.36, qty: [2, 5] },
    ],
  },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<string, Zone>;

/** Clan level requirements: reputation + gold. Max parties = level (capped 8). */
export const CLAN_LEVELS = [
  { level: 1, rep: 150, gold: 1000 },
  { level: 2, rep: 120, gold: 900 },
  { level: 3, rep: 340, gold: 2600 },
  { level: 4, rep: 800, gold: 6400 },
  { level: 5, rep: 1700, gold: 14000 },
  { level: 6, rep: 3400, gold: 30000 },
  { level: 7, rep: 6800, gold: 62000 },
  { level: 8, rep: 13000, gold: 120000 },
];

export const MAX_PARTY_SIZE = 5;

export const FIRST_NAMES = [
  "Aldric",
  "Vesna",
  "Korrin",
  "Mireth",
  "Draven",
  "Sylra",
  "Tobrin",
  "Nyssa",
  "Garruk",
  "Ilvane",
  "Redek",
  "Ophira",
  "Malek",
  "Serai",
  "Bruk",
  "Tanwen",
  "Ferrin",
  "Ysolde",
  "Havek",
  "Elowin",
  "Zarek",
  "Nadira",
  "Orlin",
  "Kessa",
  "Durn",
  "Amryn",
  "Sovak",
  "Liriel",
  "Brant",
  "Yevka",
];

export const LAST_NAMES = [
  "Ashvale",
  "Duskmoor",
  "Ironvein",
  "Stormcaller",
  "Greyhollow",
  "Thornwake",
  "Emberfall",
  "Nightgale",
  "Stonecrest",
  "Willowmere",
  "Bloodoak",
  "Farstrider",
];

/* ----------------------------------- Map ----------------------------------- */

export interface MapPoint {
  x: number;
  y: number;
}

/** Landmark positions on the world map (percent of the map surface). */
export const ZONE_POS: Record<string, MapPoint> = {
  wolf_fields: { x: 24, y: 66 },
  ruined_orchard: { x: 38, y: 78 },
  ashen_steppe: { x: 58, y: 62 },
  frost_hollow: { x: 74, y: 26 },
  wyrm_plateau: { x: 88, y: 52 },
  millpond_reeds: { x: 19, y: 74 },
  briar_downs: { x: 31, y: 88 },
  kingsroad_marches: { x: 44, y: 58 },
  saltmere_flats: { x: 52, y: 74 },
  emberwood: { x: 63, y: 54 },
  moonveil_glade: { x: 40, y: 30 },
  stormbreak_coast: { x: 74, y: 62 },
  cinderwaste: { x: 84, y: 34 },
  sunken_crypt: { x: 16, y: 40 },
  howling_warren: { x: 30, y: 56 },
  drowned_chapel: { x: 10, y: 70 },
  ashen_quarry: { x: 47, y: 44 },
  obsidian_labyrinth: { x: 55, y: 32 },
  abyss_gate: { x: 66, y: 84 },
  frozen_hold: { x: 82, y: 14 },
  wyrm_roost: { x: 90, y: 16 },
  sunless_throne: { x: 78, y: 70 },
};

/** The clan keep — where resting banners muster and every march begins. */
export const HOME_POS: MapPoint = { x: 35, y: 46 };

/** Milliseconds of marching per unit of map distance, and a floor so nowhere is instant. */
export const MS_PER_MAP_UNIT = 420;
export const MIN_TRAVEL_MS = 3000;

/** How long a banner marches from the keep to a zone, from map distance. */
export function travelMsTo(zoneId: string): number {
  const p = ZONE_POS[zoneId];
  if (!p) return MIN_TRAVEL_MS;
  const dist = Math.hypot(p.x - HOME_POS.x, p.y - HOME_POS.y);
  return Math.max(MIN_TRAVEL_MS, Math.round(dist * MS_PER_MAP_UNIT));
}

export interface Landmark {
  id: string;
  name: string;
  kind: "town" | "castle";
  blurb: string;
  pos: MapPoint;
}

export const LANDMARKS: Landmark[] = [
  {
    id: "havenreach",
    name: "Havenreach",
    kind: "town",
    blurb: "Clan hall, trainers and the quest board.",
    pos: { x: 30, y: 52 },
  },
  {
    id: "greymarket",
    name: "Greymarket",
    kind: "town",
    blurb: "Warehouse traders and the forge district.",
    pos: { x: 52, y: 30 },
  },
  {
    id: "emberwatch",
    name: "Emberwatch",
    kind: "town",
    blurb: "Last outpost before the burnt steppe.",
    pos: { x: 68, y: 68 },
  },
  {
    id: "coldspire",
    name: "Coldspire",
    kind: "town",
    blurb: "Frost traders and wyrm-hunter contracts.",
    pos: { x: 82, y: 36 },
  },
  {
    id: "ravensgate",
    name: "Frostwatch Keep",
    kind: "castle",
    blurb:
      "A Pale Warden bastion on the north-east frontier, where the Long Night presses hardest.",
    pos: { x: 86, y: 14 },
  },
  {
    id: "ravenhold",
    name: "Castle Vareth",
    kind: "castle",
    blurb: "Black stone over the trade road. Whoever holds it taxes every caravan.",
    pos: { x: 60, y: 90 },
  },
];

/** The named reaches the "Near" chat is split into — the towns/keeps that anchor them. */
export const CHAT_REGION_IDS = ["havenreach", "greymarket", "emberwatch", "coldspire", "ravenhold"];

/** Which reach a zone belongs to: the nearest anchor town/keep by map distance. */
export function regionForZone(zoneId: string): string | null {
  const zp = ZONE_POS[zoneId];
  if (!zp) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const id of CHAT_REGION_IDS) {
    const lm = LANDMARKS.find((l) => l.id === id);
    if (!lm) continue;
    const d = Math.hypot(zp.x - lm.pos.x, zp.y - lm.pos.y);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

/* -------------------------------- Contracts -------------------------------- */

export type Cadence = "daily" | "weekly" | "monthly";

export interface DailyMissionDef {
  id: string;
  name: string;
  cadence: Cadence;
  zoneId: string;
  kills: number;
  gold: number;
  rep: number;
  reward?: { item: ItemId; qty: number };
  /** extra reward, mostly for the long boards */
  reward2?: { item: ItemId; qty: number };
}

/** Daily board — harsher culls, posted fresh every day. */
export const DAILY_POOL: DailyMissionDef[] = [
  {
    id: "d_wolves",
    name: "Wolfsbane Contract",
    cadence: "daily",
    zoneId: "wolf_fields",
    kills: 180,
    gold: 2100,
    rep: 20,
    reward: { item: "coarse_hide", qty: 14 },
  },
  {
    id: "d_orchard",
    name: "Orchard Sweep",
    cadence: "daily",
    zoneId: "ruined_orchard",
    kills: 240,
    gold: 4200,
    rep: 30,
    reward: { item: "spirit_ore", qty: 10 },
  },
  {
    id: "d_crypt",
    name: "Crypt Vigil",
    cadence: "daily",
    zoneId: "sunken_crypt",
    kills: 280,
    gold: 6800,
    rep: 48,
    reward: { item: "moon_silk", qty: 10 },
  },
  {
    id: "d_steppe",
    name: "Ashfall Cull",
    cadence: "daily",
    zoneId: "ashen_steppe",
    kills: 330,
    gold: 11000,
    rep: 62,
    reward: { item: "ember_core", qty: 8 },
  },
  {
    id: "d_quarry",
    name: "Quarry Clearance",
    cadence: "daily",
    zoneId: "ashen_quarry",
    kills: 360,
    gold: 15600,
    rep: 80,
    reward: { item: "ember_core", qty: 12 },
  },
  {
    id: "d_hollow",
    name: "Hollow Patrol",
    cadence: "daily",
    zoneId: "frost_hollow",
    kills: 420,
    gold: 24000,
    rep: 105,
    reward: { item: "abyss_crystal", qty: 5 },
  },
  {
    id: "d_gate",
    name: "Rift Watch",
    cadence: "daily",
    zoneId: "abyss_gate",
    kills: 450,
    gold: 39000,
    rep: 140,
    reward: { item: "abyss_crystal", qty: 8 },
  },
  {
    id: "d_plateau",
    name: "Plateau Hunt",
    cadence: "daily",
    zoneId: "wyrm_plateau",
    kills: 480,
    gold: 48000,
    rep: 165,
    reward: { item: "dragon_sinew", qty: 3 },
  },
  {
    id: "d_roost",
    name: "Roost Tribute",
    cadence: "daily",
    zoneId: "wyrm_roost",
    kills: 540,
    gold: 78000,
    rep: 230,
    reward: { item: "dragon_sinew", qty: 5 },
  },
];

/** Weekly board — week-long campaigns, roughly six days of steady farming. */
export const WEEKLY_POOL: DailyMissionDef[] = [
  {
    id: "w_wolves",
    name: "The Long Cull",
    cadence: "weekly",
    zoneId: "wolf_fields",
    kills: 1400,
    gold: 22000,
    rep: 180,
    reward: { item: "coarse_hide", qty: 90 },
    reward2: { item: "spirit_ore", qty: 20 },
  },
  {
    id: "w_crypt",
    name: "Silence the Crypt",
    cadence: "weekly",
    zoneId: "sunken_crypt",
    kills: 1900,
    gold: 52000,
    rep: 300,
    reward: { item: "moon_silk", qty: 60 },
    reward2: { item: "ember_core", qty: 14 },
  },
  {
    id: "w_steppe",
    name: "Season of Ash",
    cadence: "weekly",
    zoneId: "ashen_steppe",
    kills: 2300,
    gold: 86000,
    rep: 400,
    reward: { item: "ember_core", qty: 45 },
  },
  {
    id: "w_quarry",
    name: "Break Every Warden",
    cadence: "weekly",
    zoneId: "ashen_quarry",
    kills: 2600,
    gold: 118000,
    rep: 480,
    reward: { item: "ember_core", qty: 60 },
    reward2: { item: "moon_silk", qty: 30 },
  },
  {
    id: "w_hollow",
    name: "Winter's Toll",
    cadence: "weekly",
    zoneId: "frost_hollow",
    kills: 3000,
    gold: 175000,
    rep: 620,
    reward: { item: "abyss_crystal", qty: 26 },
  },
  {
    id: "w_gate",
    name: "Hold the Rift",
    cadence: "weekly",
    zoneId: "abyss_gate",
    kills: 3400,
    gold: 265000,
    rep: 820,
    reward: { item: "abyss_crystal", qty: 40 },
    reward2: { item: "dragon_sinew", qty: 6 },
  },
  {
    id: "w_roost",
    name: "Wyrmwatch",
    cadence: "weekly",
    zoneId: "wyrm_roost",
    kills: 3800,
    gold: 420000,
    rep: 1100,
    reward: { item: "dragon_sinew", qty: 18 },
  },
];

/** Monthly board — clan-defining undertakings. */
export const MONTHLY_POOL: DailyMissionDef[] = [
  {
    id: "m_frontier",
    name: "Frontier Pacification",
    cadence: "monthly",
    zoneId: "ashen_steppe",
    kills: 9000,
    gold: 520000,
    rep: 2200,
    reward: { item: "ember_core", qty: 200 },
    reward2: { item: "moon_silk", qty: 120 },
  },
  {
    id: "m_hollow",
    name: "The Frozen Accord",
    cadence: "monthly",
    zoneId: "frost_hollow",
    kills: 11000,
    gold: 780000,
    rep: 3000,
    reward: { item: "abyss_crystal", qty: 120 },
    reward2: { item: "ember_core", qty: 160 },
  },
  {
    id: "m_gate",
    name: "Seal the Abyss",
    cadence: "monthly",
    zoneId: "abyss_gate",
    kills: 13000,
    gold: 1150000,
    rep: 4200,
    reward: { item: "abyss_crystal", qty: 180 },
    reward2: { item: "dragon_sinew", qty: 30 },
  },
  {
    id: "m_roost",
    name: "Tribute of Wyrms",
    cadence: "monthly",
    zoneId: "wyrm_roost",
    kills: 15000,
    gold: 1800000,
    rep: 5500,
    reward: { item: "dragon_sinew", qty: 60 },
    reward2: { item: "abyss_crystal", qty: 150 },
  },
];

export const ALL_MISSIONS = [...DAILY_POOL, ...WEEKLY_POOL, ...MONTHLY_POOL];

export const DAILY_BY_ID = Object.fromEntries(ALL_MISSIONS.map((d) => [d.id, d])) as Record<
  string,
  DailyMissionDef
>;

export const DAILY_COUNT = 4;
export const WEEKLY_COUNT = 3;
export const MONTHLY_COUNT = 2;

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/* -------------------------------- Synergies -------------------------------- */

export interface SynergyBonus {
  /** % party power */
  power?: number;
  /** % damage taken reduction for the whole party */
  mitigation?: number;
  /** flat loot find */
  find?: number;
  /** % experience */
  xp?: number;
  /** % gold */
  gold?: number;
  /** % mp cost cut on skills */
  upkeep?: number;
}

export interface SynergyDef {
  id: string;
  name: string;
  desc: string;
  /** how the composition is judged */
  match: (ctx: { roles: Role[]; classIds: string[]; races: RaceId[]; size: number }) => boolean;
  /** short human requirement line for the UI */
  req: string;
  bonus: SynergyBonus;
}

const has = (roles: Role[], r: Role) => roles.includes(r);
const count = (arr: string[], v: string) => arr.filter((x) => x === v).length;
const roleCount = (roles: Role[], r: Role) => roles.filter((x) => x === r).length;

export const SYNERGIES: SynergyDef[] = [
  {
    id: "shield_wall",
    name: "Shield Wall",
    req: "Guardian + Mender",
    desc: "The line holds while the mender keeps it standing. Everyone takes less punishment.",
    match: ({ roles }) => has(roles, "guardian") && has(roles, "mender"),
    bonus: { mitigation: 8, power: 4 },
  },
  {
    id: "war_choir",
    name: "War Choir",
    req: "Chanter + Guardian",
    desc: "Chants land on braced shoulders — the front rank swings harder and holds longer.",
    match: ({ roles }) => has(roles, "chanter") && has(roles, "guardian"),
    bonus: { power: 7, mitigation: 3 },
  },
  {
    id: "opening_gambit",
    name: "Opening Gambit",
    req: "Guardian + Blade",
    desc: "The guardian pins the beast, the blade goes for the seam behind it.",
    match: ({ roles }) => has(roles, "guardian") && has(roles, "blade"),
    bonus: { power: 8 },
  },
  {
    id: "focus_fire",
    name: "Focused Volley",
    req: "Archer + Arcanist",
    desc: "Arrows mark the target, spells break it open on the same beat.",
    match: ({ roles }) => has(roles, "archer") && has(roles, "arcanist"),
    bonus: { power: 9 },
  },
  {
    id: "mana_engine",
    name: "Mana Engine",
    req: "Chanter + Arcanist",
    desc: "Verses feed the caster's well — spells cost noticeably less to sustain.",
    match: ({ roles }) => has(roles, "chanter") && has(roles, "arcanist"),
    bonus: { upkeep: 18, power: 4 },
  },
  {
    id: "field_workshop",
    name: "Field Workshop",
    req: "Artisan + Guardian",
    desc: "Guarded long enough to strip the corpses properly. Far better spoils.",
    match: ({ roles }) => has(roles, "artisan") && has(roles, "guardian"),
    bonus: { find: 10, gold: 8 },
  },
  {
    id: "spoils_run",
    name: "Spoils Run",
    req: "Artisan + Archer",
    desc: "Scouted routes and a full pack — nothing worth carrying is left behind.",
    match: ({ roles }) => has(roles, "artisan") && has(roles, "archer"),
    bonus: { find: 8, xp: 4 },
  },
  {
    id: "vanguard_trio",
    name: "Vanguard",
    req: "Guardian + Mender + Chanter",
    desc: "The classic backbone. Nothing in the field breaks a full support core.",
    match: ({ roles }) => has(roles, "guardian") && has(roles, "mender") && has(roles, "chanter"),
    bonus: { power: 10, mitigation: 6, xp: 5 },
  },
  {
    id: "balanced_band",
    name: "Balanced Band",
    req: "5+ different roles",
    desc: "Every discipline covered. The party answers whatever the zone throws at it.",
    match: ({ roles }) => new Set(roles).size >= 5,
    bonus: { power: 12, xp: 10, mitigation: 4 },
  },
  {
    id: "twin_blades",
    name: "Twin Blades",
    req: "2 Blades",
    desc: "Two edges working the same flank. Vicious, but no one is watching their backs.",
    match: ({ roles }) => roleCount(roles, "blade") >= 2,
    bonus: { power: 10, mitigation: -4 },
  },
  {
    id: "arcane_convergence",
    name: "Arcane Convergence",
    req: "2 Arcanists",
    desc: "Overlapping castings collapse into one detonation.",
    match: ({ roles }) => roleCount(roles, "arcanist") >= 2,
    bonus: { power: 12, upkeep: -10 },
  },
  {
    id: "field_hospital",
    name: "Field Hospital",
    req: "2 Menders",
    desc: "Rotating heals — the party can stay out far longer than it should.",
    match: ({ roles }) => roleCount(roles, "mender") >= 2,
    bonus: { mitigation: 10, xp: 4 },
  },
  // class-specific pairings
  {
    id: "dawn_and_dusk",
    name: "Dawn and Dusk",
    req: "Lightbearer + Duskblade",
    desc: "Holy light blinds, the shadow slips in behind it. Opposites that work.",
    match: ({ classIds }) => classIds.includes("lightbearer") && classIds.includes("duskblade"),
    bonus: { power: 9, find: 4 },
  },
  {
    id: "deepstone_forge",
    name: "Deepstone Forge",
    req: "Runeguard + Forgewright",
    desc: "Durgan discipline. Gear is repaired between pulls and the ore keeps coming.",
    match: ({ classIds }) => classIds.includes("runeguard") && classIds.includes("forgewright"),
    bonus: { find: 9, mitigation: 5 },
  },
  {
    id: "storm_and_gale",
    name: "Storm and Gale",
    req: "Windrider + Tide Weaver",
    desc: "Wind carries the arrows, water carries the storm.",
    match: ({ classIds }) => classIds.includes("windrider") && classIds.includes("tideweaver"),
    bonus: { power: 10 },
  },
  {
    id: "blood_and_drums",
    name: "Blood and Drums",
    req: "Frenzy Raider + Totem Chanter",
    desc: "Grakhar war rite — the drums drive the raider past what a body should take.",
    match: ({ classIds }) => classIds.includes("frenzy") && classIds.includes("totem"),
    bonus: { power: 14, mitigation: -5 },
  },
  {
    id: "soul_bond",
    name: "Soul Bond",
    req: "Soulhunter + Sealkeeper",
    desc: "Kaemari seals feed every reaped soul straight back into the party.",
    match: ({ classIds }) => classIds.includes("soulhunter") && classIds.includes("sealkeeper"),
    bonus: { power: 8, upkeep: 12 },
  },
  {
    id: "verdant_pact",
    name: "Verdant Pact",
    req: "Lifebinder + Gladeshot",
    desc: "Sylvani woodcraft — traps, roots and a healer who never runs dry.",
    match: ({ classIds }) => classIds.includes("lifebinder") && classIds.includes("gladeshot"),
    bonus: { mitigation: 7, find: 6 },
  },
  {
    id: "hexfire",
    name: "Hexfire",
    req: "Hexbinder + Voidcaller",
    desc: "Nocturi ruin — the brand marks, the rift swallows.",
    match: ({ classIds }) => classIds.includes("hexbinder") && classIds.includes("voidcaller"),
    bonus: { power: 13, upkeep: 8 },
  },
  {
    id: "kindred",
    name: "Kindred Company",
    req: "Whole party of one race",
    desc: "One tongue, one drill, no hesitation.",
    match: ({ races, size }) => size >= 4 && new Set(races).size === 1,
    bonus: { power: 8, xp: 6 },
  },
  {
    id: "grand_company",
    name: "Grand Company",
    req: "Full party of 9",
    desc: "A complete banner in the field. Rival clans step aside.",
    match: ({ size }) => size >= 9,
    bonus: { power: 8, gold: 10, xp: 8 },
  },
  {
    id: "lone_wolf",
    name: "Lone Wolf",
    req: "A single member, no support",
    desc: "Nobody to heal you, nobody to split the loot with.",
    match: ({ size }) => size === 1,
    bonus: { find: 6, gold: 12, mitigation: -10 },
  },
  {
    id: "no_healer",
    name: "No Hand to Mend",
    req: "4+ members, no Mender",
    desc: "Nobody is patching wounds out there.",
    match: ({ roles, size }) => size >= 4 && !has(roles, "mender"),
    bonus: { mitigation: -10 },
  },
  {
    id: "glass_line",
    name: "Unguarded Line",
    req: "4+ members, no Guardian",
    desc: "Every blow lands on someone who cannot take it.",
    match: ({ roles, size }) => size >= 4 && !has(roles, "guardian"),
    bonus: { mitigation: -8, power: -4 },
  },
];

/** Duplicate-class crowding: too many of the exact same class dulls the party. */
export function crowdingPenalty(classIds: string[]) {
  let pen = 0;
  for (const id of new Set(classIds)) {
    const n = count(classIds, id);
    if (n >= 3) pen += (n - 2) * 4;
  }
  return pen;
}
