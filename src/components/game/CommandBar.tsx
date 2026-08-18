import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { GameIcon, type IconName } from "@/components/game/GameIcon";
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

/** A single vital gauge in the command bar — a crafted icon in a tone-tinted
 * chip, a label, and a live value; framed like a fitting on the war table. */
function Vital({
  icon,
  label,
  value,
  sub,
  tone = "#e7d7ac",
  title,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: string;
  title?: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-sm border border-forge-frame/35 bg-gradient-to-b from-black/45 to-black/20 px-1.5 py-1 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
      title={title}
    >
      <span
        className="grid h-6 w-6 place-items-center rounded-[3px] border"
        style={{ borderColor: `${tone}44`, background: `${tone}14`, color: tone }}
        aria-hidden="true"
      >
        <GameIcon name={icon} size={14} />
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
          <Vital icon="coin" label="Gold" value={<Counter value={state.gold} />} tone="#e7c65a" />
          <Vital
            icon="supply"
            label="Supply"
            value={supply}
            sub={`/${cap}`}
            tone="#5fd0c6"
            title="War supply — spent committing banners to the front"
          />
          <Vital
            icon="crown"
            label="Favor"
            value={favor}
            tone="#d8a24a"
            title={`Court favor to spend · ${rank.title}`}
          />
          <Vital
            icon="shield"
            label="Renown"
            value={<Counter value={state.reputation} />}
            tone="#c9b06a"
          />
          <Vital
            icon="spark"
            label="Legacy"
            value={renown}
            tone="#b9a8e6"
            title="Renown from deeds — prestige, the only victory"
          />
          <Vital
            icon="banner"
            label="Banners"
            value={`${score.fullParties}/${slots}`}
            tone="#e7d7ac"
          />
          {(state.rawAsh ?? 0) >= 1 && (
            <Vital icon="flame" label="Ash" value={Math.round(state.rawAsh ?? 0)} tone="#d18a5a" />
          )}
        </div>

        {/* the realm's hour, its voice, your account */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            to="/realm"
            title="Enter the grand-strategy Realm"
            className="btn-rune hover:btn-rune-hover inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-gold/45 bg-gold/[0.09] px-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-gold hover:border-gold/70 hover:bg-gold/[0.16]"
          >
            <GameIcon name="crown" size={14} />
            <span className="hidden sm:inline">Enter the Realm</span>
          </Link>
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
