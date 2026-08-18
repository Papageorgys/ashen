import { battleProse } from "@/lib/realm/battle";
import type { BattleEvent } from "@/lib/realm/sim";
import { GameIcon } from "@/components/game/GameIcon";

/**
 * A chronicle card for a battle — the AI-narration surface. It reads the
 * structured result the simulation produced (troops, losses, the notable
 * event) and renders the story as a small moment of drama; it never invents
 * an outcome.
 */
export function BattleReport({ event, onClose }: { event: BattleEvent; onClose: () => void }) {
  const won = event.victor === "attacker";
  const prose = battleProse(event);
  const tone = won ? "#9cc487" : "#e0895f";
  const edge = won ? "#7ea86a" : "#d1603a";

  return (
    <div className="panel-ornate pointer-events-auto relative w-80 overflow-hidden rounded-sm p-4 backdrop-blur-sm">
      {/* outcome wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${edge}22, transparent 62%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-2">
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
          className="grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-white/15 text-muted-foreground transition hover:border-gold/50 hover:text-gold"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* the seal — a struck emblem that blooms in */}
      <div className="relative mt-3 grid place-items-center">
        <span
          className="flourish-ring absolute h-16 w-16 rounded-full border"
          style={{ borderColor: `${edge}88` }}
          aria-hidden
        />
        <span
          className="flourish-bloom grid h-14 w-14 place-items-center rounded-full border-2"
          style={{ borderColor: edge, background: `${edge}1c`, color: tone }}
        >
          <GameIcon name={won ? "crown" : "skull"} size={26} />
        </span>
      </div>
      <div
        className="relative mt-2 text-center font-display text-lg uppercase tracking-[0.22em]"
        style={{ color: tone }}
      >
        {won ? "Victory" : "Defeat"}
      </div>
      <div className="relative mt-0.5 text-center text-[11px] text-muted-foreground">
        {event.attackerName} {won ? "carries the day" : "is thrown back"}
      </div>

      {/* the clash — who brought the greater host */}
      <ClashBar atk={event.attackerTroops} def={event.defenderTroops} won={won} />

      <div className="relative mt-3 grid grid-cols-2 gap-2 text-xs">
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
        <p className="relative mt-3 border-l-2 border-gold/40 pl-2.5 text-[12px] italic leading-snug text-[#e7d7ac]">
          {prose}
        </p>
      )}
    </div>
  );
}

/** A two-sided bar showing the balance of hosts that met on the field. */
function ClashBar({ atk, def, won }: { atk: number; def: number; won: boolean }) {
  const total = Math.max(1, atk + def);
  const atkPct = (atk / total) * 100;
  return (
    <div className="relative mt-3">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Attacker</span>
        <span>Defender</span>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full border border-black/40">
        <div
          style={{ width: `${atkPct}%`, background: won ? "#c9b06a" : "#9a8d6e" }}
          className="h-full"
        />
        <div
          style={{ width: `${100 - atkPct}%`, background: won ? "#8a6b5a" : "#c06a4a" }}
          className="h-full"
        />
      </div>
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
  const survivors = Math.max(0, troops - losses);
  const survPct = troops > 0 ? (survivors / troops) * 100 : 0;
  const tone = win ? "#9cc487" : "#e0895f";
  return (
    <div className="rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
      <div className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {name}
      </div>
      <div className="mt-0.5 font-display text-sm tabular-nums text-foreground">
        {troops.toLocaleString()}
      </div>
      {/* survivors vs fallen */}
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#d1603a55]">
        <div className="h-full rounded-full" style={{ width: `${survPct}%`, background: tone }} />
      </div>
      <div className="mt-1 text-[11px] tabular-nums" style={{ color: tone }}>
        −{losses.toLocaleString()} fallen
      </div>
    </div>
  );
}
