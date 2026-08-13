import { useState } from "react";
import { CLASS_BY_ID } from "@/lib/game/data";
import type { GameState } from "@/lib/game/engine";
import { ClanCrest } from "@/components/game/ClanCrest";
import { CrestEditor } from "@/components/game/CrestEditor";
import { Button } from "@/components/ui/button";
import { DEFAULT_CREST, type Crest } from "@/lib/game/identity";

const KIND_LABEL: Record<string, string> = {
  founding: "Founding",
  triumph: "Triumph",
  loss: "Loss",
  forge: "Forge",
  war: "War",
  rise: "Ascent",
};

const KIND_TONE: Record<string, string> = {
  founding: "text-gold",
  triumph: "text-emerald-400",
  loss: "text-destructive",
  forge: "text-amber-300",
  war: "text-orange-300",
  rise: "text-sky-300",
};

function when(at: number) {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChroniclePanel({
  state,
  api,
}: {
  state: GameState;
  api: { setCrest: (crest: Crest, motto?: string) => void };
}) {
  const [editing, setEditing] = useState(false);
  const [crest, setCrest] = useState<Crest>(state.crest ?? DEFAULT_CREST);
  const [motto, setMotto] = useState(state.motto ?? "");

  const entries = state.chronicle ?? [];
  const memorial = state.memorial ?? [];

  return (
    <div className="space-y-4">
      {/* --------------------------------- arms -------------------------------- */}
      <section className="panel rounded-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <ClanCrest crest={state.crest ?? DEFAULT_CREST} className="h-20 w-20 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl text-gold">{state.clanName}</h2>
            <p className="text-sm italic text-muted-foreground">“{state.motto}”</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Founded {when(state.createdAt)} · {state.members.length} sworn ·{" "}
              {memorial.length} remembered
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCrest(state.crest ?? DEFAULT_CREST);
              setMotto(state.motto ?? "");
              setEditing((v) => !v);
            }}
          >
            {editing ? "Close" : "Redraw arms"}
          </Button>
        </div>

        {editing && (
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            <CrestEditor crest={crest} motto={motto} onChange={setCrest} onMotto={setMotto} />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  api.setCrest(crest, motto);
                  setEditing(false);
                }}
              >
                Take up these arms
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------ the chronicle -------------------------- */}
      <section className="space-y-2">
        <h3 className="font-display text-lg text-gold">The Chronicle</h3>
        {entries.length === 0 ? (
          <p className="panel rounded-sm p-3 text-xs text-muted-foreground">
            Nothing worth writing down yet.
          </p>
        ) : (
          <ol className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="panel relative rounded-sm p-3 pl-4">
                <span
                  className="absolute left-0 top-0 h-full w-0.5 bg-gold/40"
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`font-display text-sm ${KIND_TONE[e.kind] ?? "text-foreground"}`}>
                    {e.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {KIND_LABEL[e.kind] ?? e.kind} · {when(e.at)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{e.text}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* -------------------------------- memorial ----------------------------- */}
      <section className="space-y-2">
        <h3 className="font-display text-lg text-gold">Shrine of Names</h3>
        {memorial.length === 0 ? (
          <p className="panel rounded-sm p-3 text-xs text-muted-foreground">
            No one has died under your banner. Keep it that way.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {memorial.map((f) => (
              <li key={f.id} className="panel rounded-sm p-3">
                <div className="font-display text-sm text-foreground">{f.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Level {f.level} {CLASS_BY_ID[f.classId]?.name ?? "champion"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fell at {f.where}, {when(f.at)}. {f.mobKills.toLocaleString()} kills to their name.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
