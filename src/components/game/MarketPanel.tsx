import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  BLESSED_BOOST,
  BLESSED_MULT,
  ITEM_BY_ID,
  SHOT_BATCH,
  SHOT_BOOST,
  SHOT_GRADES,
  SHOT_SPECS,
  SHOT_TIER_LEVEL,
  emberId,
  shotId,
  type Grade,
  type ShotKind,
} from "@/lib/game/data";
import { canRefine, shotBatchCost, type GameState } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import { marketIndex, travelingMerchant } from "@/lib/game/living";
import { ItemIcon } from "./ItemIcon";
import { ItemTooltip } from "./ItemTooltip";

const KINDS: { kind: ShotKind; title: string; blurb: string }[] = [
  {
    kind: "soul",
    title: "Soulshots",
    blurb: "Pressed from Souls. Loaded into weapon strikes and physical skills.",
  },
  {
    kind: "spirit",
    title: "Spiritshots",
    blurb: "Pressed from Spirits. Charge spells and magical skills.",
  },
];

function Row({
  state,
  api,
  kind,
  grade,
  blessed,
}: {
  state: GameState;
  api: ClanApi;
  kind: ShotKind;
  grade: Grade;
  blessed: boolean;
}) {
  const id = shotId(kind, grade, blessed);
  const def = ITEM_BY_ID[id]!;
  const cost = shotBatchCost(grade, blessed);
  const one = canRefine(state, kind, grade, blessed, 1);
  const ten = canRefine(state, kind, grade, blessed, 10);
  const stock = state.inventory[id] ?? 0;

  return (
    <div className="panel flex items-center justify-between gap-3 rounded-sm px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <ItemIcon item={id} size={34} />
        <div className="min-w-0">
          <ItemTooltip item={id}>
            <span className="text-sm">{def.name}</span>
          </ItemTooltip>
          <span className="ml-2 text-xs text-muted-foreground">×{stock}</span>
          <div className="text-xs text-muted-foreground">
            {cost.embers} {kind === "soul" ? "souls" : "spirits"} + {cost.fee}g → {cost.qty} shots ·
            usable from level {SHOT_TIER_LEVEL[grade]}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={!one.ok}
          onClick={() => api.refineShots(kind, grade, blessed, 1)}
        >
          ×{SHOT_BATCH}
        </Button>
        <Button
          size="sm"
          disabled={!ten.ok}
          onClick={() => api.refineShots(kind, grade, blessed, 10)}
        >
          ×{SHOT_BATCH * 10}
        </Button>
      </div>
    </div>
  );
}

export function MarketPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const shotsOn = state.shotsEnabled !== false;
  const dayIdx = Math.floor(Date.now() / 86400000);
  const idx = marketIndex(dayIdx);
  const trend = Math.round((idx - 1) * 100);
  const merchant = travelingMerchant(dayIdx);

  return (
    <section className="space-y-4">
      {/* the living market — today's index and any merchant passing through */}
      <div className="rounded-sm border border-gold/20 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Market Prices
          </span>
          <span
            className="text-xs tabular-nums"
            style={{ color: trend >= 0 ? "#7ea86a" : "#d1603a" }}
            title="How much the market moves what your spoils fetch when sold today"
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {trend >= 6
            ? "Coin flows freely — a good day to sell your spoils."
            : trend <= -6
              ? "Buyers are tight-fisted today; hold your spoils if you can."
              : "Steady trade in the market square."}
        </p>
        {merchant && (
          <p className="mt-1 text-[11px] italic leading-snug text-[#e7d7ac]">🛒 {merchant.blurb}</p>
        )}
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg">Town Market — Shot Press</h2>
          <p className="text-xs text-muted-foreground">
            No artisan can press shots; only the town presses take Souls and Spirits. A loaded shot
            adds +{Math.round(SHOT_BOOST * 100)}% damage ({Math.round(BLESSED_BOOST * 100)}%
            blessed) and is spent on every attack — a luxury, never a requirement.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          Auto-load
          <Switch checked={shotsOn} onCheckedChange={() => api.toggleShots()} />
        </label>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {(["soul", "spirit"] as ShotKind[]).map((k) => {
          const id = emberId(k);
          return (
            <div key={k} className="panel flex items-center gap-2 rounded-sm px-3 py-2">
              <ItemIcon item={id} size={34} />
              <div>
                <ItemTooltip item={id}>
                  <span className="text-sm">{ITEM_BY_ID[id]?.name}</span>
                </ItemTooltip>
                <div className="text-xs text-muted-foreground">
                  ×{state.inventory[id] ?? 0} in the warehouse
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {KINDS.map(({ kind, title, blurb }) => (
        <div key={kind}>
          <h3 className="font-display text-sm text-gold">{title}</h3>
          <p className="text-xs text-muted-foreground">{blurb}</p>
          <div className="mt-2 grid gap-2">
            {SHOT_GRADES.map((g) => (
              <Row key={g} state={state} api={api} kind={kind} grade={g} blessed={false} />
            ))}
          </div>
          <h4 className="mt-3 font-display text-xs uppercase tracking-widest text-muted-foreground">
            Blessed variants — {BLESSED_MULT}× the price, +{Math.round(BLESSED_BOOST * 100)}% damage
          </h4>
          <div className="mt-2 grid gap-2">
            {SHOT_GRADES.map((g) => (
              <Row key={g} state={state} api={api} kind={kind} grade={g} blessed />
            ))}
          </div>
        </div>
      ))}

      <p className="text-[10px] text-muted-foreground">
        Press prices scale with each grade's gold faucet (
        {SHOT_GRADES.map((g) => `${g} ${SHOT_SPECS[g].costPerShot}g`).join(" · ")} per shot),
        holding the shot drain at roughly a third of your income at every tier.
      </p>
    </section>
  );
}
