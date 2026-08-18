import type { BattleEvent } from "@/lib/realm/sim";
import { GameIcon } from "@/components/game/GameIcon";

/**
 * The Chronicle — a running feed of what the world does on its own: rival
 * crowns seizing holdings, sieges won and repelled. It's how the player feels
 * the realm evolving around them, and the seed of a persistent history.
 */
export function Chronicle({ events, playerId }: { events: BattleEvent[]; playerId: string }) {
  if (events.length === 0) return null;
  return (
    <div className="pointer-events-auto w-72 rounded-sm border border-white/10 bg-black/70 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <GameIcon name="scroll" size={12} />
        Chronicle
      </div>
      <ul className="max-h-40 space-y-0.5 overflow-y-auto p-1.5">
        {events.map((e, i) => {
          const involvesPlayer =
            e.attackerKingdomId === playerId || e.defenderKingdomId === playerId;
          const line = e.captured
            ? `${e.attackerName} seized ${e.provinceName}`
            : e.victor === "attacker"
              ? `${e.attackerName} won at ${e.provinceName}`
              : `${e.defenderName} held ${e.provinceName}`;
          return (
            <li
              key={`${e.day}-${e.provinceId}-${i}`}
              className="flex items-start gap-1.5 rounded-sm px-1.5 py-1 text-[11px] leading-snug"
              style={involvesPlayer ? { background: "rgba(209,96,58,0.12)" } : undefined}
            >
              <span className="mt-[3px] shrink-0 text-muted-foreground" style={{ opacity: 0.7 }}>
                <GameIcon name={e.siege ? "tower" : "swords"} size={11} />
              </span>
              <span className={involvesPlayer ? "text-[#e7d7ac]" : "text-muted-foreground"}>
                <span className="tabular-nums text-muted-foreground">Day {e.day}. </span>
                {line}.
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
