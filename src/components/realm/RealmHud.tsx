import { realmSummary, foodBalance } from "@/lib/realm/economy";
import { RESOURCE_COLOR, RESOURCE_LABEL, RESOURCE_ORDER } from "@/lib/realm/terrain";
import type { Ledger } from "@/lib/realm/kingdom";
import type { World } from "@/lib/realm/types";
import { GameIcon, type IconName } from "@/components/game/GameIcon";

/** The player's realm at a glance — holdings, people, treasury, and the
 * resources their provinces yield each turn. */
export function RealmHud({ world, ledger }: { world: World; ledger?: Ledger }) {
  const player = world.kingdoms.find((k) => k.id === world.playerKingdomId)!;
  const sum = realmSummary(world, player.id);
  const food = foodBalance(world, player.id);

  return (
    <div className="plaque pointer-events-auto flex flex-wrap items-center gap-2 px-3 py-2">
      <span
        className="h-8 w-8 shrink-0 rounded-sm border-2"
        style={{ borderColor: player.color, background: `${player.color}22` }}
        aria-hidden
      />
      <div className="mr-2 min-w-0">
        <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {ledger ? `Your realm · Season ${ledger.season}` : "Your realm"}
        </div>
        <div className="gilded font-display text-lg leading-tight">{player.name}</div>
      </div>

      {ledger && (
        <Gauge
          icon="coin"
          label="Treasury"
          value={ledger.treasury.toLocaleString()}
          tone="#e7c65a"
        />
      )}
      <Gauge icon="home" label="Provinces" value={String(sum.provinceCount)} tone="#e7d7ac" />
      <Gauge icon="worker" label="People" value={sum.population.toLocaleString()} tone="#c9b06a" />
      <Gauge
        icon="supply"
        label="Food"
        value={food.net >= 0 ? `+${food.net}` : String(food.net)}
        tone={food.net >= 0 ? "#5fd0c6" : "#d1603a"}
      />
      {ledger && (
        <Gauge
          icon="crown"
          label="Unrest"
          value={`${ledger.unrest}`}
          tone={ledger.unrest > 45 ? "#d1603a" : ledger.unrest > 25 ? "#d8a24a" : "#7ea86a"}
        />
      )}

      <div className="ml-1 flex flex-wrap items-center gap-1.5">
        {RESOURCE_ORDER.filter((r) => (sum.production[r] ?? 0) > 0).map((rid) => (
          <span
            key={rid}
            title={RESOURCE_LABEL[rid]}
            className="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-black/30 px-1.5 py-1 text-[11px] tabular-nums"
          >
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: RESOURCE_COLOR[rid] }}
            />
            <span style={{ color: RESOURCE_COLOR[rid] }}>{sum.production[rid]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Gauge({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-sm border border-forge-frame/35 bg-gradient-to-b from-black/45 to-black/20 px-1.5 py-1">
      <span
        className="grid h-6 w-6 place-items-center rounded-[3px] border"
        style={{ borderColor: `${tone}44`, background: `${tone}14`, color: tone }}
      >
        <GameIcon name={icon} size={14} />
      </span>
      <div className="leading-none">
        <div className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        <div className="font-display text-sm tabular-nums" style={{ color: tone }}>
          {value}
        </div>
      </div>
    </div>
  );
}
