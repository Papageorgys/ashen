import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DAILY_BY_ID, ITEM_BY_ID, ZONE_BY_ID, type Cadence } from "@/lib/game/data";
import { dayKey, rallyReward, type DailyState, type GameState } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

function RallyCard({ state, api }: { state: GameState; api: ClanApi }) {
  const today = dayKey();
  const rally = state.rally ?? { lastDay: "", streak: 0 };
  const claimedToday = rally.lastDay === today;
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const nextStreak = claimedToday
    ? rally.streak
    : rally.lastDay === yesterday
      ? rally.streak + 1
      : 1;
  const reward = rallyReward(nextStreak);
  const flames = "🔥".repeat(Math.min(5, nextStreak));

  return (
    <div
      className={`panel-ornate flex flex-wrap items-center gap-3 rounded-sm p-4 ${
        reward.milestone && !claimedToday ? "ring-1 ring-gold/50" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="gilded font-display text-base">Dawn Rally</h3>
          {nextStreak > 1 && (
            <span className="text-xs text-gold" title={`${nextStreak}-day streak`}>
              {flames} {nextStreak}-day streak
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {claimedToday
            ? "The banners have mustered today. Return at dawn to keep the streak."
            : `Muster the banners — day ${nextStreak}. Miss a day and the streak breaks.`}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {claimedToday ? "Next dawn: " : "Today: "}
          <span className="text-foreground">
            {reward.gold.toLocaleString()} gold · {reward.rep} rep
            {reward.inspiration ? ` · ${reward.inspiration} inspiration` : ""}
          </span>
          {reward.milestone ? <span className="text-gold"> · feast-day bounty</span> : ""}
        </p>
      </div>
      <Button onClick={() => api.claimRally()} disabled={claimedToday}>
        {claimedToday ? "Rallied" : "Rally the banners"}
      </Button>
    </div>
  );
}

const BOARDS: { cadence: Cadence; title: string; blurb: string }[] = [
  {
    cadence: "daily",
    title: "Daily Contracts",
    blurb: "Four heavy culls posted each dawn. Reset at midnight — unclaimed work is lost.",
  },
  {
    cadence: "weekly",
    title: "Weekly Campaigns",
    blurb: "Week-long hunts. Expect several days of sustained farming from multiple banners.",
  },
  {
    cadence: "monthly",
    title: "Monthly Undertakings",
    blurb: "Clan-defining tallies. Only a full roster farming all month will finish these.",
  },
];

function Board({
  title,
  blurb,
  board,
  api,
}: {
  title: string;
  blurb: string;
  board: DailyState | undefined;
  api: ClanApi;
}) {
  const missions = board?.missions ?? [];
  return (
    <div className="space-y-2">
      <div>
        <h3 className="font-display text-sm text-gold">{title}</h3>
        <p className="text-xs text-muted-foreground">{blurb}</p>
      </div>
      <div className="grid gap-2">
        {missions.map((dm) => {
          const def = DAILY_BY_ID[dm.id];
          if (!def) return null;
          const zone = ZONE_BY_ID[def.zoneId];
          const done = dm.progress >= def.kills;
          const rewards = [def.reward, def.reward2].filter(Boolean) as {
            item: keyof typeof ITEM_BY_ID;
            qty: number;
          }[];
          return (
            <div key={dm.id} className="panel rounded-sm px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{def.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {zone?.name} · {Math.min(dm.progress, def.kills).toLocaleString()}/
                    {def.kills.toLocaleString()} slain · {def.gold.toLocaleString()}g, {def.rep} rep
                    {rewards.length
                      ? ` · ${rewards
                          .map((r) => `${ITEM_BY_ID[r.item]?.name} ×${r.qty}`)
                          .join(", ")}`
                      : ""}
                  </div>
                  <Progress className="mt-1" value={(dm.progress / def.kills) * 100} />
                </div>
                <Button
                  size="sm"
                  disabled={!done || dm.claimed}
                  onClick={() => api.claimDaily(dm.id)}
                >
                  {dm.claimed ? "Claimed" : done ? "Claim" : "In progress"}
                </Button>
              </div>
            </div>
          );
        })}
        {missions.length === 0 && (
          <p className="text-xs text-muted-foreground">This board is empty.</p>
        )}
      </div>
    </div>
  );
}

export function DailyPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const byCadence: Record<Cadence, DailyState | undefined> = {
    daily: state.daily,
    weekly: state.weekly,
    monthly: state.monthly,
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg">Contract Board</h2>
        <p className="text-xs text-muted-foreground">
          Kills only count while a banner is farming the named area — rewards land in the clan
          warehouse.
        </p>
      </header>

      <RallyCard state={state} api={api} />

      {BOARDS.map((b) => (
        <Board
          key={b.cadence}
          title={b.title}
          blurb={b.blurb}
          board={byCadence[b.cadence]}
          api={api}
        />
      ))}
    </section>
  );
}
