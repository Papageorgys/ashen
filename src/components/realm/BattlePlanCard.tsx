import { troopCount, type Army } from "@/lib/realm/army";
import type { Tactic } from "@/lib/realm/battle";
import type { PendingBattle } from "@/lib/realm/sim";
import type { World } from "@/lib/realm/types";
import { GameIcon, type IconName } from "@/components/game/GameIcon";

type Choice = Tactic | "withdraw";

const TACTICS: { key: Choice; label: string; icon: IconName; blurb: string }[] = [
  { key: "balanced", label: "Measured attack", icon: "swords", blurb: "A steady, even assault." },
  {
    key: "aggressive",
    label: "Press the attack",
    icon: "flame",
    blurb: "Win faster — but bleed harder.",
  },
  {
    key: "defensive",
    label: "Hold and grind",
    icon: "shield",
    blurb: "Fewer losses; harder to win outright.",
  },
  {
    key: "flank",
    label: "Flanking manoeuvre",
    icon: "banner",
    blurb: "A gamble — decisive if it lands.",
  },
  {
    key: "cavalry",
    label: "Cavalry charge",
    icon: "crown",
    blurb: "Lead with the horse; great with many riders.",
  },
  { key: "withdraw", label: "Withdraw", icon: "moon", blurb: "Pull back and refuse the fight." },
];

/**
 * The council of war — before a battle the player leads, choose how to fight.
 * The choice feeds the simulation's resolution; it does not decide it.
 */
export function BattlePlanCard({
  world,
  army,
  pending,
  onChoose,
}: {
  world: World;
  army: Army;
  pending: PendingBattle;
  onChoose: (choice: Choice) => void;
}) {
  const prov = world.provinces.find((p) => p.id === pending.provinceId);

  return (
    <div className="panel-ornate pointer-events-auto w-[26rem] rounded-sm p-4 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[#d8a24a]">
        <GameIcon name={pending.siege ? "tower" : "swords"} size={13} />
        {pending.siege ? "A siege begins" : "Battle is joined"}
      </div>
      <h3 className="gilded mt-0.5 font-display text-2xl leading-tight">
        {pending.siege ? "The Walls of" : "The Field of"} {prov?.name ?? "the march"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Your host of {troopCount(army).toLocaleString()} stands before{" "}
        {pending.siege ? "the walls" : "the enemy"}. How will you fight?
      </p>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {TACTICS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChoose(t.key)}
            className={`rounded-sm border px-2.5 py-2 text-left transition ${
              t.key === "withdraw"
                ? "border-white/12 hover:border-muted-foreground/60"
                : "border-white/12 hover:border-gold/60 hover:bg-gold/[0.05]"
            }`}
          >
            <span className="flex items-center gap-1.5 text-[13px] text-foreground">
              <GameIcon
                name={t.icon}
                size={13}
                className={t.key === "withdraw" ? "text-muted-foreground" : "text-gold"}
              />
              {t.label}
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
              {t.blurb}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
