import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { fetchLadder, type LadderRow } from "@/lib/cloud/sync";
import { ClanCrest } from "@/components/game/ClanCrest";
import { DEFAULT_CREST, type Crest } from "@/lib/game/identity";
import { Button } from "@/components/ui/button";

export function WorldPanel({ signedIn, myId }: { signedIn: boolean; myId?: string | null }) {
  const [rows, setRows] = useState<LadderRow[] | null>(null);

  useEffect(() => {
    let live = true;
    fetchLadder().then((r) => live && setRows(r));
    const t = setInterval(() => fetchLadder().then((r) => live && setRows(r)), 30_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-gold">The Realm Ladder</h2>
          <p className="text-xs text-muted-foreground">
            Every clan in the Ashen Realm, ranked by full banners then reputation. Refreshes every
            half minute.
          </p>
        </div>
        {!signedIn && (
          <Button asChild size="sm">
            <Link to="/auth">Sign in to be counted</Link>
          </Button>
        )}
      </header>

      {rows === null ? (
        <p className="text-xs text-muted-foreground">Reading the heralds' rolls…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No clan has been recorded yet. Be the first.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <article
              key={r.user_id}
              className={`panel flex items-center gap-3 rounded-sm px-3 py-2 ${
                r.user_id === myId ? "border-gold/60" : ""
              }`}
            >
              <span className="w-6 text-right font-display text-sm text-muted-foreground">
                {i + 1}
              </span>
              <ClanCrest crest={(r.crest as Crest) ?? DEFAULT_CREST} className="h-9 w-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm text-foreground">
                  {r.clan_name || "Unnamed company"}
                  {r.holds_castle && <span className="ml-2 text-xs text-gold">holds Vareth</span>}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  Led by {r.leader_name || "an unknown lord"}
                  {r.motto ? ` · “${r.motto}”` : ""}
                </div>
              </div>
              <div className="flex gap-4 text-right text-xs">
                <Cell label="Lvl" value={r.clan_level} />
                <Cell label="Banners" value={r.full_banners} />
                <Cell label="Sworn" value={r.members} />
                <Cell label="Rep" value={r.reputation.toLocaleString()} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-sm text-gold">{value}</div>
    </div>
  );
}
