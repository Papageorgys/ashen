import type { Rng } from "./rng";
import { foodBalance } from "./economy";
import type { Ledger } from "./kingdom";
import type { World } from "./types";

/**
 * Dynamic world events — the simulation raises a crisis or a boon from the
 * kingdom's state, and each choice has a STRUCTURED consequence the ledger
 * applies. The prose describes; the numbers decide.
 */

export interface Outcome {
  treasury?: number;
  food?: number;
  unrest?: number;
  /** short line describing what followed (the narration surface) */
  result: string;
}

export interface Choice {
  label: string;
  outcome: (ledger: Ledger) => Outcome;
}

export interface RealmEvent {
  id: string;
  title: string;
  body: string;
  choices: Choice[];
}

/** Apply a chosen outcome to the ledger. Returns the outcome for narration. */
export function applyOutcome(ledger: Ledger, o: Outcome): Outcome {
  if (o.treasury) ledger.treasury = Math.max(0, ledger.treasury + o.treasury);
  if (o.food) ledger.food = Math.max(0, ledger.food + o.food);
  if (o.unrest) ledger.unrest = Math.max(0, Math.min(100, ledger.unrest + o.unrest));
  return o;
}

const EVENTS: ((world: World, ledger: Ledger) => RealmEvent)[] = [
  // The harvest has failed — the design's canonical event
  (world, ledger) => ({
    id: "harvest_failure",
    title: "The Harvest Has Failed",
    body: "Northern villages report severe crop losses. Food production has collapsed and the people are frightened.",
    choices: [
      {
        label: "Release the royal grain reserves",
        outcome: () => ({
          food: -120,
          unrest: -8,
          result: "The granaries opened and the people were fed. The stores are much diminished.",
        }),
      },
      {
        label: "Import grain from abroad",
        outcome: (l) => ({
          treasury: -Math.min(180, l.treasury),
          unrest: -5,
          result:
            "Foreign grain arrived by cart and keel. The coffers are lighter, but bellies are full.",
        }),
      },
      {
        label: "Seize the nobles' private stores",
        outcome: () => ({
          food: 80,
          unrest: 10,
          result: "The lords' barns were emptied by royal writ. The people ate; the nobles seethe.",
        }),
      },
      {
        label: "Do nothing",
        outcome: () => ({
          unrest: 16,
          result: "The crown looked away. Villages emptied, and the roads filled with the hungry.",
        }),
      },
    ],
  }),
  // A bandit uprising
  (world, ledger) => ({
    id: "bandit_uprising",
    title: "Brigands in the Hills",
    body: "Deserters and outlaws have banded together and prey on the roads. Trade slows and the outlying farms cry for protection.",
    choices: [
      {
        label: "Send soldiers to hunt them down",
        outcome: () => ({
          treasury: -60,
          unrest: -6,
          result:
            "The banners rode out and hung the brigand captains at the crossroads. The roads are safe again.",
        }),
      },
      {
        label: "Offer the brigands a pardon and a wage",
        outcome: () => ({
          treasury: -40,
          unrest: -2,
          result:
            "Half the outlaws took the coin and the oath; the rest scattered. A cheap peace, if a grubby one.",
        }),
      },
      {
        label: "Let the local lords deal with it",
        outcome: () => ({
          unrest: 6,
          result:
            "The crown stayed its hand. The lords muddled through, and remember that they stood alone.",
        }),
      },
    ],
  }),
  // A good omen / boon
  () => ({
    id: "rich_vein",
    title: "A Rich Vein",
    body: "Miners in the hills have struck a seam of ore far richer than any before it. Word spreads quickly.",
    choices: [
      {
        label: "Tax the find for the crown",
        outcome: () => ({
          treasury: 160,
          unrest: 4,
          result:
            "The crown's share filled a strongroom. The miners muttered, but the gold is real.",
        }),
      },
      {
        label: "Let the miners keep their fortune",
        outcome: () => ({
          treasury: 40,
          unrest: -8,
          result: "Your restraint bought more than gold: the commons speak your name with warmth.",
        }),
      },
    ],
  }),
];

/** Choose an event for this season, weighted by the kingdom's condition. */
export function pickEvent(
  world: World,
  ledger: Ledger,
  kingdomId: string,
  r: Rng,
): RealmEvent | null {
  const food = foodBalance(world, kingdomId);
  const weights = EVENTS.map((make) => {
    const ev = make(world, ledger);
    if (ev.id === "harvest_failure") return food.net < 0 ? 4 : 1;
    if (ev.id === "bandit_uprising") return ledger.unrest > 30 ? 3 : 1.4;
    return 1;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = r() * total;
  for (let i = 0; i < EVENTS.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return EVENTS[i]!(world, ledger);
  }
  return null;
}
