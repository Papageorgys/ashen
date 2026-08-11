import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { WorldMap } from "@/components/game/WorldMap";
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
import { BestiaryPanel } from "@/components/game/BestiaryPanel";
import { RealmPanel } from "@/components/game/RealmPanel";
import { WorldPanel } from "@/components/game/WorldPanel";
import { ChatDock } from "@/components/game/ChatDock";
import { BossStrip } from "@/components/game/BossStrip";
import { BossPanel } from "@/components/game/BossPanel";
import { useWorldBoss } from "@/hooks/useWorldBoss";
import { useSession } from "@/hooks/useSession";
import { AmbientStage } from "@/components/game/AmbientStage";
import { TitleBar } from "@/components/game/TitleBar";
import { Flourish, type FlourishEvent } from "@/components/game/Flourish";
import type { Founding as FoundingT } from "@/lib/game/engine";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Anvil,
  BookOpen,
  Castle,
  Flag,
  Globe2,
  Hammer,
  Map,
  PawPrint,
  Package,
  Skull,
  PanelLeftClose,
  PanelLeftOpen,
  Handshake,
  PenLine,
  ScrollText,
  Sparkles,
  Store,
  Swords,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clan Leader — Banners of the Ashen Realm" },
      {
        name: "description",
        content:
          "Lead a fantasy MMO clan: recruit sworn blades, raise your clan level, forge gear from raid drops and field as many full banners of nine as you can.",
      },
      { property: "og:title", content: "Clan Leader — Banners of the Ashen Realm" },
      {
        property: "og:description",
        content:
          "Recruit, level, loot and forge. Build the mightiest clan in the Ashen Realm, one banner of nine at a time.",
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
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Banners of the</p>
        <h1 className="gilded font-display text-6xl sm:text-7xl">Ashen Realm</h1>
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

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Command",
    items: [
      { value: "banners", label: "War Table", icon: Swords, hint: "Deploy your banners" },
      { value: "map", label: "Map", icon: Map, hint: "The realm and where your banners stand" },
      {
        value: "bestiary",
        label: "Bestiary",
        icon: PawPrint,
        hint: "Every creature your banners have faced",
      },
      {
        value: "keep",
        label: "Keep",
        icon: Castle,
        hint: "Upgrade your halls",
        requiresClan: true,
      },
    ],
  },
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
      { value: "daily", label: "Contracts", icon: ScrollText, hint: "Daily, weekly and monthly" },
      { value: "scriptorium", label: "Scrolls", icon: PenLine, hint: "Imprint spells into vellum" },
    ],
  },
  {
    title: "Holdings",
    items: [
      { value: "warehouse", label: "Warehouse", icon: Package, hint: "Every drop your clan holds" },
      { value: "market", label: "Market", icon: Store, hint: "Refine shots and trade" },
      {
        value: "forge",
        label: "Artisan",
        icon: Hammer,
        hint: "Craft gear from spoils — quality varies",
      },
      {
        value: "sysforge",
        label: "Sys Forge",
        icon: Anvil,
        hint: "Public smithy — standard results, no artisans needed",
      },
    ],
  },
  {
    title: "Realm",
    items: [
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
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function NavButton({
  item,
  active,
  expanded,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
}) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TabsTrigger
          value={item.value}
          aria-label={item.label}
          className={`group flex w-full shrink-0 items-center rounded-sm border border-transparent text-[9px] uppercase tracking-widest text-muted-foreground transition-all hover:text-gold/80 data-[state=active]:border-gold/60 data-[state=active]:bg-gold/10 data-[state=active]:text-gold ${
            expanded
              ? "lg:flex-row lg:justify-start lg:gap-2 lg:px-2.5 lg:py-1.5 lg:text-[10px] flex-col gap-1 px-2 py-1.5"
              : "flex-col gap-1 px-2 py-1.5"
          } ${active ? "rail-active" : ""}`}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
          <span className={expanded ? "max-w-full truncate" : "max-w-full truncate lg:sr-only"}>
            {item.label}
          </span>
        </TabsTrigger>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="font-display text-sm text-gold">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.hint}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function Index() {
  const { state, hydrated, api } = useClanGame();
  const { user, ready: authReady } = useSession();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState("banners");
  const [flourish, setFlourish] = useState<FlourishEvent | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const boss = useWorldBoss(user?.id ?? null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRailOpen(window.localStorage.getItem("rail-open") === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("rail-open", railOpen ? "1" : "0");
  }, [railOpen]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const clanLevel = state?.clanLevel ?? 0;
  const holdsCastle = state?.castle?.holder === "player";
  const prev = useRef<{ clanLevel: number; holdsCastle: boolean } | null>(null);

  useEffect(() => {
    if (!state) return;
    const before = prev.current;
    prev.current = { clanLevel, holdsCastle };
    if (!before) return;
    if (clanLevel > before.clanLevel) {
      setFlourish({
        id: Date.now(),
        title: clanLevel === 1 ? "A Clan is Born" : `Clan Level ${clanLevel}`,
        subtitle:
          clanLevel === 1 ? "Your crest flies over the Ashen Realm" : "The banners rise higher",
      });
    } else if (holdsCastle && !before.holdsCastle) {
      setFlourish({ id: Date.now(), title: "Ravenhold Falls", subtitle: "The castle is yours" });
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
        <AmbientStage />
        <div className="relative z-10">
          <Founding onStart={api.start} />
        </div>
        <Toaster />
      </>
    );
  }

  const founded = state.clanLevel >= 1;
  const visible = ALL_ITEMS.filter((i) => founded || !i.requiresClan);
  const activeTab = visible.some((i) => i.value === tab) ? tab : "banners";

  return (
    <TooltipProvider delayDuration={200}>
      <AmbientStage />
      <Flourish event={flourish} />
      <div className="relative z-10 flex h-dvh flex-col overflow-hidden">
        <TitleBar state={state} email={user?.email ?? null} signedIn={!!user} />
        <Tabs
          value={activeTab}
          onValueChange={setTab}
          orientation="vertical"
          className={`grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-0 lg:grid-rows-1 ${
            railOpen
              ? "lg:grid-cols-[11rem_minmax(0,1fr)_20rem]"
              : "lg:grid-cols-[3.75rem_minmax(0,1fr)_20rem]"
          }`}
        >
          <TabsList className="order-2 flex h-auto w-full items-stretch gap-1 overflow-x-auto rounded-none border-t border-border/60 bg-background/80 p-1 backdrop-blur lg:order-1 lg:w-auto lg:flex-col lg:items-stretch lg:gap-0.5 lg:overflow-y-auto lg:border-r lg:border-t-0 lg:bg-transparent lg:py-1">
            <button
              type="button"
              onClick={() => setRailOpen((v) => !v)}
              aria-label={railOpen ? "Collapse menu" : "Expand menu"}
              className="hidden shrink-0 items-center gap-2 rounded-sm border border-transparent px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold/80 lg:flex"
            >
              {railOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
              {railOpen && <span>Collapse</span>}
            </button>
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter((i) => founded || !i.requiresClan);
              if (!items.length) return null;
              return (
                <div
                  key={group.title}
                  className="flex shrink-0 gap-1 lg:w-full lg:flex-col lg:gap-0.5"
                >
                  <div
                    className={`hidden px-1 pt-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70 ${
                      railOpen ? "lg:block" : "lg:hidden"
                    }`}
                  >
                    {group.title}
                  </div>
                  {!railOpen && (
                    <div className="hidden h-px w-full bg-border/50 lg:block" aria-hidden />
                  )}
                  {items.map((item) => (
                    <NavButton
                      key={item.value}
                      item={item}
                      active={activeTab === item.value}
                      expanded={railOpen}
                    />
                  ))}
                </div>
              );
            })}
          </TabsList>

          <div className="stage-scroll order-1 min-h-0 min-w-0 space-y-5 px-3 py-4 sm:px-5 lg:order-2">
            {founded && (
              <div className="sticky top-0 z-20 -mx-3 -mt-4 bg-background sm:-mx-5">
                <BossStrip boss={boss} onOpen={() => setTab("boss")} />
              </div>
            )}
            <ClanHeader state={state} api={api} />
            <div className="stage-enter" key={activeTab}>
              <TabsContent value="banners" className="mt-0">
                <PartyBoard state={state} api={api} now={now} onOpenKeep={() => setTab("keep")} />
              </TabsContent>
              <TabsContent value="keep" className="mt-0">
                <ClanKeepPanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="muster" className="mt-0">
                <MusterPanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="recruit" className="mt-0">
                <RecruitPanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="skills" className="mt-0">
                <SkillPanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="daily" className="mt-0">
                <DailyPanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="map" className="mt-0">
                <section className="space-y-3">
                  <header>
                    <h2 className="font-display text-lg text-gold">World Map</h2>
                    <p className="text-xs text-muted-foreground">
                      Towns, castles, open experience fields and dungeons — with every banner marked
                      where it stands right now.
                    </p>
                  </header>
                  <WorldMap state={state} />
                </section>
              </TabsContent>
              <TabsContent value="realm" className="mt-0">
                <RealmPanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="boss" className="mt-0">
                <BossPanel boss={boss} state={state} api={api} now={now} myId={user?.id ?? null} />
              </TabsContent>
              <TabsContent value="world" className="mt-0">
                <WorldPanel signedIn={!!user} myId={user?.id ?? null} />
              </TabsContent>
              <TabsContent value="chronicle" className="mt-0">
                <ChroniclePanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="bestiary" className="mt-0">
                <BestiaryPanel state={state} />
              </TabsContent>

              <TabsContent value="warehouse" className="mt-0">
                <WarehousePanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="scriptorium" className="mt-0">
                <ScriptoriumPanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="market" className="mt-0">
                <MarketPanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="sysforge" className="mt-0">
                <SystemForgePanel state={state} api={api} />
              </TabsContent>
              <TabsContent value="forge" className="mt-0">
                <CraftPanel state={state} api={api} />
              </TabsContent>
            </div>
            <div className="lg:hidden">
              <ExpeditionFeed state={state} now={now} />
            </div>
          </div>

          <aside className="stage-scroll order-3 hidden min-h-0 border-l border-border/60 px-3 py-4 lg:block">
            <ExpeditionFeed state={state} now={now} />
          </aside>
        </Tabs>
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
      <Toaster />
    </TooltipProvider>
  );
}
