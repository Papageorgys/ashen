import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CLASS_BY_ID } from "@/lib/game/data";
import {
  canAcceptCompany,
  clanCapacity,
  companyPower,
  hasClan,
  keepLevel,
  bannerCap,
  memberPower,
  prospectCost,
  type FreeCompany,
  type GameState,
  type Member,
} from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import { ClassPicto } from "./Picto";
import { Portrait } from "./Portrait";

function BladeRow({ m }: { m: Member }) {
  const cls = CLASS_BY_ID[m.classId]!;
  return (
    <div className="flex items-center gap-2 rounded-sm border border-border/50 px-2 py-1">
      {m.portrait && (
        <Portrait data={m.portrait} classId={m.classId} className="h-6 w-6 shrink-0" />
      )}
      <ClassPicto classId={cls.id} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs">{m.name}</span>
        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
          {cls.name} · {cls.role}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
          lv {m.level}
        </span>
        <span className="block font-display text-xs text-gold">{memberPower(m)}</span>
      </span>
    </div>
  );
}

function CompanyCard({
  state,
  api,
  c,
  keepTogether,
}: {
  state: GameState;
  api: ClanApi;
  c: FreeCompany;
  keepTogether: boolean;
}) {
  const check = canAcceptCompany(state, c);
  const power = companyPower(c);
  const mins = Math.max(0, Math.round((c.expiresAt - Date.now()) / 60000));
  const roles = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of c.members) {
      const r = CLASS_BY_ID[m.classId]!.role;
      map[r] = (map[r] ?? 0) + 1;
    }
    return map;
  }, [c.members]);

  return (
    <div className="panel space-y-2 rounded-sm p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-sm text-gold">{c.name}</h4>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              {c.kind === "petition" ? "Petition" : "Scouted"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Led by {c.leaderName} · {c.members.length} blade(s) · leaves in {mins}m
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Power</div>
          <div className="font-display text-lg text-gold">{power}</div>
        </div>
      </div>

      <p className="text-xs italic text-muted-foreground">“{c.pitch}”</p>

      <div className="flex flex-wrap gap-1">
        {Object.entries(roles).map(([r, n]) => (
          <span
            key={r}
            className="rounded-sm border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {r} ×{n}
          </span>
        ))}
      </div>

      <div className="grid gap-1 sm:grid-cols-2">
        {c.members.map((m) => (
          <BladeRow key={m.id} m={m} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
        <div className="text-[11px] text-muted-foreground">
          Signing purse <span className="text-gold">{c.ask.toLocaleString()}g</span>
          {c.repAsk > 0 ? ` · expects ${c.repAsk} reputation` : ""}
          {check.ok ? "" : ` · ${check.why}`}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => api.declineCompany(c.id)}>
            {c.kind === "petition" ? "Turn away" : "Dismiss"}
          </Button>
          <Button
            size="sm"
            disabled={!check.ok}
            onClick={() => api.acceptCompany(c.id, keepTogether)}
          >
            {c.kind === "petition" ? "Accept oath" : "Send invitation"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MusterPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const [keepTogether, setKeepTogether] = useState(true);
  const companies = state.companies ?? [];
  const petitions = companies.filter((c) => c.kind === "petition");
  const prospects = companies.filter((c) => c.kind === "prospect");
  const cap = clanCapacity(state.clanLevel, keepLevel(state, "barracks"), !!state.allegiance);
  const room = cap - state.members.length;
  const bannerRoom = bannerCap(state) - state.parties.length;
  const open = hasClan(state) || !!state.allegiance;

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-gold">Muster Hall</h2>
          <p className="text-xs text-muted-foreground">
            Party leaders without a crest of their own. Read their petitions, or send heralds to
            court a company — you see every blade's class, level and power before you decide.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={keepTogether} onCheckedChange={setKeepTogether} />
            Keep them together as a banner
          </label>
          <Button size="sm" variant="outline" onClick={() => api.scoutCompanies()}>
            Send heralds · {prospectCost(state.clanLevel).toLocaleString()}g
          </Button>
        </div>
      </header>

      <div className="panel flex flex-wrap gap-x-6 gap-y-1 rounded-sm p-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>
          Roster{" "}
          <span className="text-gold">
            {state.members.length}/{cap}
          </span>
        </span>
        <span>
          Free places <span className="text-gold">{Math.max(0, room)}</span>
        </span>
        <span>
          Spare banners <span className="text-gold">{Math.max(0, bannerRoom)}</span>
        </span>
        <span>
          Reputation <span className="text-gold">{state.reputation}</span>
        </span>
      </div>

      {!open ? (
        <p className="panel rounded-sm p-3 text-xs text-muted-foreground">
          Nobody petitions a company without a name. Found your clan — or swear your company to an
          established one — and the hall starts filling.
        </p>
      ) : null}

      <div className="space-y-2">
        <h3 className="font-display text-sm text-gold">Petitions ({petitions.length})</h3>
        {petitions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No one is at the gate. Petitions arrive on their own as your reputation grows.
          </p>
        ) : (
          <div className="grid gap-2 xl:grid-cols-2">
            {petitions.map((c) => (
              <CompanyCard key={c.id} state={state} api={api} c={c} keepTogether={keepTogether} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-sm text-gold">Scouted companies ({prospects.length})</h3>
        {prospects.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Send heralds out to find companies willing to be courted.
          </p>
        ) : (
          <div className="grid gap-2 xl:grid-cols-2">
            {prospects.map((c) => (
              <CompanyCard key={c.id} state={state} api={api} c={c} keepTogether={keepTogether} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
