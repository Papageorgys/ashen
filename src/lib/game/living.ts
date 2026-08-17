// The Living Realm — the ambient life of Aethyr. A single module of PURE,
// deterministic generators keyed on the clock, the day, and game state, so the
// world breathes the same for every player of the shared world and every line is
// reproducible and testable. Nothing here mutates state; the hook surfaces these
// as ambient log lines, and panels read them for atmosphere.
//
// This is what turns a set of systems into a place: a day that turns, a court
// that gossips, houses that scheme against you, merchants who pass through, a
// market that breathes, champions who mutter by the fire, and a realm that is
// always, quietly, doing something.

import type { Member } from "./engine";

/* ------------------------------- Time of day ------------------------------- */

export type DayPhase = "dawn" | "day" | "dusk" | "night";

export interface TimeOfDay {
  phase: DayPhase;
  label: string;
  glyph: string;
  /** 0..1 through the whole day, for tinting */
  t: number;
}

/** The realm's clock turns on real time — a full day every 2 real hours, so the
 * light shifts often enough to feel alive without being frantic. */
export function timeOfDay(now: number): TimeOfDay {
  const DAY_MS = 2 * 60 * 60 * 1000;
  const t = (now % DAY_MS) / DAY_MS; // 0..1
  const hour = Math.floor(t * 24);
  let phase: DayPhase;
  let label: string;
  let glyph: string;
  if (hour < 6) {
    phase = "night";
    label = "the small hours";
    glyph = "☾";
  } else if (hour < 9) {
    phase = "dawn";
    label = "dawn";
    glyph = "🌅";
  } else if (hour < 18) {
    phase = "day";
    label = "day";
    glyph = "☀";
  } else if (hour < 21) {
    phase = "dusk";
    label = "dusk";
    glyph = "🌆";
  } else {
    phase = "night";
    label = "nightfall";
    glyph = "☾";
  }
  return { phase, label, glyph, t };
}

/* ------------------------------- Prosperity -------------------------------- */

export interface Prosperity {
  tier: "thriving" | "steady" | "strained" | "starving";
  label: string;
  hue: string;
  blurb: string;
}

/** How a realm is faring, read from its development and people. */
export function realmProsperity(dev: number, pop: number): Prosperity {
  const score = dev * 0.6 + Math.min(100, (pop / 300) * 100) * 0.4;
  if (score >= 62)
    return {
      tier: "thriving",
      label: "Thriving",
      hue: "#7ea86a",
      blurb: "Full granaries, busy roads, and children in the lanes.",
    };
  if (score >= 38)
    return {
      tier: "steady",
      label: "Steady",
      hue: "#c9b06a",
      blurb: "The realm holds its own — no feast, but no famine.",
    };
  if (score >= 20)
    return {
      tier: "strained",
      label: "Strained",
      hue: "#d8a24a",
      blurb: "Thin harvests and thinner patience.",
    };
  return {
    tier: "starving",
    label: "Reeling",
    hue: "#d1603a",
    blurb: "The land is bled white — smoke on the horizon, empty fields.",
  };
}

/* ----------------------------- Word from throne ---------------------------- */

const THRONE_WORDS = [
  "The King bids every loyal house sharpen its steel — the marches will not hold themselves.",
  "By royal word: the roads are the crown's, and the crown's roads shall be safe.",
  "The throne looks kindly on houses that answer their charges swiftly.",
  "The King has taken council through the night. The realm waits on his word.",
  "A proclamation: let no banner idle while the Long Night gathers.",
  "The crown remembers its friends — and its debts.",
  "The King's heralds ride out. Ambitious houses, take note.",
  "The throne grows cold with the years. Some whisper of succession.",
  "By decree, the tourney grounds are open to any house with the nerve.",
  "The King asks only loyalty, gold, and blood — in that order.",
];

/** The rotating proclamation nailed to the court door today. */
export function throneWord(dayIndex: number): string {
  return THRONE_WORDS[Math.abs(dayIndex) % THRONE_WORDS.length]!;
}

/* ------------------------------ Court seasons ------------------------------ */

export interface CourtSeason {
  id: string;
  name: string;
  blurb: string;
  /** multiplier on favor earned this week */
  favorMult: number;
}

const COURT_SEASONS: CourtSeason[] = [
  { id: "common", name: "Ordinary Court", blurb: "The court keeps its usual grind.", favorMult: 1 },
  {
    id: "tourney",
    name: "The King's Tourney",
    blurb: "Glory is cheap this week — favor won at court is richer.",
    favorMult: 1.35,
  },
  {
    id: "feast",
    name: "The High Feast",
    blurb: "The hall is loud and generous; the King's favor flows freely.",
    favorMult: 1.25,
  },
  {
    id: "mourning",
    name: "Days of Mourning",
    blurb: "The court is grey and grudging. Favor is hard-won.",
    favorMult: 0.85,
  },
  {
    id: "intrigue",
    name: "A Season of Knives",
    blurb: "Whispers everywhere. Rivals press their advantage.",
    favorMult: 1.0,
  },
];

/** Which court season it is this week (deterministic by week index). */
export function courtSeason(weekIndex: number): CourtSeason {
  return COURT_SEASONS[Math.abs(weekIndex) % COURT_SEASONS.length]!;
}

/* ---------------------------- Rival vassal houses -------------------------- */

export interface RivalHouse {
  name: string;
  favor: number;
  scheme: string;
}

const HOUSE_NAMES = [
  "House Vaskell",
  "House Duncarrow",
  "The Grey Wardens of Mott",
  "House Ashford",
  "The Carrion Barons",
  "House Ravenmoor",
  "The Ironwright League",
  "House Thornebury",
];
const SCHEMES = [
  "courts the King's ear",
  "buys up the crown's debts",
  "musters quietly in the north",
  "weds into the old blood",
  "spreads coin among the heralds",
  "hunts the Long Night for glory",
  "presses its claim on the marches",
  "waits, and watches you",
];

/** The other houses climbing the ladder alongside you — a living court of rivals
 * whose standing drifts with time. Deterministic from the day and their index. */
export function rivalHouses(dayIndex: number, playerFavor: number): RivalHouse[] {
  return HOUSE_NAMES.slice(0, 5).map((name, i) => {
    // each house has its own steady climb plus a slow wobble
    const base = 40 + i * 30;
    const climb = (dayIndex + i * 7) * (2 + i * 0.6);
    const wobble = Math.round(60 * Math.sin((dayIndex + i * 3) / 4));
    const favor = Math.max(0, Math.round(base + climb * 0.4 + wobble));
    return { name, favor, scheme: SCHEMES[(i + dayIndex) % SCHEMES.length]! };
  });
}

/* ------------------------------- Market life ------------------------------- */

/** A daily market index (~0.82..1.18) that makes prices breathe. Deterministic
 * by day so buyers and sellers see the same market. */
export function marketIndex(dayIndex: number): number {
  const wave =
    Math.sin(dayIndex / 3) * 0.1 + Math.sin(dayIndex / 1.3 + 1) * 0.05 + Math.sin(dayIndex) * 0.03;
  return Math.max(0.8, Math.min(1.2, 1 + wave));
}

export interface MerchantVisit {
  name: string;
  wares: string;
  blurb: string;
  /** discount fraction on the market today, 0.1..0.35 */
  discount: number;
}

const MERCHANTS = [
  { name: "Oksana the Far-Walker", wares: "silks and strange oils" },
  { name: "the Grey Caravan", wares: "salvage from the deep roads" },
  { name: "Brother Hald the Pardoner", wares: "relics of dubious grace" },
  { name: "the Sunless Peddler", wares: "essence, cheaply got" },
  { name: "Merek Coppertongue", wares: "arms and rumor in equal measure" },
];

/** Who, if anyone, is passing through the market today. Not every day has one. */
export function travelingMerchant(dayIndex: number): MerchantVisit | null {
  if (Math.abs(dayIndex) % 3 === 1) return null; // some days, no one comes
  const m = MERCHANTS[Math.abs(dayIndex) % MERCHANTS.length]!;
  const discount = 0.12 + Math.abs(Math.sin(dayIndex)) * 0.22;
  return {
    name: m.name,
    wares: m.wares,
    blurb: `${m.name} has set up in the market square, dealing in ${m.wares}.`,
    discount: Math.round(discount * 100) / 100,
  };
}

/* -------------------------------- Rumor feed ------------------------------- */

const RUMORS = [
  "A shepherd swears the standing stones sang at dusk.",
  "They say a clan in the east took a dragon's skull for a banner.",
  "The Gilded Compact has raised its tolls again. Merchants grumble.",
  "A grey ship was seen off the drowned coast, crewed by no one.",
  "Two houses came to blows over a well. The well won.",
  "Pilgrims on the crown road speak of lights under the Long Night.",
  "A hedge-knight is buying up cheap steel and asking after your banner.",
  "The Sunless Choir sang for three days without stopping. Then they stopped.",
  "Someone is paying good coin for stories of the old kings.",
  "A comet, they say. The old folk are bolting their doors.",
  "The Verdant Reclamation has planted a forest where a battle was. It grows fast.",
  "A tax collector went into the Hollow Covenant. His ledger came back. He did not.",
];

/** A rumor drifting through the realm — pick one deterministically from a seed. */
export function realmRumor(seed: number): string {
  return RUMORS[Math.abs(Math.floor(seed)) % RUMORS.length]!;
}

/* ---------------------------- Ambient realm events ------------------------- */

export interface RealmEvent {
  id: string;
  title: string;
  text: string;
  /** a small one-off boon when it lands, if any */
  boon?: { gold?: number; rep?: number; favor?: number; inspiration?: number };
}

const REALM_EVENTS: RealmEvent[] = [
  {
    id: "harvest",
    title: "A Good Harvest",
    text: "The fields come in heavy. The people are glad, and generous.",
    boon: { gold: 120 },
  },
  {
    id: "festival",
    title: "A Festival of Ash",
    text: "Bonfires and old songs. Your banners are toasted in every hall.",
    boon: { rep: 30 },
  },
  {
    id: "pilgrims",
    title: "Pilgrims at the Gate",
    text: "Wanderers bring alms and stranger gifts, and a scrap of hope.",
    boon: { inspiration: 1 },
  },
  {
    id: "envoy",
    title: "A Royal Envoy",
    text: "A rider from the throne is seen at your gate, and gone by morning.",
    boon: { favor: 12 },
  },
  {
    id: "omen",
    title: "An Ill Omen",
    text: "Crows gather on the keep. The septons mutter. Nothing comes of it. Yet.",
  },
  {
    id: "caravan",
    title: "A Caravan Arrives",
    text: "Wheels and dust on the crown road — trade, and news from far off.",
    boon: { gold: 90 },
  },
];

/** The realm event turning today, if any (roughly one every few days). */
export function realmEvent(dayIndex: number): RealmEvent | null {
  if (Math.abs(dayIndex) % 2 === 0) return null;
  return REALM_EVENTS[Math.abs(Math.floor(dayIndex / 2)) % REALM_EVENTS.length]!;
}

/* ---------------------------- Champion chatter ----------------------------- */

const CHATTER_BY_ROLE: Record<string, string[]> = {
  guardian: ["oils the great shield by the fire.", "stands the night watch without being asked."],
  blade: ["runs drills in the yard until their hands bleed.", "sharpens a blade already sharp."],
  archer: [
    "fletches arrows and hums an old marching song.",
    "shoots at shadows on the wall, and wins.",
  ],
  arcanist: ["mutters over a book that hums back.", "burns a candle at both ends, literally."],
  mender: [
    "brews something bitter and makes everyone drink it.",
    "sits with the wounded past midnight.",
  ],
  chanter: ["teaches the recruits a filthy marching chant.", "sings the fallen's names, quietly."],
  artisan: [
    "tinkers with a device that smokes ominously.",
    "haggles with the quartermaster and wins.",
  ],
};

const CHATTER_GENERIC = [
  "swaps lies with the recruits over thin ale.",
  "writes a letter home that will never be sent.",
  "loses at dice, again, and laughs about it.",
  "polishes a keepsake from a fallen friend.",
  "watches the road north and says nothing.",
];

/** An idle line for a champion resting at the hall. Seed keeps it stable a while. */
export function champChatter(m: Member, role: string, seed: number): string {
  const pool = [...(CHATTER_BY_ROLE[role] ?? []), ...CHATTER_GENERIC];
  const line = pool[Math.abs(Math.floor(seed)) % pool.length]!;
  return `${m.name} ${line}`;
}

/* ---------------------------- Letters from field --------------------------- */

const FIELD_LINES = [
  "reports the going hard but the spirits high.",
  "sends word of strange tracks at the treeline.",
  "writes that the quartermaster's boots have already failed.",
  "asks after home, and whether the ale has held.",
  "reports a shrine, long abandoned, still warm to the touch.",
  "sends a pressed flower and no explanation.",
  "writes only: 'we hold. send salt.'",
];

/** A dispatch home from a banner in the field. */
export function fieldLetter(partyName: string, zoneName: string, seed: number): string {
  const line = FIELD_LINES[Math.abs(Math.floor(seed)) % FIELD_LINES.length]!;
  return `${partyName}, out in ${zoneName}, ${line}`;
}

/* ------------------------------ Long Night omens --------------------------- */

/** A forewarning or aftermath line for the Long Night, by how near it is. */
export function nightOmen(active: boolean, ticksLeft: number): string | null {
  if (active) {
    if (ticksLeft <= 2) return "The dark thins. Dawn is close — hold the line a little longer.";
    return "The Long Night is abroad. Every shadow leans toward the borders.";
  }
  if (ticksLeft <= 2) return "The light fails early. Dogs will not settle. The dark is near.";
  if (ticksLeft <= 5) return "Frost creeps in out of season. The old folk speak of the Night.";
  return null;
}

/* ------------------------------- Atmosphere -------------------------------- */

const ATMOSPHERE: Record<DayPhase, string[]> = {
  dawn: ["Cook-fires smoke to life across the camp.", "The first bell rings thin over the keep."],
  day: ["The yard rings with drill and complaint.", "Traders' carts grind through the lower gate."],
  dusk: ["Lamps are lit along the walls, one by one.", "The day's banners are counted home."],
  night: [
    "The watch changes with a stamp and a curse.",
    "Somewhere in the keep, someone is still awake.",
  ],
};

/** A quiet line of atmosphere for the current hour of the day. */
export function atmosphere(phase: DayPhase, seed: number): string {
  const pool = ATMOSPHERE[phase];
  return pool[Math.abs(Math.floor(seed)) % pool.length]!;
}
