import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberCard } from "./MemberCard";
import {
  recruitCost,
  clanCapacity,
  keepLevel,
  type GameState,
  type Member,
} from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

export function RecruitPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const capacity = clanCapacity(state.clanLevel, keepLevel(state, "barracks"));
  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-lg text-foreground">Hall of Oaths</h2>
          <p className="text-xs text-muted-foreground">
            Roster {state.members.length} / {capacity} · name them and hear their oath before they
            swear
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={api.refreshRecruits}>
          Send heralds · {150 * state.clanLevel}g
        </Button>
      </header>
      <div className="grid gap-2 sm:grid-cols-2">
        {state.recruits.map((r) => (
          <RecruitCard key={r.id} recruit={r} api={api} />
        ))}
        {state.recruits.length === 0 && (
          <p className="text-sm text-muted-foreground">No wanderers waiting. Send heralds.</p>
        )}
      </div>
    </section>
  );
}

function RecruitCard({ recruit, api }: { recruit: Member; api: ClanApi }) {
  const [name, setName] = useState(recruit.name);
  const [oath, setOath] = useState("");
  const chosen = name.trim() || recruit.name;

  return (
    <div className="space-y-1.5">
      {/* the card previews the name the player is giving them, live */}
      <MemberCard member={{ ...recruit, name: chosen }} />
      <div className="panel space-y-1.5 rounded-sm p-2">
        <label className="block space-y-0.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Their name
          </span>
          <Input
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            aria-label="Name this recruit"
          />
        </label>
        <label className="block space-y-0.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Their oath <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <Input
            value={oath}
            maxLength={80}
            placeholder="the one who came in from the cold"
            onChange={(e) => setOath(e.target.value)}
            aria-label="An oath or epithet for this recruit"
          />
        </label>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => api.recruit(recruit.id, { name: chosen, oath: oath.trim() })}
          >
            Swear the oath · {recruitCost(recruit)}g
          </Button>
        </div>
      </div>
    </div>
  );
}
