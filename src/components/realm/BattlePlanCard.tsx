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
    <div className="panel-ornate pointer-events-auto relative w-[26rem] overflow-hidden rounded-sm p-4 backdrop-blur-sm">
      {/* war-glow behind the summons */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 70% at 50% 0%, #d8a24a1f, transparent 60%)" }}
      />

      <div className="relative flex items-center gap-3">
        <span className="relative grid place-items-center">
          <span
            className="flourish-ring absolute h-12 w-12 rounded-full border border-[#d8a24a99]"
            aria-hidden
          />
          <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[#d8a24a] bg-[#d8a24a1c] text-[#e9c07a]">
            <GameIcon name={pending.siege ? "tower" : "swords"} size={22} />
          </span>
        </span>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#d8a24a]">
            {pending.siege ? "A siege begins" : "Battle is joined"}
          </div>
          <h3 className="gilded font-display text-2xl leading-tight">
            {pending.siege ? "The Walls of" : "The Field of"} {prov?.name ?? "the march"}
          </h3>
        </div>
      </div>
      <p className="relative mt-2 text-sm text-muted-foreground">
        Your host of{" "}
        <span className="font-display tabular-nums text-foreground">
          {troopCount(army).toLocaleString()}
        </span>{" "}
        stands before {pending.siege ? "the walls" : "the enemy"}. How will you fight?
      </p>

      <div className="relative mt-3 grid grid-cols-2 gap-1.5">
        {TACTICS.map((t) => {
          const flee = t.key === "withdraw";
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChoose(t.key)}
              className={`btn-rune hover:btn-rune-hover group flex items-start gap-2 rounded-sm border px-2.5 py-2 text-left ${
                flee
                  ? "border-white/12 hover:border-muted-foreground/60"
                  : "border-white/12 hover:border-gold/60 hover:bg-gold/[0.05]"
              }`}
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[3px] border ${
                  flee
                    ? "border-white/15 bg-white/[0.04] text-muted-foreground"
                    : "border-gold/30 bg-gold/[0.06] text-gold"
                }`}
              >
                <GameIcon name={t.icon} size={13} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] text-foreground">{t.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                  {t.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
