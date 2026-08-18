import { FACTION_META, rebellionRisk, type FactionId, type Factions } from "@/lib/realm/factions";
import type { TaxRate } from "@/lib/realm/kingdom";
import { GameIcon, type IconName } from "@/components/game/GameIcon";

const ORDER: FactionId[] = ["nobles", "commons", "merchants"];
const ICON: Record<FactionId, IconName> = {
  nobles: "crown",
  commons: "worker",
  merchants: "coin",
};
const TAXES: { key: TaxRate; label: string; note: string }[] = [
  { key: "low", label: "Low", note: "The Commons rejoice; the treasury thins." },
  { key: "normal", label: "Normal", note: "A steady hand." },
  { key: "high", label: "High", note: "Coffers swell; the Commons seethe." },
];

const barColor = (v: number) => (v > 55 ? "#7ea86a" : v > 30 ? "#d8a24a" : "#d1603a");

/**
 * The Estates — the powers within your own realm. Set the tax rate and read the
 * mood; let any estate's favour collapse and rebellion follows.
 */
export function FactionsPanel({
  factions,
  tax,
  onSetTax,
  onClose,
}: {
  factions: Factions;
  tax: TaxRate;
  onSetTax: (t: TaxRate) => void;
  onClose: () => void;
}) {
  const risk = rebellionRisk(factions);
  return (
    <aside className="panel-ornate pointer-events-auto flex max-h-[80vh] w-96 flex-col rounded-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-forge-frame/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            You do not rule unopposed
          </div>
          <h3 className="gilded font-display text-xl leading-tight">The Estates</h3>
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

      <div className="stage-scroll flex-1 space-y-3 overflow-y-auto p-3">
        {risk > 0 && (
          <div className="flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
            <GameIcon name="skull" size={13} />
            An estate's patience is failing — revolt threatens the realm.
          </div>
        )}

        <div className="space-y-2">
          {ORDER.map((id) => {
            const v = factions[id];
            return (
              <div key={id} className="rounded-sm border border-white/10 bg-black/25 p-2.5">
                <div className="flex items-center gap-2">
                  <GameIcon name={ICON[id]} size={14} className="text-gold" />
                  <span className="font-display text-sm text-foreground">
                    {FACTION_META[id].name}
                  </span>
                  <span className="ml-auto text-[11px] tabular-nums" style={{ color: barColor(v) }}>
                    {Math.round(v)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${v}%`, background: barColor(v) }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  They want {FACTION_META[id].wants}.
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            The royal tax
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {TAXES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onSetTax(t.key)}
                className={`flex-1 rounded-sm border px-2 py-1.5 text-[11px] transition ${
                  tax === t.key
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-white/12 text-muted-foreground hover:border-gold/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
            {TAXES.find((t) => t.key === tax)?.note}
          </p>
        </div>
      </div>
    </aside>
  );
}
