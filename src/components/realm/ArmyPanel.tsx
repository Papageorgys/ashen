import { UNIT, troopCount, type Army, type UnitType } from "@/lib/realm/army";
import type { World } from "@/lib/realm/types";
import { GameIcon } from "@/components/game/GameIcon";

const ORDER: UnitType[] = ["knights", "cavalry", "heavy", "swordsmen", "archers", "spearmen"];

/** The selected host — its commander, its order of battle, and its condition. */
export function ArmyPanel({
  world,
  army,
  isPlayer,
  onClose,
}: {
  world: World;
  army: Army;
  isPlayer: boolean;
  onClose: () => void;
}) {
  const kingdom = world.kingdoms.find((k) => k.id === army.ownerId);
  const color = kingdom?.color ?? "#b8a06a";
  const at = world.provinces.find((p) => p.id === army.provinceId);
  const total = troopCount(army);
  const rows = ORDER.filter((u) => (army.composition[u] ?? 0) > 0);

  return (
    <aside className="panel-ornate pointer-events-auto w-72 rounded-sm p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />
            {kingdom?.name ?? "Unknown banner"}
          </div>
          <h3 className="gilded font-display text-xl leading-tight">{army.name}</h3>
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

      <div className="mt-2 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
        <div className="text-sm text-gold">{army.commander.name}</div>
        <div className="mt-0.5 flex gap-3 text-[10px] text-muted-foreground">
          <span>Command {army.commander.command}</span>
          <span>Foot {army.commander.infantry}</span>
          <span>Horse {army.commander.cavalry}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {army.path.length > 0
            ? `Marching · ${army.path.length} legs left`
            : `Holding at ${at?.name ?? "—"}`}
        </span>
        <span className="font-display tabular-nums text-foreground">
          {total.toLocaleString()} men
        </span>
      </div>

      <div className="mt-2 space-y-1">
        {rows.map((u) => {
          const n = army.composition[u] ?? 0;
          return (
            <div key={u} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 text-muted-foreground">{UNIT[u].name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(n / total) * 100}%`, background: color, opacity: 0.7 }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-foreground">{n}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Bar label="Morale" value={army.morale} tone="#d8a24a" />
        <Bar label="Supply" value={army.supply} tone="#5fd0c6" />
      </div>

      {isPlayer && (
        <p className="mt-3 flex items-center gap-1.5 rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1.5 text-[11px] text-gold">
          <GameIcon name="banner" size={13} />
          Click any province to march there.
        </p>
      )}
    </aside>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
      <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums" style={{ color: tone }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full"
          style={{ width: `${value * 100}%`, background: tone }}
        />
      </div>
    </div>
  );
}
