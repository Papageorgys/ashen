import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ITEM_BY_ID,
  SCROLLS,
  type ScrollDef,
  type ScrollKind,
} from "@/lib/game/data";
import { canImprint, memberStats, scribeOdds, scribes, type GameState } from "@/lib/game/engine";
import { pct } from "@/lib/game/scrolls";
import type { ClanApi } from "@/hooks/useClanGame";
import { ItemIcon } from "./ItemIcon";
import { ItemTooltip } from "./ItemTooltip";
import { Portrait } from "./Portrait";
import { ScrollLedger } from "./ScrollLedger";

const KIND_LABEL: Record<ScrollKind, string> = {
  attack: "Attack scrolls",
  buff: "Blessing scrolls",
};

function OddsBar({
  odds,
  wit,
  men,
}: {
  odds: ReturnType<typeof scribeOdds>;
  wit?: number | undefined;
  men?: number | undefined;
}) {
  const rows: { key: string; label: string; value: number; cls: string; hint: string }[] = [
    {
      key: "improved",
      label: "Improved",
      value: odds.improved,
      cls: "bg-gold",
      hint: `WIT check — WIT ${wit ?? "?"} against the pivot of 24. Every point above widens this band and yields two scrolls.`,
    },
    {
      key: "success",
      label: "Bound",
      value: odds.success,
      cls: "bg-emerald-600",
      hint: `WIT check — WIT ${wit ?? "?"} decides whether the weave holds at all.`,
    },
    {
      key: "fizzle",
      label: "Ruined",
      value: odds.fizzle,
      cls: "bg-muted-foreground/50",
      hint: `MEN check on a failed weave — MEN ${men ?? "?"} keeps the break outward: vellum and ink lost, the scribe unharmed.`,
    },
    {
      key: "backfire",
      label: "Backfire",
      value: odds.backfire,
      cls: "bg-destructive",
      hint: `MEN check on a failed weave — MEN ${men ?? "?"} below 24 lets the break turn inward, tearing out HP and MP.`,
    },
  ];
  return (
    <div className="space-y-1">
      <div className="flex h-1.5 overflow-hidden rounded-sm border border-border/60">
        {rows.map((r) => (
          <span
            key={r.key}
            title={r.hint}
            className={r.cls}
            style={{ width: `${r.value * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {rows.map((r) => (
          <span key={r.key} title={r.hint} className="cursor-help">
            {r.label} {pct(r.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScrollRow({
  state,
  api,
  def,
  scribeId,
}: {
  state: GameState;
  api: ClanApi;
  def: ScrollDef;
  scribeId: string | null;
}) {
  const m = state.members.find((x) => x.id === scribeId);
  const odds = m ? scribeOdds(m, def) : null;
  const check = scribeId
    ? canImprint(state, scribeId, def.id)
    : { ok: false, why: "Choose a scribe" };
  const stock = state.inventory[def.id] ?? 0;

  return (
    <div className="panel space-y-2 rounded-sm p-3">
      <div className="flex items-start gap-3">
        <ItemIcon item={def.id} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <ItemTooltip item={def.id}>
              <span className="font-display text-sm text-gold">{def.name}</span>
            </ItemTooltip>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {def.grade} · lv {def.reqLevel}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">×{stock}</span>
          </div>
          <p className="text-xs text-muted-foreground">{def.desc}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {def.inputs.map((i) => {
          const have = state.inventory[i.item] ?? 0;
          return (
            <span
              key={i.item}
              className={`rounded-sm border px-1.5 py-0.5 ${
                have >= i.qty ? "border-border/60 text-muted-foreground" : "border-destructive/60 text-destructive"
              }`}
            >
              {ITEM_BY_ID[i.item]?.name} {have}/{i.qty}
            </span>
          );
        })}
        <span className="rounded-sm border border-border/60 px-1.5 py-0.5 text-muted-foreground">
          {def.gold}g
        </span>
        <span className="rounded-sm border border-border/60 px-1.5 py-0.5 text-muted-foreground">
          {def.mp} MP
        </span>
      </div>

      {odds ? <OddsBar odds={odds} wit={m ? memberStats(m).wit : undefined} men={m ? memberStats(m).men : undefined} /> : null}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{check.ok ? "" : check.why}</span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={!check.ok}
            onClick={() => scribeId && api.imprintScroll(scribeId, def.id, 1)}
          >
            Imprint
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!check.ok}
            onClick={() => scribeId && api.imprintScroll(scribeId, def.id, 5)}
          >
            ×5
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ScriptoriumPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const desk = useMemo(() => scribes(state), [state]);
  const [scribeId, setScribeId] = useState<string | null>(desk[0]?.id ?? null);
  const active = desk.find((m) => m.id === scribeId) ?? desk[0] ?? null;
  const st = active ? memberStats(active) : null;

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-gold">Scriptorium</h2>
          <p className="text-xs text-muted-foreground">
            Imprint a spell into vellum and any sworn blade can read it in the field, whatever their
            class. WIT decides whether the weave holds; MEN decides how hard it bites when it
            doesn't.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={state.scrollsEnabled !== false} onCheckedChange={() => api.toggleScrolls()} />
          Read scrolls in the field
        </label>
      </header>

      <div className="panel space-y-2 rounded-sm p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          The writing desk — champions resting between marches
        </div>
        {desk.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Everyone is in the field. Recall a banner to sit someone at the desk.
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {desk.map((m) => {
              const s = memberStats(m);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setScribeId(m.id)}
                  className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 text-left transition ${
                    active?.id === m.id
                      ? "border-gold/70 bg-gold/10"
                      : "border-border/60 hover:border-gold/40"
                  }`}
                >
                  {m.portrait && <Portrait data={m.portrait} classId={m.classId} className="h-7 w-7 shrink-0" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{m.name}</span>
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                      lv {m.level} · WIT {s.wit} · MEN {s.men} · {Math.round(m.mp)} MP
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {st ? (
          <p className="text-[11px] text-muted-foreground">
            {active!.name} writes with WIT {st.wit} and MEN {st.men} — higher WIT binds cleaner and
            sometimes yields a second copy, higher MEN keeps a ruined weave from turning inward.
          </p>
        ) : null}
      </div>

      <div className="panel space-y-2 rounded-sm p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Ledger — every attempt, the check that decided it and what it left behind
        </div>
        <ScrollLedger state={state} />
      </div>

      {(["attack", "buff"] as ScrollKind[]).map((kind) => (
        <div key={kind} className="space-y-2">
          <h3 className="font-display text-sm text-gold">{KIND_LABEL[kind]}</h3>
          <div className="grid gap-2 lg:grid-cols-2">
            {SCROLLS.filter((s) => s.kind === kind).map((def) => (
              <ScrollRow key={def.id} state={state} api={api} def={def} scribeId={active?.id ?? null} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
