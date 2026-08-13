import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ClanCrest } from "@/components/game/ClanCrest";
import { Counter } from "@/components/game/Counter";
import { DEFAULT_CREST } from "@/lib/game/identity";
import { MAX_PARTY_SIZE } from "@/lib/game/data";
import { maxParties, scoreClan, wornTitle, type GameState } from "@/lib/game/engine";
import { CASTLE } from "@/lib/game/rivals";
import { supabase } from "@/integrations/supabase/client";

function Readout({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="l2-inset min-w-16 rounded-sm px-2.5 py-1 text-right">
      <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-display text-base leading-tight text-gold">
        {typeof value === "number" ? <Counter value={value} /> : value}
      </div>
    </div>
  );
}

export function TitleBar({
  state,
  email,
  signedIn,
}: {
  state: GameState;
  email?: string | null;
  signedIn: boolean;
}) {
  const founded = state.clanLevel >= 1;
  const slots = maxParties(state.clanLevel, !!state.allegiance);
  const score = scoreClan(state);

  return (
    <header className="plaque relative z-20">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <ClanCrest
            crest={state.crest ?? DEFAULT_CREST}
            className="h-11 w-11 shrink-0 sm:h-12 sm:w-12"
          />
          <div className="min-w-0">
            <h1 className="gilded truncate font-display text-xl leading-tight sm:text-2xl">
              {founded ? state.clanName : `${state.leaderName}'s Company`}
              {founded && wornTitle(state) ? (
                <span className="ml-2 align-middle text-sm text-gold/80">
                  {wornTitle(state)}
                </span>
              ) : null}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {state.motto ? `“${state.motto}” · ` : ""}
              {founded
                ? `Clan level ${state.clanLevel} · ${slots} banner slots`
                : state.allegiance
                  ? `${state.allegiance.rank} of ${state.allegiance.clanName}`
                  : `A free company of ${MAX_PARTY_SIZE}`}
              {state.castle?.holder === "player" ? ` · holds ${CASTLE.name}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 md:flex">
            <Readout label="Gold" value={state.gold} />
            {(state.rawAsh ?? 0) >= 1 && <Readout label="Ash" value={Math.round(state.rawAsh ?? 0)} />}
            <Readout label="Rep" value={state.reputation} />
            <Readout label="Sworn" value={state.members.length} />
            <Readout label="Insp" value={state.inspiration ?? 0} />
            <Readout label="Banners" value={`${score.fullParties}/${slots}`} />
          </div>
          {signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 px-2 text-xs"
                  aria-label="Account"
                  title={email ?? "Account"}
                >
                  <UserRound className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden max-w-[9rem] truncate sm:inline">{email ?? "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{email ?? "Signed in"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => supabase.auth.signOut()}>
                  <LogOut className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 px-2 text-xs">
              <Link to="/auth">
                <LogIn className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2 md:hidden">
        <Readout label="Gold" value={state.gold} />
        <Readout label="Rep" value={state.reputation} />
        <Readout label="Sworn" value={state.members.length} />
        <Readout label="Banners" value={`${score.fullParties}/${slots}`} />
      </div>
    </header>
  );
}
