import { useState } from "react";
import type { Choice, Outcome, RealmEvent } from "@/lib/realm/events";
import { GameIcon } from "@/components/game/GameIcon";

/**
 * A kingdom event — a crisis or a boon the simulation raised, presented as a
 * decision. Each choice carries a real consequence; once made, the outcome is
 * narrated and the card can be dismissed.
 */
export function EventCard({
  event,
  onChoose,
  onDismiss,
}: {
  event: RealmEvent;
  onChoose: (choice: Choice) => Outcome;
  onDismiss: () => void;
}) {
  const [result, setResult] = useState<Outcome | null>(null);

  return (
    <div className="panel-ornate pointer-events-auto w-96 rounded-sm p-4 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[#d8a24a]">
        <GameIcon name="scroll" size={13} />A matter for the crown
      </div>
      <h3 className="gilded mt-0.5 font-display text-2xl leading-tight">{event.title}</h3>
      <p className="mt-2 text-sm leading-snug text-muted-foreground">{event.body}</p>

      {!result ? (
        <div className="mt-3 space-y-1.5">
          {event.choices.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setResult(onChoose(c))}
              className="w-full rounded-sm border border-white/12 bg-black/25 px-3 py-2 text-left text-[13px] text-foreground transition hover:border-gold/60 hover:bg-gold/[0.05]"
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <p className="border-l-2 border-gold/50 pl-3 text-[13px] italic leading-snug text-[#e7d7ac]">
            {result.result}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] tabular-nums">
            {result.treasury ? <Delta label="Treasury" v={result.treasury} /> : null}
            {result.food ? <Delta label="Food" v={result.food} /> : null}
            {result.unrest ? <Delta label="Unrest" v={result.unrest} invert /> : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 w-full rounded-sm border border-gold/30 bg-gold/[0.06] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-gold transition hover:border-gold/60"
          >
            So it is done
          </button>
        </div>
      )}
    </div>
  );
}

function Delta({ label, v, invert }: { label: string; v: number; invert?: boolean }) {
  const good = invert ? v < 0 : v > 0;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5"
      style={{
        borderColor: good ? "#7ea86a55" : "#d1603a55",
        color: good ? "#9cc487" : "#e0895f",
      }}
    >
      {label} {v > 0 ? `+${v}` : v}
    </span>
  );
}
