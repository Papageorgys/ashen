import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { MAX_PARTY_SIZE } from "@/lib/game/data";
import {
  nextClanReq,
  maxParties,
  canJoinClan,
  JOIN_REQ,
  type GameState,
} from "@/lib/game/engine";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

import { RIVALS, RIVAL_BY_ID } from "@/lib/game/rivals";
import type { ClanApi } from "@/hooks/useClanGame";
import { useState } from "react";

function OathRow({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">
        {before.toLocaleString()} <span className="text-muted-foreground">→</span>{" "}
        <span className="text-gold">{after.toLocaleString()}</span>{" "}
        <span className={delta >= 0 ? "text-emerald-400" : "text-destructive"}>
          ({delta >= 0 ? "+" : ""}
          {delta.toLocaleString()})
        </span>
      </span>
    </div>
  );
}

export function ClanHeader({ state, api }: { state: GameState; api: ClanApi }) {
  const req = nextClanReq(state.clanLevel);
  const founded = state.clanLevel >= 1;
  const repPct = req ? Math.min(100, (state.reputation / req.rep) * 100) : 100;
  const goldPct = req ? Math.min(100, (state.gold / req.gold) * 100) : 100;
  const sworn = state.allegiance ?? null;
  const join = canJoinClan(state);
  const [joinOpen, setJoinOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [oathWord, setOathWord] = useState("");
  const oathConfirmed = oathWord.trim().toUpperCase() === "SWEAR";

  return (
    <header className="panel-ornate rounded-sm p-4">
      <div className="flex flex-wrap items-end gap-4">

        <div className="min-w-56 flex-1 space-y-1">
          {req ? (
            <>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Reputation {state.reputation}/{req.rep}
                </span>
                <span>
                  Gold {state.gold}/{req.gold}
                </span>
              </div>
              <Progress value={Math.min(repPct, goldPct)} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Your clan stands at its peak. Fill every banner with {MAX_PARTY_SIZE} sworn blades.
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button disabled={!req} onClick={api.levelUpClan}>
            {req ? (founded ? `Raise clan to level ${req.level}` : "Found your own clan") : "Max level"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Clan actions" title="Clan actions">
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Clan actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!founded &&
                (sworn ? (
                  <DropdownMenuItem onSelect={() => api.leaveClan()}>
                    Break the oath to {RIVAL_BY_ID[sworn.clanId]?.name ?? sworn.clanName}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setJoinOpen(true); }}>
                    Join an existing clan
                  </DropdownMenuItem>
                ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => api.reset()}
              >
                {founded ? "Disband the clan" : "Abandon the road"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!founded && !sworn && (
            <Dialog open={joinOpen} onOpenChange={(o) => { setJoinOpen(o); if (!o) { setPending(null); setOathWord(""); } }}>
              <DialogContent className="max-w-lg">

                <DialogHeader>
                  <DialogTitle className="font-display text-gold">Swear to a clan</DialogTitle>
                  <DialogDescription>
                    Keep your company and serve under another crest: {JOIN_REQ.rep} reputation buys
                    you a captain's oath, a {JOIN_REQ.stipend} gold stipend, a second banner and
                    peace with that clan. You can still found {state.clanName} later.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  {RIVALS.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start justify-between gap-3 rounded-sm border border-border/60 p-3"
                    >
                      <div>
                        <div className="font-display text-sm" style={{ color: r.color }}>
                          {r.name}
                        </div>
                        <p className="text-xs text-muted-foreground">{r.blurb}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={pending === r.id ? "default" : "outline"}
                        disabled={!join.ok}
                        title={join.ok ? undefined : join.why}
                        onClick={() => { setPending(pending === r.id ? null : r.id); setOathWord(""); }}
                      >
                        {pending === r.id ? "Selected" : "Review oath"}
                      </Button>
                    </div>
                  ))}
                  {!join.ok && <p className="text-xs text-muted-foreground">{join.why}</p>}
                </div>

                {pending && join.ok && (
                  <div className="rounded-sm border border-gold/40 bg-background/40 p-3">
                    <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Before you swear to {RIVAL_BY_ID[pending]?.name}
                    </div>
                    <div className="space-y-1 text-xs">
                      <OathRow
                        label="Reputation"
                        before={state.reputation}
                        after={state.reputation - JOIN_REQ.rep}
                      />
                      <OathRow
                        label="Gold"
                        before={state.gold}
                        after={state.gold + JOIN_REQ.stipend}
                      />
                      <OathRow
                        label="Banner slots"
                        before={maxParties(state.clanLevel, false)}
                        after={maxParties(state.clanLevel, true)}
                      />
                      <OathRow
                        label={`Hostility of ${RIVAL_BY_ID[pending]?.name ?? ""}`}
                        before={state.rivals?.find((x) => x.id === pending)?.hostility ?? 0}
                        after={0}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Rank becomes Sworn Captain. Your crest stays unfounded — you can found{" "}
                      {state.clanName} later, which ends this oath.
                    </p>
                    <div className="mt-3 space-y-1">
                      <label
                        htmlFor="oath-word"
                        className="text-[11px] uppercase tracking-widest text-muted-foreground"
                      >
                        Type <span className="text-gold">SWEAR</span> to seal the oath
                      </label>
                      <Input
                        id="oath-word"
                        value={oathWord}
                        onChange={(e) => setOathWord(e.target.value)}
                        placeholder="SWEAR"
                        autoComplete="off"
                        className="h-8 font-mono uppercase tracking-widest"
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPending(null);
                          setOathWord("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!oathConfirmed}
                        title={oathConfirmed ? undefined : "Type SWEAR to confirm"}
                        onClick={() => {
                          api.joinClan(pending);
                          setPending(null);
                          setOathWord("");
                          setJoinOpen(false);
                        }}
                      >
                        Confirm oath
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
        )}

      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {founded
          ? `Objective: field as many banners of ${MAX_PARTY_SIZE} as your clan level allows.`
          : sworn
            ? `Sworn service: fight under ${sworn.clanName} with two banners, or save ${req?.rep ?? 0} reputation and ${req?.gold ?? 0} gold to raise your own crest.`
            : `Choose your road: found your own clan, or swear your company to an established one and fight under their crest.`}
      </p>

    </header>
  );
}
