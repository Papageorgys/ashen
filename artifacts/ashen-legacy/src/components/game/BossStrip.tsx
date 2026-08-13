import { Skull, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorldBossState } from "@/hooks/useWorldBoss";

/** A slim, always-visible band under the title bar — the realm's shared boss + a way in. */
export function BossStrip({ boss, onOpen }: { boss: WorldBossState; onOpen: () => void }) {
  const defeated = boss.defeated;
  return (
    <div
      className={`flex shrink-0 items-center gap-2 border-b px-3 py-1.5 sm:gap-3 ${
        defeated
          ? "border-muted/40 bg-muted/10"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <Skull
        className={`h-4 w-4 shrink-0 ${defeated ? "text-muted-foreground" : "text-destructive"}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-xs font-display text-gold sm:max-w-[14rem] sm:flex-none">
        {boss.boss.name}
      </span>
      <div
        className={`h-2 min-w-0 flex-1 overflow-hidden rounded-sm border ${
          defeated ? "border-muted/40 bg-secondary/60" : "border-destructive/30 bg-secondary"
        }`}
        role="progressbar"
        aria-valuenow={Math.round(boss.pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={defeated ? `${boss.boss.name} slain` : `${boss.boss.name} — ${Math.round(boss.pct)}% HP remaining`}
      >
        <div
          className={`h-full bar-fill ${defeated ? "bg-muted-foreground/40" : "bg-destructive"}`}
          style={{ width: `${boss.pct}%` }}
        />
      </div>
      <span className={`shrink-0 text-xs font-medium tabular-nums ${defeated ? "text-muted-foreground" : "text-destructive"}`}>
        {defeated ? "slain" : `${Math.round(boss.pct)}%`}
      </span>
      <Button
        size="sm"
        variant={defeated ? "secondary" : "outline"}
        onClick={onOpen}
        className="h-8 shrink-0 gap-1 px-2.5"
      >
        <span className="text-xs">{defeated ? "Claim" : "Muster"}</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
