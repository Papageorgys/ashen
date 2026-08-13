/**
 * The seven realms of Aethyr and their seats — points of interest on the War
 * Table map, drawn to follow the canonical atlas (Story Bible §6): the Ember
 * Court at the contested heart, the others ringing it by the cartographer's
 * hand. Coordinates are in the map's 0..100 design space (the plate scales y by
 * 0.62); colours are the atlas's Realm Influence key.
 */
export type RealmSeat = {
  id: string;
  realm: string;
  seat: string;
  x: number;
  y: number;
  color: [number, number, number];
};

export const REALM_SEATS: RealmSeat[] = [
  // The imperial heart — the Ashen Reach, with contested Castle Vareth at its crossroads.
  { id: "ember_court", realm: "The Ember Court", seat: "The Ashen Reach", x: 52, y: 42, color: [196, 96, 52] },
  // North: highland clans and the border knights.
  { id: "free_holds", realm: "The Free Holds", seat: "Skald's Marches", x: 36, y: 18, color: [124, 138, 156] },
  { id: "pale_wardens", realm: "The Pale Wardens", seat: "Warden's Bastion", x: 80, y: 20, color: [160, 172, 186] },
  // West: the death-cult in the murmuring dark.
  { id: "hollow_covenant", realm: "The Hollow Covenant", seat: "The Murmuring Depths", x: 22, y: 46, color: [150, 112, 170] },
  // East: druids and the reclaiming green.
  { id: "verdant_reclamation", realm: "The Verdant Reclamation", seat: "Greenfall Sanctuary", x: 82, y: 50, color: [122, 152, 92] },
  // South-west: merchant princes and the ledger.
  { id: "gilded_compact", realm: "The Gilded Compact", seat: "Brightmarket Exchange", x: 30, y: 72, color: [200, 168, 84] },
  // South-east: the zealot cult in the sunless waste.
  { id: "sunless_choir", realm: "The Sunless Choir", seat: "The Obsidian Spire", x: 72, y: 76, color: [128, 98, 158] },
];
