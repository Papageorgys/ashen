/**
 * The seven realms of the Ashen Realm and their fallen capitals — points of
 * interest on the War Table map. Each realm's borders fall along the mountains
 * and the sea; a ruined capital anchors each. Coordinates are in the map's
 * 0..100 design space (the plate scales y by 0.62). Colours tint the realm name.
 */
export type FallenCapital = {
  id: string;
  race: string;
  capital: string;
  x: number;
  y: number;
  color: [number, number, number];
};

export const FALLEN_CAPITALS: FallenCapital[] = [
  { id: "sylvani", race: "Sylvani", capital: "Eldanar", x: 28, y: 16, color: [92, 138, 92] },
  { id: "ravenfold", race: "Ravenfold", capital: "Ravensgate", x: 48, y: 16, color: [154, 124, 98] },
  { id: "durgan", race: "Durgan", capital: "Kaz Durom", x: 80, y: 20, color: [120, 120, 152] },
  { id: "hyunan", race: "Hyunan", capital: "Cael Havar", x: 44, y: 46, color: [184, 164, 92] },
  { id: "kaemari", race: "Kaemari", capital: "Aeraveth", x: 84, y: 50, color: [108, 160, 168] },
  { id: "grakhar", race: "Grakhar", capital: "Gor Ashkul", x: 68, y: 74, color: [190, 110, 72] },
  { id: "nocturi", race: "Nocturi", capital: "Vael Noctis", x: 22, y: 62, color: [156, 100, 146] },
];
