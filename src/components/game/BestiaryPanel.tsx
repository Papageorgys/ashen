import { useMemo, useState } from "react";
import { ZONE_BY_ID } from "@/lib/game/data";
import type { GameState } from "@/lib/game/engine";
import {
  FAMILY_BLURB,
  FAMILY_LABEL,
  MONSTERS,
  type Monster,
  type MonsterFamily,
} from "@/lib/game/monsters";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bug,
  Cat,
  Cog,
  Flame,
  Ghost,
  Leaf,
  Skull,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";

const FAMILY_ICON: Record<MonsterFamily, LucideIcon> = {
  humanoid: Users,
  beast: Cat,
  undead: Skull,
  demon: Flame,
  dragonkin: Swords,
  construct: Cog,
  insect: Bug,
  spirit: Ghost,
  plant: Leaf,
};

const FAMILIES = Object.keys(FAMILY_LABEL) as MonsterFamily[];

function MonsterRow({
  m,
  kills,
  elites,
  seen,
}: {
  m: Monster;
  kills: number;
  elites: number;
  seen: boolean;
}) {
  const Icon = FAMILY_ICON[m.family];
  const zone = ZONE_BY_ID[m.zoneId];
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-sm border border-border/50 px-2 py-1.5",
        seen ? "bg-background/40" : "bg-background/10 opacity-60",
        m.elite && seen && "border-gold/50 bg-gold/5",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border",
          m.elite ? "border-gold/60 text-gold" : "border-border/60 text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("font-display text-sm", seen ? "text-foreground" : "text-muted-foreground")}>
            {seen ? m.name : "Unrecorded"}
          </span>
          {m.elite && (
            <Badge variant="outline" className="border-gold/60 px-1 py-0 text-[9px] uppercase tracking-widest text-gold">
              Elite
            </Badge>
          )}
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Lv {m.level} · {m.race} · {FAMILY_LABEL[m.family]}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {seen ? m.blurb : "No champion of yours has faced this creature."}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
          {zone?.name ?? m.zoneId}
          {m.family === "humanoid" && " · carries equipment"}
          {kills > 0 && ` · ${kills.toLocaleString()} slain`}
          {elites > 0 && ` · ${elites} elite`}
        </p>
      </div>
    </div>
  );
}

/** The clan's field record of every creature in the realm. */
export function BestiaryPanel({ state }: { state: GameState }) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<MonsterFamily | "all">("all");
  const bestiary = state.bestiary ?? {};

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MONSTERS.filter((m) => {
      if (family !== "all" && m.family !== family) return false;
      if (!needle) return true;
      const zone = ZONE_BY_ID[m.zoneId]?.name ?? "";
      return (
        m.name.toLowerCase().includes(needle) ||
        m.race.toLowerCase().includes(needle) ||
        zone.toLowerCase().includes(needle)
      );
    }).sort((a, b) => a.level - b.level || Number(a.elite ?? false) - Number(b.elite ?? false));
  }, [q, family]);

  const discovered = MONSTERS.filter((m) => (bestiary[m.id]?.kills ?? 0) > 0).length;
  const totalKills = Object.values(bestiary).reduce((s, e) => s + e.kills, 0);

  return (
    <div className="space-y-3">
      <div className="panel-ornate rounded-sm p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg text-gold">Bestiary</h2>
            <p className="text-xs text-muted-foreground">
              {discovered}/{MONSTERS.length} creatures recorded · {totalKills.toLocaleString()} slain.
              Only humanoid kin carry weapons and armour worth taking.
            </p>
          </div>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search creature, kin or zone"
            className="h-8 w-56 text-xs"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFamily("all")}
            className={cn(
              "rounded-sm border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors",
              family === "all"
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-border/60 text-muted-foreground hover:text-gold/80",
            )}
          >
            All kin
          </button>
          {FAMILIES.map((f) => {
            const Icon = FAMILY_ICON[f];
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFamily(f)}
                title={FAMILY_BLURB[f]}
                className={cn(
                  "flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors",
                  family === f
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-border/60 text-muted-foreground hover:text-gold/80",
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {FAMILY_LABEL[f]}
              </button>
            );
          })}
        </div>

        {family !== "all" && (
          <p className="mt-2 text-xs text-muted-foreground">{FAMILY_BLURB[family]}</p>
        )}
      </div>

      <div className="grid gap-1.5 md:grid-cols-2">
        {rows.map((m) => {
          const e = bestiary[m.id];
          return (
            <MonsterRow
              key={m.id}
              m={m}
              kills={e?.kills ?? 0}
              elites={e?.elites ?? 0}
              seen={!!e && e.kills > 0}
            />
          );
        })}
        {rows.length === 0 && (
          <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
            No creature matches that.
          </p>
        )}
      </div>
    </div>
  );
}
