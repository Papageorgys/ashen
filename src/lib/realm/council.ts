import { makeRng, rint, rpick } from "./rng";
import { generalName } from "./names";
import { threatLevel, type Ledger } from "./kingdom";
import { realmSummary, foodBalance } from "./economy";
import { troopCount, type Army } from "./army";
import type { World } from "./types";
import { portraitFromSeed, type Portrait } from "@/lib/game/identity";

/**
 * The AI Royal Council — persistent advisors, each with a face, a personality
 * and a bias, who read the SAME simulation state and counsel differently. Their
 * advice is generated from structured facts (a stand-in for the LLM narration
 * layer, honouring the same contract: read the numbers, don't invent them).
 */

export type AdvisorRole = "marshal" | "chancellor" | "treasurer" | "spymaster" | "steward";

export type Personality = "aggressive" | "cautious" | "greedy" | "pious" | "cunning";

export const ROLE_META: Record<AdvisorRole, { title: string; classId: string; concern: string }> = {
  marshal: { title: "Marshal", classId: "bulwark", concern: "the army and the borders" },
  chancellor: { title: "Chancellor", classId: "lightbearer", concern: "law and the nobles" },
  treasurer: { title: "Treasurer", classId: "windshot", concern: "the treasury" },
  spymaster: { title: "Spymaster", classId: "duelist", concern: "secrets and rivals" },
  steward: { title: "Steward", classId: "verdant", concern: "food and the people" },
};

export interface Advisor {
  id: string;
  role: AdvisorRole;
  name: string;
  portrait: Portrait;
  personality: Personality;
  loyalty: number; // 0..100
  ambition: number; // 0..100
  skill: number; // 0..100
}

const PERSONALITIES: Personality[] = ["aggressive", "cautious", "greedy", "pious", "cunning"];

export function makeCouncil(world: World): Advisor[] {
  const r = makeRng(world.seed ^ 0x0c0c17ee);
  const roles: AdvisorRole[] = ["marshal", "chancellor", "treasurer", "spymaster", "steward"];
  return roles.map((role, i) => {
    const name = generalName(r);
    return {
      id: `adv_${role}`,
      role,
      name,
      portrait: portraitFromSeed(`${world.seed}-${role}-${i}`),
      personality: PERSONALITIES[Math.floor(r() * PERSONALITIES.length)]!,
      loyalty: rint(r, 45, 95),
      ambition: rint(r, 20, 90),
      skill: rint(r, 40, 92),
    };
  });
}

export interface CouncilContext {
  world: World;
  kingdomId: string;
  ledger: Ledger;
  armies: Army[];
}

/** The advisor's counsel this turn — chosen by role, coloured by personality,
 *  grounded in the current state. */
export function advise(a: Advisor, ctx: CouncilContext): string {
  const { world, kingdomId, ledger, armies } = ctx;
  const sum = realmSummary(world, kingdomId);
  const food = foodBalance(world, kingdomId);
  const threat = threatLevel(world, kingdomId, armies);
  const rival = world.kingdoms.find((k) => k.id !== kingdomId && !k.isPlayer);
  const mood = (bad: string, ok: string) => (a.personality === "aggressive" ? bad : ok);

  switch (a.role) {
    case "marshal":
      if (threat > 1.4)
        return mood(
          `${rival?.name ?? "A rival"} fields far more men than we do. Give me leave to raise levies before they march.`,
          `We are outnumbered. Prudence says we fortify the passes and wait.`,
        );
      return `Our banners hold ${sum.provinceCount} provinces. Give the word and I will take the fight to them.`;
    case "treasurer":
      if (ledger.treasury < 200)
        return `The treasury holds but ${ledger.treasury} gold. Another campaign would ruin us — mend the roads and let trade fill the coffers.`;
      return a.personality === "greedy"
        ? `${ledger.treasury} gold sits idle. Raise the tax a fraction and none will notice.`
        : `The coffers are sound at ${ledger.treasury} gold. We can afford one bold stroke.`;
    case "steward":
      if (food.net < 0)
        return `The granaries are emptying — we lose ${-food.net} grain each season. Buy grain now or the people will starve by winter.`;
      return `The harvest is good; ${sum.population.toLocaleString()} souls are fed and content.`;
    case "spymaster":
      return rival
        ? `My agents whisper that ${rival.name} gathers strength in the marches. Say the word and I will learn their true numbers.`
        : `The realm is quiet — too quiet. Let me place eyes in every court that matters.`;
    case "chancellor":
      if (ledger.unrest > 40)
        return `Unrest festers at ${ledger.unrest}. The nobles grumble; ease their burden or a lord will make himself a rebel.`;
      return `The lords are loyal enough. Hold a feast and their goodwill will carry us a year.`;
  }
}
