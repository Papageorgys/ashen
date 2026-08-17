import { battleProse } from "@/lib/realm/battle";
import type { BattleEvent } from "@/lib/realm/sim";
import { GameIcon } from "@/components/game/GameIcon";

/**
 * A chronicle card for a battle — the AI-narration surface. It reads the
 * structured result the simulation produced (troops, losses, the notable
 * event) and renders the story; it never invents an outcome.
 */
export function BattleReport({ event, onClose }: { event: BattleEvent; onClose: () => void }) {
  const won = event.victor === "attacker";
  const prose = battleProse(event);
  return (
    <div className="panel-ornate pointer-events-auto w-80 rounded-sm p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <GameIcon name={event.siege ? "tower" : "swords"} size={13} />
            {event.siege ? "Siege" : "Battle"} · Day {event.day}
          </div>
          <h3 className="gilded font-display text-xl leading-tight">
            {event.siege ? "The Storming of" : "The Battle of"} {event.provinceName}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-6 w-6 place-items-center rounded-sm border border-white/15 text-muted-foreground transition hover:border-gold/50 hover:text-gold"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div
        className="mt-2 rounded-sm border px-2.5 py-1.5 text-sm font-display uppercase tracking-[0.14em]"
        style={{
          borderColor: won ? "#7ea86a66" : "#d1603a66",
          background: won ? "#7ea86a14" : "#d1603a14",
          color: won ? "#9cc487" : "#e0895f",
        }}
      >
        {won ? `${event.attackerName} — Victory` : `${event.attackerName} — Defeat`}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Side
          name={event.attackerName}
          troops={event.attackerTroops}
          losses={event.attackerLosses}
          win={won}
        />
        <Side
          name={event.defenderName}
          troops={event.defenderTroops}
          losses={event.defenderLosses}
          win={!won}
        />
      </div>

      {prose && (
        <p className="mt-3 border-l-2 border-gold/40 pl-2.5 text-[12px] italic leading-snug text-[#e7d7ac]">
          {prose}
        </p>
      )}
    </div>
  );
}

function Side({
  name,
  troops,
  losses,
  win,
}: {
  name: string;
  troops: number;
  losses: number;
  win: boolean;
}) {
  return (
    <div className="rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
      <div className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {name}
      </div>
      <div className="mt-0.5 font-display text-sm tabular-nums text-foreground">
        {troops.toLocaleString()}
      </div>
      <div className="text-[11px] tabular-nums" style={{ color: win ? "#9cc487" : "#e0895f" }}>
        −{losses.toLocaleString()} fallen
      </div>
    </div>
  );
}
