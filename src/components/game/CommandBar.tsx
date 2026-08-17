import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Coins,
  PackageOpen,
  Crown,
  ShieldHalf,
  Trophy,
  Flag,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
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
import { SoundToggle } from "@/components/game/SoundToggle";
import { Counter } from "@/components/game/Counter";
import { DEFAULT_CREST } from "@/lib/game/identity";
import { MAX_PARTY_SIZE } from "@/lib/game/data";
import {
  bannerCap,
  scoreClan,
  wornTitle,
  supplyCap,
  renownScore,
  deedsFromState,
  type GameState,
} from "@/lib/game/engine";
import { courtRank, courtStanding } from "@/lib/game/court";
import { CASTLE } from "@/lib/game/rivals";
import { timeOfDay } from "@/lib/game/living";
import { supabase } from "@/integrations/supabase/client";

/** A single vital gauge in the command bar — an icon, a label, a live value. */
function Vital({
  icon,
  label,
  value,
  sub,
  tone = "#e7d7ac",
  title,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: string;
  title?: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-sm border border-white/10 bg-black/30 px-2 py-1"
      title={title}
    >
      <span className="grid h-5 w-5 place-items-center text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <div className="leading-none">
        <div className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        <div className="font-display text-sm tabular-nums" style={{ color: tone }}>
          {value}
          {sub && <span className="ml-0.5 text-[10px] text-muted-foreground">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const tod = timeOfDay(now);
  return (
    <span
      className="hidden items-center gap-1 rounded-sm border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex"
      title={`Aethyr rests in ${tod.label}`}
    >
      <span aria-hidden="true">{tod.glyph}</span>
      <span className="capitalize">{tod.label}</span>
    </span>
  );
}

/**
 * The Command Bar — the realm's HUD. Your house on the left, the vitals that
 * drive every decision across the middle (gold, war supply, court favor,
 * standing, renown, banners), and the realm's hour, its voice, and your account
 * on the right. Replaces the old title bar as the top of the rebuilt war table.
 */
export function CommandBar({
  state,
  email,
  signedIn,
}: {
  state: GameState;
  email?: string | null;
  signedIn: boolean;
}) {
  const founded = state.clanLevel >= 1;
  const slots = bannerCap(state);
  const score = scoreClan(state);
  const supply = Math.floor(state.supply ?? 0);
  const cap = supplyCap(state);
  const favor = Math.floor(state.court?.favor ?? 0);
  const rank = courtRank(courtStanding(state));
  const renown = renownScore(deedsFromState(state));
  const title = founded ? wornTitle(state) : "";

  return (
    <header className="plaque relative z-20">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        {/* the house */}
        <ClanCrest
          crest={state.crest ?? DEFAULT_CREST}
          className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
        />
        <div className="min-w-0 max-w-[38%] shrink sm:max-w-[24%]">
          <h1 className="gilded truncate font-display text-base leading-tight sm:text-xl">
            {founded ? state.clanName : `${state.leaderName}'s Company`}
          </h1>
          <p className="truncate text-[10px] text-muted-foreground">
            {title ? <span className="text-gold/80">{title} · </span> : null}
            {founded
              ? `${rank.title}`
              : state.allegiance
                ? `${state.allegiance.rank} of ${state.allegiance.clanName}`
                : `Free company of ${MAX_PARTY_SIZE}`}
            {state.castle?.holder === "player" ? ` · holds ${CASTLE.name}` : ""}
          </p>
        </div>

        {/* the vitals — scroll horizontally on narrow screens */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1">
          <Vital
            icon={<Coins className="h-3.5 w-3.5" />}
            label="Gold"
            value={<Counter value={state.gold} />}
            tone="#e7c65a"
          />
          <Vital
            icon={<PackageOpen className="h-3.5 w-3.5" />}
            label="Supply"
            value={supply}
            sub={`/${cap}`}
            tone="#5fd0c6"
            title="War supply — spent committing banners to the front"
          />
          <Vital
            icon={<Crown className="h-3.5 w-3.5" />}
            label="Favor"
            value={favor}
            tone="#d8a24a"
            title={`Court favor to spend · ${rank.title}`}
          />
          <Vital
            icon={<ShieldHalf className="h-3.5 w-3.5" />}
            label="Renown"
            value={<Counter value={state.reputation} />}
            tone="#c9b06a"
          />
          <Vital
            icon={<Trophy className="h-3.5 w-3.5" />}
            label="Legacy"
            value={renown}
            tone="#b9a8e6"
            title="Renown from deeds — prestige, the only victory"
          />
          <Vital
            icon={<Flag className="h-3.5 w-3.5" />}
            label="Banners"
            value={`${score.fullParties}/${slots}`}
            tone="#e7d7ac"
          />
          {(state.rawAsh ?? 0) >= 1 && (
            <Vital
              icon={<span className="text-[11px]">🜂</span>}
              label="Ash"
              value={Math.round(state.rawAsh ?? 0)}
              tone="#d18a5a"
            />
          )}
        </div>

        {/* the realm's hour, its voice, your account */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Clock />
          <SoundToggle />
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
                  <span className="hidden max-w-[8rem] truncate lg:inline">
                    {email ?? "Account"}
                  </span>
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
    </header>
  );
}
