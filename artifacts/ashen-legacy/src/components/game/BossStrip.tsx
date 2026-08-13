import { Skull, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorldBossState } from "@/hooks/useWorldBoss";

/** A slim, always-visible band under the title bar — the realm's shared boss + a way in. */
export function BossStrip({ boss, onOpen }: { boss: WorldBossState; onOpen: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-destructive/30 bg-destructive/5 px-3 py-1.5 sm:gap-3">
      <Skull className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-xs font-display text-gold sm:max-w-[14rem] sm:flex-none">
        {boss.boss.name}
      </span>
      <div className="hidden h-2 min-w-0 flex-1 overflow-hidden rounded-sm border border-destructive/30 bg-secondary sm:block">
        <div className="h-full bg-destructive transition-all" style={{ width: `${boss.pct}%` }} />
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
        {boss.defeated ? "slain" : `${Math.round(boss.pct)}%`}
      </span>
      <Button size="sm" variant="outline" onClick={onOpen} className="h-7 shrink-0 gap-1 px-2">
        <span className="text-xs">{boss.defeated ? "Claim" : "Muster"}</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
