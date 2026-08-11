import { Button } from "@/components/ui/button";
import { MemberCard } from "./MemberCard";
import { recruitCost, clanCapacity, keepLevel, type GameState } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

export function RecruitPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const capacity = clanCapacity(state.clanLevel, keepLevel(state, "barracks"));
  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-lg text-foreground">Hall of Oaths</h2>
          <p className="text-xs text-muted-foreground">
            Roster {state.members.length} / {capacity}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={api.refreshRecruits}>
          Send heralds · {150 * state.clanLevel}g
        </Button>
      </header>
      <div className="grid gap-2 sm:grid-cols-2">
        {state.recruits.map((r) => (
          <MemberCard
            key={r.id}
            member={r}
            right={
              <Button size="sm" onClick={() => api.recruit(r.id)}>
                {recruitCost(r)}g
              </Button>
            }
          />
        ))}
        {state.recruits.length === 0 && (
          <p className="text-sm text-muted-foreground">No wanderers waiting. Send heralds.</p>
        )}
      </div>
    </section>
  );
}
