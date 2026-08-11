import type { Mark, MarkKind } from "@/lib/game/engine";

const KIND: Record<MarkKind, { label: string; tone: string }> = {
  clutch: { label: "Clutch", tone: "border-gold/70 text-gold" },
  survivor: { label: "Grief", tone: "border-border/70 text-muted-foreground" },
  wounded: { label: "Scar", tone: "border-destructive/60 text-destructive" },
  valor: { label: "Valor", tone: "border-gold/70 text-gold" },
  slayer: { label: "Slayer", tone: "border-emerald-700/70 text-emerald-500" },
  ascend: { label: "Ascension", tone: "border-primary/60 text-primary" },
  triumph: { label: "Triumph", tone: "border-gold/70 text-gold" },
};

function clock(at: number) {
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The Scars & Deeds ledger — a champion's biography, newest first. */
export function MarkLedger({ marks, limit = 24 }: { marks?: Mark[] | undefined; limit?: number }) {
  const rows = (marks ?? []).slice(0, limit);
  if (!rows.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No marks yet — the field has not tested them. Send them out; it will.
      </p>
    );
  }
  return (
    <div className="grid gap-1.5">
      {rows.map((m) => {
        const k = KIND[m.kind];
        return (
          <div key={m.id} className={`rounded-sm border bg-background/40 p-2 ${k.tone}`}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[10px] uppercase tracking-widest">{k.label}</span>
              {m.bound ? (
                <span className="shrink-0 rounded-sm border border-border/60 px-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                  {m.bound}
                </span>
              ) : null}
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                {clock(m.at)}
              </span>
            </div>
            <p className="mt-1 text-[11px] italic text-foreground/85">{m.text}</p>
          </div>
        );
      })}
    </div>
  );
}
