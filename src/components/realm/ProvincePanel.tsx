import { RESOURCE_COLOR, RESOURCE_LABEL, RESOURCE_ORDER, TERRAIN } from "@/lib/realm/terrain";
import type { ResourceId, World } from "@/lib/realm/types";
import { GameIcon, type IconName } from "@/components/game/GameIcon";

const TIER_LABEL: Record<string, string> = {
  village: "Village",
  town: "Town",
  city: "City",
  castle: "Castle",
  fortress: "Fortress",
  port: "Port",
};
const TIER_ICON: Record<string, IconName> = {
  village: "home",
  town: "home",
  city: "crown",
  castle: "tower",
  fortress: "shield",
  port: "market",
};

/** Detail on the selected province — geography, control, people, economy. */
export function ProvincePanel({
  world,
  provinceId,
  onClose,
}: {
  world: World;
  provinceId: string;
  onClose: () => void;
}) {
  const p = world.provinces.find((x) => x.id === provinceId);
  if (!p) return null;
  const terrain = TERRAIN[p.terrain];
  const owner = p.ownerId ? world.kingdoms.find((k) => k.id === p.ownerId) : null;
  const settlement = p.settlementId ? world.settlements.find((s) => s.id === p.settlementId) : null;
  const resources = RESOURCE_ORDER.filter((rid) => (p.production[rid] ?? 0) > 0);

  return (
    <aside className="panel-ornate pointer-events-auto w-72 rounded-sm p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {owner ? owner.name : "Wilderness — unclaimed"}
          </div>
          <h3 className="gilded font-display text-xl leading-tight">{p.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-6 w-6 place-items-center rounded-sm border border-white/15 text-muted-foreground transition hover:border-gold/50 hover:text-gold"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div
        className="mt-2 flex items-center gap-2 rounded-sm border px-2 py-1.5"
        style={{
          borderColor: `${owner?.color ?? "#6b5330"}66`,
          background: `${owner?.color ?? "#6b5330"}14`,
        }}
      >
        <span className="h-3 w-3 shrink-0 rounded-[2px]" style={{ background: terrain.fill }} />
        <span className="text-sm text-foreground">{terrain.name}</span>
        {p.coastal && <span className="text-[10px] text-[#5fd0c6]">· coastal</span>}
        <span className="ml-auto text-[10px] text-muted-foreground">
          move ×{terrain.moveCost === Infinity ? "∞" : terrain.moveCost} · def +
          {Math.round(terrain.defense * 100)}%
        </span>
      </div>

      {settlement && (
        <div className="mt-2 flex items-center gap-2 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
          <span className="grid h-7 w-7 place-items-center rounded-sm border border-gold/25 bg-gold/[0.06] text-gold">
            <GameIcon name={TIER_ICON[settlement.tier] ?? "home"} size={15} />
          </span>
          <div className="leading-tight">
            <div className="text-sm text-gold">{settlement.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {TIER_LABEL[settlement.tier]}
              {settlement.fortLevel > 0 ? ` · walls ${settlement.fortLevel}` : ""}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Population" value={p.population.toLocaleString()} icon="worker" />
        <Stat label="Neighbours" value={String(p.neighbors.length)} icon="banner" />
      </div>

      {resources.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Produces / turn
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {resources.map((rid: ResourceId) => (
              <span
                key={rid}
                className="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-black/25 px-1.5 py-0.5 text-[11px] tabular-nums"
              >
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ background: RESOURCE_COLOR[rid] }}
                />
                <span style={{ color: RESOURCE_COLOR[rid] }}>+{p.production[rid]}</span>
                <span className="text-muted-foreground">{RESOURCE_LABEL[rid]}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
      <GameIcon name={icon} size={14} className="text-muted-foreground" />
      <div className="leading-none">
        <div className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="font-display text-sm tabular-nums text-foreground">{value}</div>
      </div>
    </div>
  );
}
