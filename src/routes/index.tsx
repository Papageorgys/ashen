import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClanHeader } from "@/components/game/ClanHeader";
import { PartyBoard } from "@/components/game/PartyBoard";
import { RecruitPanel } from "@/components/game/RecruitPanel";
import { CraftPanel } from "@/components/game/CraftPanel";
import { SystemForgePanel } from "@/components/game/SystemForgePanel";
import { SkillPanel } from "@/components/game/SkillPanel";
import { DailyPanel } from "@/components/game/DailyPanel";
import { WarehousePanel } from "@/components/game/WarehousePanel";
import { MarketPanel } from "@/components/game/MarketPanel";
import { ScriptoriumPanel } from "@/components/game/ScriptoriumPanel";
import { MusterPanel } from "@/components/game/MusterPanel";
import { ClanKeepPanel } from "@/components/game/ClanKeepPanel";
import { ExpeditionFeed } from "@/components/game/ExpeditionFeed";
import { useClanGame } from "@/hooks/useClanGame";
import { CLASSES, CLASS_BY_ID, RACES } from "@/lib/game/data";
import { DEFAULT_CREST, MOTTOS, randomPortrait, type Crest } from "@/lib/game/identity";
import { PortraitEditor } from "@/components/game/PortraitEditor";
import { PROFESSIONS, type ProfessionId } from "@/lib/game/professions";
import { CrestEditor } from "@/components/game/CrestEditor";
import { ClanCrest } from "@/components/game/ClanCrest";
import { Portrait } from "@/components/game/Portrait";
import { ChroniclePanel } from "@/components/game/ChroniclePanel";
import { LegacyPanel } from "@/components/game/LegacyPanel";
import { BestiaryPanel } from "@/components/game/BestiaryPanel";
import { RealmPanel } from "@/components/game/RealmPanel";
import { FrontierPanel } from "@/components/game/FrontierPanel";
import { CourtPanel } from "@/components/game/CourtPanel";
import { TacticsPanel } from "@/components/game/TacticsPanel";
import { WarbandPanel } from "@/components/game/WarbandPanel";
import { LogisticsPanel } from "@/components/game/LogisticsPanel";
import { WorldPanel } from "@/components/game/WorldPanel";
import { ChatDock } from "@/components/game/ChatDock";
import { BossPanel } from "@/components/game/BossPanel";
import { useWorldBoss } from "@/hooks/useWorldBoss";
import { useFrontier } from "@/hooks/useFrontier";
import { territoriesOf } from "@/lib/game/frontier";
import { useSession } from "@/hooks/useSession";
import { AmbientStage } from "@/components/game/AmbientStage";
import { SoundLayer } from "@/components/game/SoundLayer";
import { Curtain } from "@/components/game/Curtain";
import { playCue } from "@/lib/sound";
import { summonCurtain } from "@/lib/transition";
import { CommandBar } from "@/components/game/CommandBar";
import { NavRail } from "@/components/game/NavRail";
import { Flourish, type FlourishEvent } from "@/components/game/Flourish";
import type { Founding as FoundingT } from "@/lib/game/engine";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Anvil,
  BookOpen,
  Castle,
  Flag,
  Globe2,
  PawPrint,
  Skull,
  Crosshair,
  Crown,
  ShieldHalf,
  Boxes,
  Handshake,
  PenLine,
  ScrollText,
  Sparkles,
  Store,
  Trophy,
  Swords,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ashen Legacy — Clan Leader" },
      {
        name: "description",
        content:
          "Ashen Legacy: lead a dark-fantasy MMO clan across Aethyr — recruit sworn blades, raise your clan level, forge gear from raid drops and field as many full warbands of five as you can.",
      },
      { property: "og:title", content: "Ashen Legacy — Clan Leader" },
      {
        property: "og:description",
        content:
          "Recruit, level, loot and forge. Build the mightiest clan in Aethyr, one warband of five at a time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Founding({ onStart }: { onStart: (f: FoundingT) => void }) {
  const [clanName, setClanName] = useState("Ashen Covenant");
  const [motto, setMotto] = useState(MOTTOS[0]!);
  const [lordName, setLordName] = useState("Aldric Duskmoor");
  const [classId, setClassId] = useState("bulwark");
  const [profession, setProfession] = useState<ProfessionId>("soldier");
  const [portrait, setPortrait] = useState(() => randomPortrait());
  const [crest, setCrest] = useState<Crest>(DEFAULT_CREST);
  const [step, setStep] = useState(0);

  const cls = CLASS_BY_ID[classId]!;
  const race = RACES.find((r) => r.id === cls.race)!;
  const steps = ["Your name", "Your past & face", "Your arms"];

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-5 px-5 py-12">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          The war for Aethyr
        </p>
        <h1 className="gilded font-display text-6xl sm:text-7xl">Ashen Legacy</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          You are not a spectator. You take the field yourself — your blade, your face, your arms on
          the banner. Champions who fall in the deep places do not come back.
        </p>
      </div>

      <div className="flex gap-1.5">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`flex-1 rounded-sm border px-3 py-1.5 text-xs uppercase tracking-widest transition ${
              step === i
                ? "border-gold/70 bg-gold/10 text-gold"
                : "border-border/60 text-muted-foreground hover:border-gold/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel-ornate space-y-4 rounded-sm p-5">
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Clan name</span>
                <Input
                  value={clanName}
                  maxLength={28}
                  onChange={(e) => setClanName(e.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Your name</span>
                <Input
                  value={lordName}
                  maxLength={28}
                  onChange={(e) => setLordName(e.target.value)}
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Your calling
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {CLASSES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClassId(c.id)}
                    className={`rounded-sm border px-2.5 py-1.5 text-left transition ${
                      classId === c.id
                        ? "border-gold/70 bg-gold/10"
                        : "border-border/60 hover:border-gold/40"
                    }`}
                  >
                    <div className="font-display text-sm text-gold">{c.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {RACES.find((r) => r.id === c.race)?.name} · {c.role}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground">{race.name}.</span> {race.blurb} Trained in{" "}
                {cls.armor} armour — {cls.passive.name}: {cls.passive.desc}
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                The life you led before
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {PROFESSIONS.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setProfession(pr.id)}
                    className={`rounded-sm border px-2.5 py-1.5 text-left transition ${
                      profession === pr.id
                        ? "border-gold/70 bg-gold/10"
                        : "border-border/60 hover:border-gold/40"
                    }`}
                  >
                    <div className="font-display text-sm text-gold">{pr.name}</div>
                    <div className="text-[10px] text-muted-foreground">{pr.perkName}</div>
                  </button>
                ))}
              </div>
              {(() => {
                const pr = PROFESSIONS.find((x) => x.id === profession)!;
                return (
                  <p className="text-xs text-muted-foreground">
                    {pr.blurb} <span className="text-foreground">{pr.perkName}:</span> {pr.perkText}{" "}
                    <span className="text-foreground">Deed:</span> {pr.deedText}
                  </p>
                );
              })()}
            </div>
            <PortraitEditor portrait={portrait} classId={classId} onChange={setPortrait} />
          </div>
        )}
        {step === 2 && (
          <CrestEditor crest={crest} motto={motto} onChange={setCrest} onMotto={setMotto} />
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ClanCrest crest={crest} className="h-8 w-8" />
            <Portrait data={portrait} classId={classId} className="h-8 w-8" />
            <span>
              {lordName.trim() || "Nameless"} of {clanName.trim() || "the unnamed clan"}
            </span>
          </div>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)}>Continue</Button>
          ) : (
            <Button
              onClick={() =>
                onStart({
                  clanName: clanName.trim() || "Ashen Covenant",
                  motto: motto.trim() || MOTTOS[0]!,
                  lordName: lordName.trim() || "Aldric Duskmoor",
                  classId,
                  profession,
                  portrait,
                  crest,
                })
              }
            >
              Swear the first oath
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type NavItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  hint: string;
  requiresClan?: boolean;
};

/** The map is the hub — its own prominent home button above the grouped menu. */
const HOME_ITEM: NavItem = {
  value: "banners",
  label: "War Table",
  icon: Swords,
  hint: "The map — deploy your banners, reach the forge and vault",
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Company",
    items: [
      { value: "recruit", label: "Recruit", icon: UserPlus, hint: "Swear new blades" },
      {
        value: "muster",
        label: "Muster",
        icon: Handshake,
        hint: "Petitions and invitations from party leaders",
      },
      { value: "skills", label: "Skills", icon: Sparkles, hint: "Train abilities" },
      {
        value: "warband",
        label: "Warband",
        icon: ShieldHalf,
        hint: "Choose each champion's trait — their fighting build",
      },
      {
        value: "tactics",
        label: "The Proving",
        icon: Swords,
        hint: "Command a banner in a turn-based bout",
      },
      { value: "daily", label: "Contracts", icon: ScrollText, hint: "Daily, weekly and monthly" },
      { value: "scriptorium", label: "Scrolls", icon: PenLine, hint: "Imprint spells into vellum" },
    ],
  },
  {
    title: "Holdings",
    items: [
      {
        value: "keep",
        label: "Keep",
        icon: Castle,
        hint: "Upgrade your halls",
        requiresClan: true,
      },
      { value: "market", label: "Market", icon: Store, hint: "Refine shots and trade" },
      {
        value: "domain",
        label: "The Domain",
        icon: Boxes,
        hint: "War logistics — nodes, caravans, workshops and supply",
        requiresClan: true,
      },
      {
        value: "sysforge",
        label: "Town Smithy",
        icon: Anvil,
        hint: "Public smithy — standard results, no artisans needed",
      },
    ],
  },
  {
    title: "Realm",
    items: [
      {
        value: "frontier",
        label: "The War",
        icon: Crosshair,
        hint: "The living frontier — factions warring across Aethyr",
      },
      {
        value: "court",
        label: "The Court",
        icon: Crown,
        hint: "Rise through the King's court — from outpost to the Ashen Throne",
      },
      {
        value: "bestiary",
        label: "Bestiary",
        icon: PawPrint,
        hint: "Every creature your banners have faced",
      },
      {
        value: "realm",
        label: "Realm",
        icon: Flag,
        hint: "Rivals and the castle",
        requiresClan: true,
      },
      {
        value: "boss",
        label: "Warfront",
        icon: Skull,
        hint: "The realm's daily World Boss",
        requiresClan: true,
      },
      { value: "world", label: "Ladder", icon: Globe2, hint: "Live rankings of every clan" },
      {
        value: "chronicle",
        label: "Chronicle",
        icon: BookOpen,
        hint: "Your saga and the fallen",
        requiresClan: true,
      },
      {
        value: "legacy",
        label: "Legacy",
        icon: Trophy,
        hint: "Deeds, renown, and the Monument — the only victory",
        requiresClan: true,
      },
    ],
  },
];

const ALL_ITEMS = [HOME_ITEM, ...NAV_GROUPS.flatMap((g) => g.items)];

/** Every screen, keyed by its value — the slide-over reads its title/blurb here. */
const NAV_BY_VALUE: Record<string, NavItem> = Object.fromEntries(
  ALL_ITEMS.map((i) => [i.value, i]),
);

function Index() {
  const { state, hydrated, api } = useClanGame();
  const { user, ready: authReady } = useSession();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  // the single open screen (slide-over); the map is always the base view
  const [tool, setTool] = useState<string | null>(null);
  const [flourish, setFlourish] = useState<FlourishEvent | null>(null);
  const boss = useWorldBoss(user?.id ?? null);
  // the one shared, server-ticked war; falls back to the local sim if unreachable
  const {
    frontier: worldFrontier,
    contest: contestFrontier,
    build: buildFrontier,
  } = useFrontier(!!user);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // the ashen curtain draws once as you enter the war table (after founding, or
  // on returning to the realm) and lifts to reveal it
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current || !state) return;
    booted.current = true;
    summonCurtain({
      label: state.clanLevel >= 1 ? state.clanName : `${state.leaderName}'s Company`,
      sigil: "⚔",
      holdMs: 700,
    });
  }, [state]);

  // the realm's voice: a whoosh as a screen opens over the map, a softer one as
  // it closes (the per-button click is handled globally by the SoundLayer)
  const prevTool = useRef<string | null>(null);
  useEffect(() => {
    const had = prevTool.current;
    prevTool.current = tool;
    if (tool && tool !== had) playCue("open");
    else if (!tool && had) playCue("close");
  }, [tool]);

  // feed the shared war back into the L2 economy: what the clan holds becomes the
  // war-spoils multiplier on every run's gold / xp / essence — scaled by how
  // developed each realm is, so a long-held, built-up realm pays far richer
  useEffect(() => {
    if (!worldFrontier || !state) return;
    // cache the authoritative server war so the offline view is its real
    // last-known state, not a divergent local sim (guarded so we only write
    // when it's genuinely newer — update() always clones, and an unconditional
    // call would loop the effect)
    if (!state.frontier || state.frontier.updatedAt < worldFrontier.updatedAt) {
      api.cacheFrontier(worldFrontier);
    }
    const held = territoriesOf(worldFrontier, "clan").map((id) => ({
      id,
      dev: Math.round(worldFrontier.control[id]?.dev ?? 20),
      pop: Math.round(worldFrontier.control[id]?.pop ?? 12),
    }));
    const cur = state.warSpoils?.held ?? [];
    const same =
      cur.length === held.length &&
      cur.every((h, i) => h.id === held[i]!.id && h.dev === held[i]!.dev && h.pop === held[i]!.pop);
    if (!same) api.setWarSpoils(held);
  }, [worldFrontier, state, api]);

  const clanLevel = state?.clanLevel ?? 0;
  const holdsCastle = state?.castle?.holder === "player";
  const prev = useRef<{ clanLevel: number; holdsCastle: boolean } | null>(null);

  useEffect(() => {
    if (!state) return;
    const before = prev.current;
    prev.current = { clanLevel, holdsCastle };
    if (!before) return;
    if (clanLevel > before.clanLevel) {
      playCue("levelup");
      setFlourish({
        id: Date.now(),
        title: clanLevel === 1 ? "A Clan is Born" : `Clan Level ${clanLevel}`,
        subtitle: clanLevel === 1 ? "Your crest flies over Aethyr" : "The banners rise higher",
      });
    } else if (holdsCastle && !before.holdsCastle) {
      playCue("levelup");
      setFlourish({ id: Date.now(), title: "Vareth Falls", subtitle: "The castle is yours" });
    }
  }, [state, clanLevel, holdsCastle]);

  // Gate the realm behind sign-in: once auth resolves, send strangers to the door.
  useEffect(() => {
    if (authReady && !user) void navigate({ to: "/auth" });
  }, [authReady, user, navigate]);

  // The realm is closed to strangers: only signed-in players may enter.
  if (!hydrated || !authReady) return <div className="min-h-dvh" />;
  if (!user) return <div className="min-h-dvh" />; // redirecting to /auth
  if (!state) {
    return (
      <>
        <SoundLayer />
        <AmbientStage />
        <div className="relative z-10">
          <Founding onStart={api.start} />
        </div>
        <Toaster />
      </>
    );
  }

  const founded = state.clanLevel >= 1;
  const meta = tool ? NAV_BY_VALUE[tool] : null;

  // every screen except the always-visible map renders inside the slide-over
  const toolBody =
    tool === "forge" ? (
      <CraftPanel state={state} api={api} />
    ) : tool === "warehouse" ? (
      <WarehousePanel state={state} api={api} />
    ) : tool === "keep" ? (
      <ClanKeepPanel state={state} api={api} />
    ) : tool === "muster" ? (
      <MusterPanel state={state} api={api} />
    ) : tool === "recruit" ? (
      <RecruitPanel state={state} api={api} />
    ) : tool === "skills" ? (
      <SkillPanel state={state} api={api} />
    ) : tool === "daily" ? (
      <DailyPanel state={state} api={api} />
    ) : tool === "realm" ? (
      <RealmPanel state={state} api={api} />
    ) : tool === "frontier" ? (
      <FrontierPanel state={state} frontier={worldFrontier} />
    ) : tool === "court" ? (
      <CourtPanel state={state} api={api} />
    ) : tool === "tactics" ? (
      <TacticsPanel state={state} api={api} />
    ) : tool === "warband" ? (
      <WarbandPanel state={state} api={api} />
    ) : tool === "domain" ? (
      <LogisticsPanel state={state} api={api} now={now} />
    ) : tool === "boss" ? (
      <BossPanel boss={boss} state={state} api={api} now={now} myId={user?.id ?? null} />
    ) : tool === "world" ? (
      <WorldPanel signedIn={!!user} myId={user?.id ?? null} />
    ) : tool === "chronicle" ? (
      <ChroniclePanel state={state} api={api} />
    ) : tool === "legacy" ? (
      <LegacyPanel state={state} api={api} />
    ) : tool === "bestiary" ? (
      <BestiaryPanel state={state} />
    ) : tool === "scriptorium" ? (
      <ScriptoriumPanel state={state} api={api} />
    ) : tool === "market" ? (
      <MarketPanel state={state} api={api} />
    ) : tool === "sysforge" ? (
      <SystemForgePanel state={state} api={api} />
    ) : null;

  return (
    <TooltipProvider delayDuration={200}>
      <SoundLayer />
      <Curtain />
      <AmbientStage />
      <Flourish event={flourish} />
      <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
        <CommandBar state={state} email={user?.email ?? null} signedIn={!!user} />

        {/* the war table: a standing nav rail, the map (always the base view)
            with the roster beneath it, and the live field report alongside */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <NavRail groups={NAV_GROUPS} active={tool} founded={founded} onSelect={setTool} />

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="stage-scroll min-h-0 min-w-0 space-y-4 px-3 py-4 sm:px-5">
              <ClanHeader state={state} api={api} />
              <PartyBoard
                state={state}
                api={api}
                now={now}
                onOpenTool={setTool}
                frontier={worldFrontier}
                onContest={contestFrontier}
                onBuild={buildFrontier}
              />
              <div className="lg:hidden">
                <ExpeditionFeed state={state} now={now} />
              </div>
            </div>

            <aside className="stage-scroll hidden min-h-0 border-l border-border/60 px-3 py-4 lg:block">
              <ExpeditionFeed state={state} now={now} />
            </aside>
          </div>
        </div>
        <ChatDock
          signedIn={!!user}
          myId={user?.id ?? null}
          clanName={state.clanName}
          leaderName={state.leaderName}
          crest={state.crest ?? null}
          leadZoneId={
            state.parties
              .map((p) => p.run?.zoneId ?? p.travel?.zoneId ?? p.farming ?? null)
              .find(Boolean) ?? null
          }
        />
      </div>

      {/* every screen opens here, as a slide-over across the always-visible map */}
      <Sheet open={!!tool} onOpenChange={(o) => !o && setTool(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-5xl"
        >
          <SheetHeader className="shrink-0 border-b border-border/60 px-4 py-3 pr-12 text-left sm:text-left">
            <SheetTitle className="font-display text-lg text-gold">{meta?.label ?? ""}</SheetTitle>
            <SheetDescription className="text-xs">{meta?.hint ?? ""}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{toolBody}</div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </TooltipProvider>
  );
}
