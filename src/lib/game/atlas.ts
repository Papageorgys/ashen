// The interactive atlas: the four painted maps of Aethyr turned into clickable
// data. Names and lore are transcribed from the canonical map paintings
// (Aethyr, The Ember Court, The Hollow Covenant, The Free Holds).
//
// Each map's `art` points at a file under /public/maps. Until that file exists
// the RealmAtlas falls back to a procedural relief plate, so the build stays
// green whether or not the paintings have been added yet.

export type AtlasLocationType = "realm" | "stronghold" | "ruin" | "holy" | "monument" | "poi";

export interface AtlasLocation {
  id: string;
  name: string;
  type: AtlasLocationType;
  /** percent coordinates on the painting (0..100) */
  x: number;
  y: number;
  blurb: string;
  /** realm-influence hue, for the continent halos */
  hue?: string;
  /** drill-down target: the id of the region map this place opens */
  region?: AtlasMapId;
  /** play-mode framing (mirrors the zone gate/threat feel) */
  level?: number;
  threat?: number;
}

export type AtlasMapId = "aethyr" | "ember_court" | "hollow_covenant" | "free_holds";

export interface AtlasMap {
  id: AtlasMapId;
  title: string;
  kind: "continent" | "region";
  subtitle: string;
  /** the painting; a file under /public/maps, or null to force the relief plate */
  art: string | null;
  /** realm hue used by the relief fallback and cartouche */
  hue: string;
  parent?: AtlasMapId;
  locations: AtlasLocation[];
}

/** Realm influence hues, from the atlas "Approximate Realm Influence" key. */
export const REALM_HUE = {
  ember: "#c8622f",
  pale: "#9fb0c2",
  hollow: "#9b74c0",
  verdant: "#7aa05c",
  gilded: "#d8b45a",
  sunless: "#7d5fae",
  free: "#8fa0b0",
} as const;

export const ATLAS_TYPE_LABEL: Record<AtlasLocationType, string> = {
  realm: "Realm influence",
  stronghold: "Contested stronghold",
  ruin: "Ruin / ruined keep",
  holy: "Flooded holy site",
  monument: "Monument",
  poi: "Point of interest",
};

export const ATLAS_ICON: Record<AtlasLocationType, string> = {
  realm: "✦",
  stronghold: "♜",
  ruin: "⌂",
  holy: "✟",
  monument: "◈",
  poi: "",
};

const A = REALM_HUE;

export const ATLAS_MAPS: Record<AtlasMapId, AtlasMap> = {
  aethyr: {
    id: "aethyr",
    title: "Aethyr",
    kind: "continent",
    hue: A.gilded,
    subtitle:
      "A fractured continent scoured by ash and ambition. Creed is power, legacy is earned — and the Long Night watches all.",
    art: "aethyr.png",
    locations: [
      {
        id: "ember_court",
        name: "The Ember Court",
        type: "realm",
        x: 31,
        y: 24,
        hue: A.ember,
        region: "ember_court",
        blurb:
          "A realm of cinders, oath and unyielding will. Where the old legions left only ash, the Ember Court rose — tempered in fire, judged by endurance.",
      },
      {
        id: "hollow_covenant",
        name: "The Hollow Covenant",
        type: "realm",
        x: 74,
        y: 22,
        hue: A.hollow,
        region: "hollow_covenant",
        blurb:
          "A realm of drowned faith and whispered oaths. Pilgrims are marked, roads remembered, and the dead keep their vows.",
      },
      {
        id: "free_holds",
        name: "The Free Holds",
        type: "realm",
        x: 45,
        y: 8,
        hue: A.free,
        region: "free_holds",
        blurb:
          "A hard country of stone, wind and stubborn folk on the northern frontier. No single lord rules here — only oaths, old grudges, and the right to stand your ground.",
      },
      {
        id: "pale_wardens",
        name: "The Pale Wardens",
        type: "realm",
        x: 19,
        y: 41,
        hue: A.pale,
        blurb:
          "Grey bastions holding the western marches against the Long Night. Discipline is their creed and vigilance their coin.",
      },
      {
        id: "verdant",
        name: "The Verdant Reclamation",
        type: "realm",
        x: 83,
        y: 44,
        hue: A.verdant,
        blurb:
          "The green reclaiming the ruins of the old world. Druid-circles nurse the forest over the bones of dead empires.",
      },
      {
        id: "gilded",
        name: "The Gilded Compact",
        type: "realm",
        x: 23,
        y: 60,
        hue: A.gilded,
        blurb:
          "Merchant princes and the ledger. Every road, toll and debt in the south runs through their counting-houses.",
      },
      {
        id: "sunless",
        name: "The Sunless Choir",
        type: "realm",
        x: 52,
        y: 78,
        hue: A.sunless,
        blurb:
          "Zealots singing in the drowned dark of the southern reaches, where light fails and rites are older than names.",
      },
      {
        id: "vareth",
        name: "Castle Vareth",
        type: "stronghold",
        x: 50,
        y: 27,
        blurb:
          "The Contested Stronghold at the heart of Aethyr. Black stone over the trade road — whoever holds it taxes every caravan and every rival's pride.",
      },
      {
        id: "ashen_reach",
        name: "The Ashen Reach",
        type: "monument",
        x: 48,
        y: 49,
        blurb:
          "The scoured imperial heart, claimed by none and crossed by all. The crossroads of the continent, where every march begins.",
      },
      {
        id: "founders",
        name: "The Founders' Monument",
        type: "monument",
        x: 77,
        y: 66,
        blurb: "A ringed monument to the first oath-takers, half-swallowed by the Verdant green.",
      },
      {
        id: "drowned",
        name: "The Drowned Cathedrals",
        type: "holy",
        x: 38,
        y: 71,
        blurb:
          "Flooded spires of a faith the sea took. The seat of the Sunless Choir's drowned devotions.",
      },
      {
        id: "embervault",
        name: "The Embervault",
        type: "ruin",
        x: 41,
        y: 86,
        blurb:
          "A sunken vault-city beneath the Sunless Choir. What was sealed there was sealed for a reason.",
      },
    ],
  },

  ember_court: {
    id: "ember_court",
    title: "The Ember Court",
    kind: "region",
    hue: A.ember,
    parent: "aethyr",
    subtitle:
      "A realm of cinders, oath and unyielding will — tempered in fire, bound by duty, and judged by endurance.",
    art: "ember-court.png",
    locations: [
      {
        id: "vareth",
        name: "Castle Vareth",
        type: "stronghold",
        x: 57,
        y: 45,
        level: 40,
        threat: 1000,
        blurb:
          "The Contested Stronghold. The Ember Court's black seat astride the trade road — the prize every realm covets.",
      },
      {
        id: "ec1",
        name: "Ruined Watch",
        type: "ruin",
        x: 47,
        y: 20,
        level: 8,
        threat: 60,
        blurb:
          "A shattered outpost overlooking the Searing Wastes. Its beacon has been cold for a century.",
      },
      {
        id: "ec2",
        name: "Ashfall Ford",
        type: "poi",
        x: 28,
        y: 37,
        level: 12,
        threat: 120,
        blurb:
          "A choked crossing where the river runs thin with ash. Wagons founder here; wolves know it.",
      },
      {
        id: "ec3",
        name: "Legion Redoubt",
        type: "stronghold",
        x: 74,
        y: 43,
        level: 24,
        threat: 320,
        blurb:
          "Forward bastion of the Ember Legions. Oaths are sworn here in fire and kept in blood.",
      },
      {
        id: "ec4",
        name: "Broken Causeway",
        type: "ruin",
        x: 29,
        y: 55,
        level: 16,
        threat: 180,
        blurb:
          "Collapsed span of an old imperial road, claimed by none. A smuggler's shortcut and an ambusher's dream.",
      },
      {
        id: "ec5",
        name: "Buried Village",
        type: "ruin",
        x: 48,
        y: 64,
        level: 20,
        threat: 240,
        blurb:
          "Half-swallowed by ash, its dead uncounted. Something still stirs the cinders after dark.",
      },
      {
        id: "ec6",
        name: "Warded Pass",
        type: "poi",
        x: 68,
        y: 58,
        level: 28,
        threat: 420,
        blurb: "A guarded route bound by wardstones and oaths. Toll paid in coin — or in kind.",
      },
    ],
  },

  hollow_covenant: {
    id: "hollow_covenant",
    title: "The Hollow Covenant",
    kind: "region",
    hue: A.hollow,
    parent: "aethyr",
    subtitle:
      "A realm of drowned faith and whispered oaths. The dead keep their vows — travel light, speak soft.",
    art: "hollow-covenant.png",
    locations: [
      {
        id: "drowned",
        name: "The Drowned Cathedrals",
        type: "holy",
        x: 50,
        y: 33,
        level: 36,
        threat: 640,
        blurb:
          "The seat of the Covenant — cathedral spires standing in black water, where the drowned choir never quite falls silent.",
      },
      {
        id: "hc1",
        name: "Flooded Shrine",
        type: "holy",
        x: 37,
        y: 33,
        level: 5,
        threat: 55,
        blurb:
          "A wayshrine gone to the water. Pilgrims still leave marks on its lintel, above the waterline.",
      },
      {
        id: "hc2",
        name: "Bone Causeway",
        type: "poi",
        x: 68,
        y: 26,
        level: 14,
        threat: 150,
        blurb:
          "A raised road paved with the interred. It remembers every foot that ever crossed it.",
      },
      {
        id: "hc3",
        name: "Silent Ossuary",
        type: "ruin",
        x: 44,
        y: 49,
        level: 18,
        threat: 200,
        blurb:
          "A vault of stacked dead in the Silent Vale. Speak softly — nameless things remember.",
      },
      {
        id: "hc4",
        name: "Gravewater Village",
        type: "poi",
        x: 74,
        y: 45,
        level: 22,
        threat: 280,
        blurb: "A hamlet on the Boneflood where the living and the drowned share the same wells.",
      },
      {
        id: "hc5",
        name: "Hollow Watch",
        type: "ruin",
        x: 45,
        y: 68,
        level: 30,
        threat: 480,
        blurb:
          "A watchtower over the Stalled Lowlands, kept by sentries who forgot to stop their vigil.",
      },
      {
        id: "hc6",
        name: "Rite Basin",
        type: "holy",
        x: 66,
        y: 71,
        level: 34,
        threat: 560,
        blurb: "A ringed basin where the deepest rites are sung. The water turns without wind.",
      },
    ],
  },

  free_holds: {
    id: "free_holds",
    title: "The Free Holds",
    kind: "region",
    hue: A.free,
    parent: "aethyr",
    subtitle:
      "Hold by oath, die by choice. Many holds, no overlord — old roads, old blood; a blade earns welcome, a coward earns none.",
    art: "free-holds.png",
    locations: [
      {
        id: "fh1",
        name: "Highland Gate",
        type: "poi",
        x: 47,
        y: 27,
        level: 6,
        threat: 50,
        blurb:
          "The old high-road gateway through the Grimfrost Heights. Toll-free — but never safe.",
      },
      {
        id: "fh2",
        name: "Rune Bridge",
        type: "stronghold",
        x: 66,
        y: 43,
        level: 16,
        threat: 180,
        blurb:
          "An arched span etched with warding runes — the key crossing over the Sundered Gorge.",
      },
      {
        id: "fh3",
        name: "Mercenary Camp",
        type: "poi",
        x: 24,
        y: 52,
        level: 10,
        threat: 100,
        blurb:
          "A shifting camp of sellswords and free companies. Loyalty is for hire; grudges are not.",
      },
      {
        id: "fh4",
        name: "Broken Hall",
        type: "ruin",
        x: 42,
        y: 60,
        level: 20,
        threat: 260,
        blurb: "Ruined stronghold of a long-fallen house. Rich in plunder, richer in ghosts.",
      },
      {
        id: "fh5",
        name: "Frost Pass",
        type: "poi",
        x: 42,
        y: 76,
        level: 26,
        threat: 380,
        blurb: "A narrow, wind-scoured pass through the White Teeth. Few return in winter.",
      },
      {
        id: "fh6",
        name: "Stone Beacon",
        type: "monument",
        x: 68,
        y: 68,
        level: 30,
        threat: 500,
        blurb: "An ancient signal tower. Fires seen here can rouse holds for leagues.",
      },
    ],
  },
};

/**
 * Which real game zone each atlas place deploys to, so play-mode marches move an
 * actual banner. The atlas places are lore points of interest, so this is a
 * deliberate, level-matched mapping onto the mechanical ZONES (see data.ts);
 * ids are unique within each region map.
 */
export const ATLAS_ZONE: Record<string, string> = {
  // Ember Court
  vareth: "abyss_gate",
  ec1: "howling_warren",
  ec2: "ruined_orchard",
  ec3: "ashen_steppe",
  ec4: "sunken_crypt",
  ec5: "saltmere_flats",
  ec6: "emberwood",
  // Hollow Covenant
  drowned: "frost_hollow",
  hc1: "millpond_reeds",
  hc2: "sunken_crypt",
  hc3: "drowned_chapel",
  hc4: "saltmere_flats",
  hc5: "moonveil_glade",
  hc6: "obsidian_labyrinth",
  // Free Holds
  fh1: "briar_downs",
  fh2: "kingsroad_marches",
  fh3: "howling_warren",
  fh4: "drowned_chapel",
  fh5: "ashen_quarry",
  fh6: "moonveil_glade",
};

/** The six numbered points of interest on a region map, in painting order. */
export function numberedLocations(map: AtlasMap): AtlasLocation[] {
  if (map.kind !== "region") return [];
  return map.locations.filter((l) => l.id !== "vareth" && l.id !== "drowned");
}

/** The marker face for a location: its painting number (1..6) or a type glyph. */
export function atlasMarker(map: AtlasMap, loc: AtlasLocation): string {
  const n = numberedLocations(map).indexOf(loc);
  if (n >= 0) return String(n + 1);
  return ATLAS_ICON[loc.type] || "✦";
}
