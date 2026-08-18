import {
  TRADEABLES,
  buyPrice,
  sellPrice,
  trend,
  type MarketState,
  type Tradeable,
} from "@/lib/realm/market";
import { RESOURCE_COLOR, RESOURCE_LABEL } from "@/lib/realm/terrain";
import type { Ledger } from "@/lib/realm/kingdom";
import { GameIcon } from "@/components/game/GameIcon";

const LOT = 10;

/** A sparkline of a good's recent price. */
function Spark({ hist, color }: { hist: number[]; color: string }) {
  if (hist.length < 2) return null;
  const w = 54;
  const h = 16;
  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const span = max - min || 1;
  const pts = hist
    .map((v, i) => {
      const x = (i / (hist.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.3} strokeOpacity={0.8} />
    </svg>
  );
}

/**
 * The Market — buy and sell against a live price that the war moves. Corner the
 * iron trade before the fighting starts and grow rich without a single conquest.
 */
export function MarketPanel({
  market,
  ledger,
  onTrade,
  onClose,
}: {
  market: MarketState;
  ledger: Ledger;
  onTrade: (t: Tradeable, side: "buy" | "sell") => void;
  onClose: () => void;
}) {
  return (
    <aside className="panel-ornate pointer-events-auto flex max-h-[80vh] w-96 flex-col rounded-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-forge-frame/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Prices move with the war
          </div>
          <h3 className="gilded font-display text-xl leading-tight">The Market</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1 text-[11px] tabular-nums text-gold">
            <GameIcon name="coin" size={13} />
            {ledger.treasury.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-sm border border-white/15 text-muted-foreground transition hover:border-gold/50 hover:text-gold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="stage-scroll flex-1 space-y-2 overflow-y-auto p-3">
        {TRADEABLES.map((t) => {
          const dir = trend(market, t);
          const color = RESOURCE_COLOR[t];
          const stock = Math.floor(ledger.stores[t] ?? 0);
          const bp = buyPrice(market, t);
          const canBuy = ledger.treasury >= bp * LOT;
          const canSell = stock >= LOT;
          return (
            <div key={t} className="rounded-sm border border-white/10 bg-black/25 p-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-[2px]" style={{ background: color }} />
                <span className="font-display text-sm text-foreground">{RESOURCE_LABEL[t]}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">you hold {stock}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <Spark hist={market.history[t]} color={color} />
                  <span
                    className="font-display text-base tabular-nums"
                    style={{ color: dir > 0 ? "#e0895f" : dir < 0 ? "#9cc487" : "#e7d7ac" }}
                  >
                    {market.prices[t]}
                    {dir > 0 ? " ▲" : dir < 0 ? " ▼" : ""}
                  </span>
                </span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => onTrade(t, "buy")}
                  className="flex-1 rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1 text-[11px] text-gold transition hover:border-gold/60 disabled:opacity-40"
                >
                  Buy {LOT} · {bp * LOT}g
                </button>
                <button
                  type="button"
                  disabled={!canSell}
                  onClick={() => onTrade(t, "sell")}
                  className="flex-1 rounded-sm border border-[#7ea86a]/30 bg-[#7ea86a]/[0.05] px-2 py-1 text-[11px] text-[#9cc487] transition hover:border-[#7ea86a]/60 disabled:opacity-40"
                >
                  Sell {LOT} · {sellPrice(market, t) * LOT}g
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
