import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import { supplyCap } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import {
  NODE_DEF,
  NODE_TYPES,
  WORKSHOP_DEF,
  WORKSHOP_TYPES,
  RAW_LABEL,
  RAW_GLYPH,
  GOOD_LABEL,
  GOOD_GLYPH,
  SUPPLY_VALUE,
  WORKER_CAP_PER_NODE,
  NODE_UPGRADE_MAX,
  HIRE_COST,
  CARAVAN_MS,
  freeWorkers,
  assignedWorkers,
  nodeOutputPerHour,
  rationNeedPerHour,
  shipmentValue,
  moraleTrend,
  type Raw,
  type Good,
} from "@/lib/game/logistics";

/**
 * The Domain — the war-logistics chain, end to end: resource nodes worked by
 * laborers, caravans hauling raw to the city, workshops crafting it into food,
 * arms and mounts, and the supply train that carries it all to the front.
 */
export function LogisticsPanel({
  state,
  api,
  now,
}: {
  state: GameState;
  api: ClanApi;
  now: number;
}) {
  const d = state.domain;
  if (!d) return <p className="text-sm text-muted-foreground">The domain has not been drawn.</p>;

  const idle = freeWorkers(d);
  const manned = assignedWorkers(d);
  const trend = moraleTrend(d);
  const shipVal = shipmentValue(d);
  const supply = Math.floor(state.supply ?? 0);
  const cap = supplyCap(state);

  const trendTone =
    trend === "well-fed"
      ? "#7ea86a"
      : trend === "fed"
        ? "#c9b06a"
        : trend === "hungry"
          ? "#d8a24a"
          : "#d1603a";

  return (
    <div className="space-y-4">
      {/* the workforce and its morale — the engine of the whole chain */}
      <section className="panel-ornate rounded-sm p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg text-gold">The Domain</h2>
          <span className="text-[11px] text-muted-foreground">
            {manned}/{d.workers} at work · {idle} idle
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-sm border border-white/10 bg-black/30 px-2.5 py-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Morale
              </span>
              <span className="text-xs" style={{ color: trendTone }}>
                {Math.round(d.morale)} · {trend}
              </span>
            </div>
            <div className="mt-1 h-[4px] w-full overflow-hidden rounded-full bg-black/40">
              <span
                className="block h-full"
                style={{ width: `${Math.round(d.morale)}%`, background: trendTone }}
              />
            </div>
            <p className="mt-1 text-[9px] leading-snug text-muted-foreground">
              Fed workers work hard; the hungry do not. The domain eats{" "}
              {rationNeedPerHour(d).toFixed(1)} rations/hr.
            </p>
          </div>
          <div className="rounded-sm border border-white/10 bg-black/30 px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Hire laborers
            </div>
            <div className="mt-1 flex gap-1">
              {[1, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => api.hireWorkers(n)}
                  className="flex-1 rounded-sm border border-white/10 bg-black/40 py-1 text-[10px] text-gold transition hover:border-gold"
                >
                  +{n} · {n * HIRE_COST}g
                </button>
              ))}
            </div>
            <p className="mt-1 text-[9px] leading-snug text-muted-foreground">
              Assign idle hands to nodes below to raise their output.
            </p>
          </div>
        </div>
      </section>

      {/* resource nodes — worked for raw, hauled by caravan */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
          Resource Nodes
        </h3>
        <div className="mt-3 space-y-2">
          {d.nodes.map((node) => {
            const def = NODE_DEF[node.type];
            const out = nodeOutputPerHour(node, d.morale);
            return (
              <div key={node.id} className="rounded-sm border border-border/60 bg-black/20 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm text-gold">
                    <span aria-hidden="true">{def.glyph}</span>
                    {def.label}
                    <span className="text-[10px] text-muted-foreground">Lv {node.level}</span>
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {out.toFixed(1)} {node.type === "farmland" ? "grain" : def.raw}/hr
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Workers</span>
                  <button
                    type="button"
                    onClick={() => api.assignWorker(node.id, -1)}
                    className="grid h-5 w-5 place-items-center rounded-sm border border-white/10 text-gold hover:border-gold"
                  >
                    −
                  </button>
                  <span className="text-xs tabular-nums text-foreground">
                    {node.workers}/{WORKER_CAP_PER_NODE}
                  </span>
                  <button
                    type="button"
                    onClick={() => api.assignWorker(node.id, 1)}
                    className="grid h-5 w-5 place-items-center rounded-sm border border-white/10 text-gold hover:border-gold"
                  >
                    +
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      piled {Math.floor(node.raw)}
                    </span>
                    <button
                      type="button"
                      disabled={node.raw < 1}
                      onClick={() => api.dispatchCaravan(node.id)}
                      className="rounded-sm border border-forge-ember bg-forge-ember/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#160d06] transition enabled:hover:brightness-110 disabled:opacity-40"
                    >
                      Send caravan
                    </button>
                    {node.level < NODE_UPGRADE_MAX && (
                      <button
                        type="button"
                        onClick={() => api.upgradeNode(node.id)}
                        className="rounded-sm border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-gold transition hover:border-gold"
                        title={`${node.level * 400}g · ${node.level * 20} timber`}
                      >
                        Deepen
                      </button>
                    )}
                  </div>
                </div>
                {/* raw pile bar */}
                <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-black/40">
                  <span
                    className="block h-full bg-[#8a6f3a]"
                    style={{ width: `${Math.min(100, (node.raw / 240) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* break new ground */}
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Break new ground
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {NODE_TYPES.map((t) => {
              const def = NODE_DEF[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => api.buildNode(t)}
                  title={`${def.gold}g${def.timber ? ` · ${def.timber} timber` : ""}`}
                  className="rounded-sm border border-white/10 bg-black/30 px-2 py-1.5 text-left transition hover:border-gold/60"
                >
                  <div className="text-xs text-gold">
                    {def.glyph} {def.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {def.gold}g{def.timber ? ` · ${def.timber}🪵` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* caravans on the road */}
      {d.caravans.length > 0 && (
        <section className="panel rounded-sm p-4">
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
            Caravans on the Road
          </h3>
          <div className="mt-3 space-y-1.5">
            {d.caravans.map((c) => {
              const left = Math.max(0, c.arrivesAt - now);
              const pct = 100 - (left / CARAVAN_MS) * 100;
              return (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[11px] text-muted-foreground">
                    {RAW_GLYPH[c.raw]} {c.qty} {RAW_LABEL[c.raw]}
                  </span>
                  <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-black/40">
                    <span
                      className="block h-full bg-gold motion-safe:transition-[width]"
                      style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                    {Math.ceil(left / 60000)}m
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* the city — stockpile and workshops */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
          The City — Stores &amp; Workshops
        </h3>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["grain", "timber", "iron", "livestock"] as Raw[]).map((r) => (
            <span
              key={r}
              className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-[#e7d7ac]"
              title={RAW_LABEL[r]}
            >
              {RAW_GLYPH[r]} {Math.floor(d.stock[r] ?? 0)}
            </span>
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          {WORKSHOP_TYPES.map((w) => {
            const def = WORKSHOP_DEF[w];
            const level = d.workshops[w] ?? 0;
            return (
              <div
                key={w}
                className="flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-black/20 px-2.5 py-1.5"
              >
                <span className="min-w-0 text-xs">
                  <span className="text-gold">
                    {def.glyph} {def.label}
                  </span>
                  <span className="text-muted-foreground"> — {def.blurb}</span>
                  {w === "smithy" && level > 0 && (
                    <span className="ml-1 inline-flex overflow-hidden rounded-sm border border-white/10 align-middle">
                      {(["weapons", "armour"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => api.setSmithyFocus(f)}
                          className={cn(
                            "px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                            d.smithyFocus === f ? "bg-gold/20 text-gold" : "text-muted-foreground",
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {level > 0 ? `Lv ${level}` : "—"}
                  </span>
                  {level < 3 && (
                    <button
                      type="button"
                      onClick={() => api.upgradeWorkshop(w)}
                      title={`${(level + 1) * 350}g · ${(level + 1) * 25} timber`}
                      className="rounded-sm border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-gold transition hover:border-gold"
                    >
                      {level > 0 ? "Upgrade" : "Build"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* finished goods → the front */}
      <section className="panel-ornate rounded-sm p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
            Finished Goods
          </h3>
          <span className="text-[11px] tabular-nums text-[#5fd0c6]">
            War supply {supply}/{cap}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["rations", "weapons", "armour", "mounts"] as Good[]).map((g) => (
            <span
              key={g}
              className="rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1 text-[11px] text-gold"
              title={`${GOOD_LABEL[g]} · ${SUPPLY_VALUE[g]} supply each`}
            >
              {GOOD_GLYPH[g]} {Math.floor(d.goods[g] ?? 0)}
            </span>
          ))}
        </div>
        <button
          type="button"
          disabled={shipVal <= 0}
          onClick={() => api.shipToFront()}
          className="mt-3 w-full rounded-sm border border-forge-ember bg-forge-ember/80 py-2 font-display text-xs uppercase tracking-[0.12em] text-[#160d06] transition enabled:hover:brightness-110 disabled:opacity-40"
        >
          {shipVal > 0
            ? `Ship the supply train to the front · +${shipVal} supply`
            : "No goods to ship yet"}
        </button>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          Supply funds committing your banners to the war (on the map). Weapons, armour and mounts
          are worth far more than raw rations.
        </p>
      </section>
    </div>
  );
}
